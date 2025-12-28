import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Modal, Button } from 'react-bootstrap';
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
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

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

  const handleReverter = async () => {
    if (!window.confirm('Reverter lista para PENDENTE? A lista voltará para análise.')) return;

    try {
      setSubmitting(true);
      await api.post(`/admin/listas-rapidas/${id}/reverter`);
      setModalMessage('✅ Lista revertida para PENDENTE!');
      setShowModal(true);
      setTimeout(() => {
        setShowModal(false);
        carregarDados();
      }, 2000);
    } catch (error: any) {
      console.error('[DetalhesListaRapida] Erro ao reverter:', error);
      alert(error.response?.data?.error || 'Erro ao reverter lista.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatarMensagem = () => {
    if (!lista) return '';

    let mensagem = `*LISTA RAPIDA - ${lista.nome}*\n\n`;
    mensagem += `Solicitante: ${lista.usuario_nome}\n`;
    mensagem += `Data: ${lista.submetido_em ? new Date(lista.submetido_em).toLocaleString('pt-BR') : '-'}\n`;
    mensagem += `Status: ${lista.status.toUpperCase()}\n\n`;
    mensagem += `Itens Solicitados (${itens.length}):\n\n`;

    itens.forEach((item) => {
      let marcador = '';
      if (item.prioridade === 'urgente') {
        marcador = '[URGENTE]';
      } else if (item.prioridade === 'precisa_comprar') {
        marcador = '[COMPRAR]';
      } else {
        marcador = '[PREVENCAO]';
      }
      mensagem += `${marcador} ${item.item_nome} (${item.item_unidade})\n`;
      if (item.observacao) {
        mensagem += `  Obs: ${item.observacao}\n`;
      }
    });

    mensagem += `\n---\n`;
    mensagem += `Sistema Kaizen - Lista Rapida`;

    return mensagem;
  };

  const handleCopiar = async () => {
    try {
      const mensagem = formatarMensagem();
      await navigator.clipboard.writeText(mensagem);
      setModalMessage('✅ Texto copiado para a área de transferência!');
      setShowModal(true);
      setTimeout(() => setShowModal(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
      setModalMessage('❌ Erro ao copiar texto. Tente novamente.');
      setShowModal(true);
      setTimeout(() => setShowModal(false), 2000);
    }
  };

  const handleWhatsApp = () => {
    const mensagem = formatarMensagem();
    const mensagemCodificada = encodeURIComponent(mensagem);
    const urlWhatsApp = `https://wa.me/?text=${mensagemCodificada}`;
    window.open(urlWhatsApp, '_blank');
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

      {/* Botões de ação de compartilhamento */}
      <div className={styles.acaoSection}>
        <h2>Ações</h2>
        <div className={styles.acoesBotoes}>
          <button
            onClick={handleCopiar}
            className={`${styles.btn} ${styles.btnSecondary}`}
            title="Copiar lista de itens"
          >
            <i className="fas fa-copy"></i> Copiar
          </button>
          <button
            onClick={handleWhatsApp}
            className={`${styles.btn} ${styles.btnWhatsapp}`}
            title="Enviar lista via WhatsApp"
          >
            <i className="fab fa-whatsapp"></i> Enviar via WhatsApp
          </button>
          {(lista.status === 'aprovada' || lista.status === 'rejeitada') && (
            <button
              onClick={handleReverter}
              disabled={submitting}
              className={`${styles.btn} ${styles.btnWarning}`}
            >
              <i className="fas fa-undo"></i> Reverter para Pendente
            </button>
          )}
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

      {/* Modal de feedback */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Body className="text-center py-4">
          <p className="mb-0">{modalMessage}</p>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default DetalhesListaRapida;
