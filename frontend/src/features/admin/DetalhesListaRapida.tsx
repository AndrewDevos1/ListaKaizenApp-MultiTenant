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

interface ItemGlobal {
  id: number;
  nome: string;
  unidade: string;
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

  // Estados para edição
  const [modoEdicao, setModoEdicao] = useState(false);
  const [itensEditados, setItensEditados] = useState<ItemListaRapida[]>([]);
  const [itensGlobais, setItensGlobais] = useState<ItemGlobal[]>([]);
  const [buscaItem, setBuscaItem] = useState('');
  const [mostrarModalBusca, setMostrarModalBusca] = useState(false);

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

  // Funções de edição
  const handleIniciarEdicao = async () => {
    setModoEdicao(true);
    setItensEditados(JSON.parse(JSON.stringify(itens))); // Deep copy

    // Carregar itens globais para busca
    try {
      const response = await api.get('/admin/itens-globais');
      setItensGlobais(response.data.itens || response.data);
    } catch (error) {
      console.error('Erro ao carregar itens globais:', error);
    }
  };

  const handleCancelarEdicao = () => {
    setModoEdicao(false);
    setItensEditados([]);
    setBuscaItem('');
    setMostrarModalBusca(false);
  };

  const handleSalvarEdicao = async () => {
    if (!window.confirm('Salvar alterações?')) return;

    try {
      setSubmitting(true);

      // Atualizar itens modificados
      for (const item of itensEditados) {
        const itemOriginal = itens.find(i => i.id === item.id);
        if (!itemOriginal) continue;

        // Verificar se houve mudança
        if (item.observacao !== itemOriginal.observacao ||
            item.prioridade !== itemOriginal.prioridade) {
          await api.put(`/admin/listas-rapidas/${id}/itens/${item.id}`, {
            observacao: item.observacao,
            prioridade: item.prioridade
          });
        }
      }

      setModalMessage('✅ Alterações salvas com sucesso!');
      setShowModal(true);
      setModoEdicao(false);
      setTimeout(() => {
        setShowModal(false);
        carregarDados();
      }, 2000);
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      alert(error.response?.data?.error || 'Erro ao salvar alterações.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditarObservacao = (itemId: number, observacao: string) => {
    setItensEditados(itensEditados.map(item =>
      item.id === itemId ? { ...item, observacao } : item
    ));
  };

  const handleEditarPrioridade = (itemId: number, prioridade: 'prevencao' | 'precisa_comprar' | 'urgente') => {
    setItensEditados(itensEditados.map(item =>
      item.id === itemId ? { ...item, prioridade } : item
    ));
  };

  const handleRemoverItem = async (itemId: number) => {
    if (!window.confirm('Remover este item da lista?')) return;

    try {
      await api.delete(`/admin/listas-rapidas/${id}/itens/${itemId}`);
      setItensEditados(itensEditados.filter(item => item.id !== itemId));
      setModalMessage('Item removido!');
      setShowModal(true);
      setTimeout(() => setShowModal(false), 1500);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao remover item.');
    }
  };

  const handleAdicionarItem = async (itemGlobalId: number) => {
    try {
      const response = await api.post(`/admin/listas-rapidas/${id}/itens`, {
        item_global_id: itemGlobalId,
        prioridade: 'precisa_comprar',
        observacao: ''
      });

      setItensEditados([...itensEditados, response.data.item]);
      setMostrarModalBusca(false);
      setBuscaItem('');
      setModalMessage('✅ Item adicionado!');
      setShowModal(true);
      setTimeout(() => setShowModal(false), 1500);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao adicionar item.');
    }
  };

  const itensFiltrados = itensGlobais.filter(item =>
    item.nome.toLowerCase().includes(buscaItem.toLowerCase())
  );

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
        <h2>
          Itens Solicitados ({modoEdicao ? itensEditados.length : itens.length})
          {modoEdicao && <span className={styles.badgeModoEdicao}> Modo Edição</span>}
        </h2>

        {modoEdicao ? (
          // MODO EDIÇÃO
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Unidade</th>
                    <th>Prioridade</th>
                    <th>Observação</th>
                    <th className="text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {itensEditados.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.item_nome}</strong></td>
                      <td>{item.item_unidade}</td>
                      <td>
                        <div className={styles.prioridadesBtns}>
                          <button
                            type="button"
                            className={`${styles.btnPrioridadeSmall} ${item.prioridade === 'urgente' ? styles.urgente : ''}`}
                            onClick={() => handleEditarPrioridade(item.id, 'urgente')}
                            title="Urgente"
                          >
                            🔴
                          </button>
                          <button
                            type="button"
                            className={`${styles.btnPrioridadeSmall} ${item.prioridade === 'precisa_comprar' ? styles.comprar : ''}`}
                            onClick={() => handleEditarPrioridade(item.id, 'precisa_comprar')}
                            title="Comprar"
                          >
                            🟡
                          </button>
                          <button
                            type="button"
                            className={`${styles.btnPrioridadeSmall} ${item.prioridade === 'prevencao' ? styles.prevencao : ''}`}
                            onClick={() => handleEditarPrioridade(item.id, 'prevencao')}
                            title="Prevenção"
                          >
                            🟢
                          </button>
                        </div>
                      </td>
                      <td>
                        <input
                          type="text"
                          className={styles.inputObservacao}
                          value={item.observacao || ''}
                          onChange={(e) => handleEditarObservacao(item.id, e.target.value)}
                          placeholder="Observação..."
                        />
                      </td>
                      <td className="text-center">
                        <i
                          className="fas fa-trash text-danger"
                          onClick={() => handleRemoverItem(item.id)}
                          style={{ cursor: 'pointer', fontSize: '1.2rem' }}
                          title="Remover item"
                        ></i>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Botões de ação do modo edição */}
            <div className={styles.acoesBotoes}>
              <button
                onClick={() => setMostrarModalBusca(true)}
                className={`${styles.btn} ${styles.btnSuccess}`}
              >
                <i className="fas fa-plus"></i> Adicionar Item
              </button>
              <button
                onClick={handleSalvarEdicao}
                disabled={submitting}
                className={`${styles.btn} ${styles.btnSuccess}`}
              >
                <i className="fas fa-save"></i> Salvar Alterações
              </button>
              <button
                onClick={handleCancelarEdicao}
                disabled={submitting}
                className={`${styles.btn} ${styles.btnSecondary}`}
              >
                <i className="fas fa-times"></i> Cancelar
              </button>
            </div>
          </>
        ) : (
          // MODO VISUALIZAÇÃO
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
        )}
      </div>

      {/* Botões de ação de compartilhamento */}
      {!modoEdicao && (
        <div className={styles.acaoSection}>
          <h2>Ações</h2>
          <div className={styles.acoesBotoes}>
            {lista.status === 'pendente' && (
              <button
                onClick={handleIniciarEdicao}
                className={`${styles.btn} ${styles.btnPrimary}`}
              >
                <i className="fas fa-edit"></i> Editar Lista
              </button>
            )}
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
      )}

      {lista.status === 'pendente' && !modoEdicao && (
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

      {/* Modal de busca de itens */}
      <Modal
        show={mostrarModalBusca}
        onHide={() => {
          setMostrarModalBusca(false);
          setBuscaItem('');
        }}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-search"></i> Adicionar Item do Catálogo
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <input
              type="text"
              className="form-control form-control-lg"
              placeholder="🔍 Digite para buscar itens..."
              value={buscaItem}
              onChange={(e) => setBuscaItem(e.target.value)}
              autoFocus
            />
          </div>

          {buscaItem ? (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {itensFiltrados.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <i className="fas fa-search fa-2x mb-2"></i>
                  <p>Nenhum item encontrado para "{buscaItem}"</p>
                </div>
              ) : (
                <div className="list-group">
                  {itensFiltrados.map(item => {
                    const jaAdicionado = itensEditados.some(i => i.item_global_id === item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${jaAdicionado ? 'disabled' : ''}`}
                        onClick={() => !jaAdicionado && handleAdicionarItem(item.id)}
                        disabled={jaAdicionado}
                        style={{
                          cursor: jaAdicionado ? 'not-allowed' : 'pointer',
                          opacity: jaAdicionado ? 0.5 : 1
                        }}
                      >
                        <div>
                          <strong>{item.nome}</strong>
                          <small className="text-muted ms-2">({item.unidade})</small>
                        </div>
                        {jaAdicionado && (
                          <span className="badge bg-secondary">
                            <i className="fas fa-check"></i> Já adicionado
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-muted py-5">
              <i className="fas fa-keyboard fa-3x mb-3"></i>
              <p>Digite no campo acima para buscar itens no catálogo global</p>
              <small>Total de itens disponíveis: {itensGlobais.length}</small>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setMostrarModalBusca(false);
              setBuscaItem('');
            }}
          >
            <i className="fas fa-times"></i> Fechar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default DetalhesListaRapida;
