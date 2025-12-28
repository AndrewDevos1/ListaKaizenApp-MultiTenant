import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import styles from './DetalhesListaRapida.module.css';

interface ItemListaRapida {
  id: number;
  item_global_id: number;
  item_nome: string;
  item_unidade: string;
  prioridade: 'prevencao' | 'precisa_comprar' | 'urgente';
  observacao: string | null;
}

interface ListaRapida {
  id: number;
  nome: string;
  descricao: string | null;
  status: string;
  usuario_nome: string;
  total_itens: number;
  itens_urgentes: number;
  criado_em: string;
  submetido_em: string | null;
}

const DetalhesListaRapida: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lista, setLista] = useState<ListaRapida | null>(null);
  const [itens, setItens] = useState<ItemListaRapida[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensagemAdmin, setMensagemAdmin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    carregarDados();
  }, [id]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/listas-rapidas/${id}`);
      const dados = response.data;

      setLista(dados);
      setItens(dados.itens || []);
    } catch (error: any) {
      console.error('[DetalhesListaRapida] Erro:', error);
      alert(error.response?.data?.error || 'Erro ao carregar dados da lista rápida.');
    } finally {
      setLoading(false);
    }
  };

  const handleAprovar = async () => {
    if (!window.confirm('Deseja aprovar esta lista rápida?')) return;

    try {
      setSubmitting(true);
      await api.put(`/admin/listas-rapidas/${id}/aprovar`, {
        mensagem_admin: mensagemAdmin.trim() || undefined
      });
      alert('Lista rápida aprovada com sucesso!');
      navigate('/admin/listas-rapidas');
    } catch (error: any) {
      console.error('[DetalhesListaRapida] Erro ao aprovar:', error);
      alert(error.response?.data?.error || 'Erro ao aprovar lista rápida.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejeitar = async () => {
    if (!mensagemAdmin.trim()) {
      alert('Por favor, informe o motivo da rejeição.');
      return;
    }

    if (!window.confirm('Deseja rejeitar esta lista rápida?')) return;

    try {
      setSubmitting(true);
      await api.put(`/admin/listas-rapidas/${id}/rejeitar`, {
        mensagem_admin: mensagemAdmin.trim()
      });
      alert('Lista rápida rejeitada.');
      navigate('/admin/listas-rapidas');
    } catch (error: any) {
      console.error('[DetalhesListaRapida] Erro ao rejeitar:', error);
      alert(error.response?.data?.error || 'Erro ao rejeitar lista rápida.');
    } finally {
      setSubmitting(false);
    }
  };

  const getPrioridadeBadge = (prioridade: string) => {
    const badges = {
      urgente: { label: 'Urgente', className: styles.badgeUrgente },
      precisa_comprar: { label: 'Precisa Comprar', className: styles.badgeComprar },
      prevencao: { label: 'Prevenção', className: styles.badgePrevencao }
    };
    return badges[prioridade as keyof typeof badges] || badges.precisa_comprar;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Carregando...</div>
      </div>
    );
  }

  if (!lista) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Lista não encontrada.</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => navigate('/admin/listas-rapidas')} className={styles.btnVoltar}>
          <i className="fas fa-arrow-left"></i> Voltar
        </button>
        <h1>Detalhes da Lista Rápida</h1>
      </div>

      <div className={styles.infoCard}>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <label>Nome da Lista:</label>
            <strong>{lista.nome}</strong>
          </div>
          <div className={styles.infoItem}>
            <label>Solicitante:</label>
            <strong>{lista.usuario_nome}</strong>
          </div>
          <div className={styles.infoItem}>
            <label>Total de Itens:</label>
            <strong>{lista.total_itens}</strong>
          </div>
          <div className={styles.infoItem}>
            <label>Itens Urgentes:</label>
            <strong className={styles.urgentes}>{lista.itens_urgentes}</strong>
          </div>
          <div className={styles.infoItem}>
            <label>Data de Submissão:</label>
            <strong>{lista.submetido_em ? new Date(lista.submetido_em).toLocaleString('pt-BR') : '-'}</strong>
          </div>
        </div>
        {lista.descricao && (
          <div className={styles.descricao}>
            <label>Descrição:</label>
            <p>{lista.descricao}</p>
          </div>
        )}
      </div>

      <div className={styles.itensSection}>
        <h2>Itens Solicitados</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Item</th>
                <th>Unidade</th>
                <th>Prioridade</th>
                <th>Observação</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => {
                const badge = getPrioridadeBadge(item.prioridade);
                return (
                  <tr key={item.id}>
                    <td><strong>{item.item_nome}</strong></td>
                    <td>{item.item_unidade}</td>
                    <td>
                      <span className={badge.className}>{badge.label}</span>
                    </td>
                    <td>{item.observacao || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {lista.status === 'pendente' && (
        <div className={styles.acaoSection}>
          <h2>Resposta do Administrador</h2>
          <textarea
            className={styles.textarea}
            placeholder="Mensagem opcional ao colaborador..."
            value={mensagemAdmin}
            onChange={(e) => setMensagemAdmin(e.target.value)}
            rows={4}
          />
          <div className={styles.acoesBotoes}>
            <button
              onClick={handleAprovar}
              disabled={submitting}
              className={`${styles.btn} ${styles.btnAprovar}`}
            >
              <i className="fas fa-check"></i> Aprovar Lista
            </button>
            <button
              onClick={handleRejeitar}
              disabled={submitting}
              className={`${styles.btn} ${styles.btnRejeitar}`}
            >
              <i className="fas fa-times"></i> Rejeitar Lista
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetalhesListaRapida;
