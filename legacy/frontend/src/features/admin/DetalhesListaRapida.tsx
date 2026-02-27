import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Modal, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { formatarDataBrasilia } from '../../utils/dateFormatter';
import {
  faArrowLeft,
  faEdit,
  faCopy,
  faUndo,
  faTrash,
  faSave,
  faTimes,
  faPlus,
  faCheckCircle,
  faTimesCircle,
  faSearch,
  faKeyboard,
  faCheck
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import api from '../../services/api';
import styles from './DetalhesListaRapida.module.css';

interface ItemListaRapida {
  id?: number;
  item_global_id?: number;  // Optional para itens temporários
  item_nome: string;
  item_unidade: string;
  prioridade: 'prevencao' | 'precisa_comprar' | 'urgente';
  observacao: string | null;
  descartado?: boolean;  // Item marcado como suficiente/descartado
  is_temporario?: boolean;  // Flag para identificar itens temporários
  cadastrar_no_sistema?: boolean;  // Flag para identificar sugestões
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
  arquivada?: boolean;
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
  const [desarquivando, setDesarquivando] = useState(false);

  // Estados para descarte de itens
  const [itensSelecionados, setItensSelecionados] = useState<Set<number>>(new Set());

  // Estados para edição
  const [modoEdicao, setModoEdicao] = useState(false);
  const [itensEditados, setItensEditados] = useState<ItemListaRapida[]>([]);
  const [itensGlobais, setItensGlobais] = useState<ItemGlobal[]>([]);
  const [buscaItem, setBuscaItem] = useState('');
  const [mostrarModalBusca, setMostrarModalBusca] = useState(false);

  // Estados para conversão em checklist
  const [mostrarModalChecklist, setMostrarModalChecklist] = useState(false);
  const [nomeChecklist, setNomeChecklist] = useState('');
  const [quantidadesChecklist, setQuantidadesChecklist] = useState<{[key: number]: number | null}>({});
  const [incluirFornecedor, setIncluirFornecedor] = useState(false);
  const [incluirObservacoes, setIncluirObservacoes] = useState(false);
  const [convertendo, setConvertendo] = useState(false);

  // Estados para sugestão de itens
  const [mostrarModalSugestao, setMostrarModalSugestao] = useState(false);
  const [novoItemNome, setNovoItemNome] = useState('');
  const [novoItemUnidade, setNovoItemUnidade] = useState('');
  const [cadastrarNoSistema, setCadastrarNoSistema] = useState(true);

  const carregarDados = useCallback(async () => {
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
  }, [id]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const handleAprovar = async () => {
    if (!window.confirm('Deseja aprovar esta lista rápida?')) return;

    try {
      setSubmitting(true);
      await api.put(`/admin/listas-rapidas/${id}/aprovar`, {
        mensagem_admin: mensagemAdmin.trim() || undefined
      });
      setModalMessage('✅ Lista rápida aprovada com sucesso!');
      setShowModal(true);

      // Navegar após mostrar a mensagem
      setTimeout(() => {
        setShowModal(false);
        navigate('/admin/listas-rapidas');
      }, 1500);
    } catch (error: any) {
      console.error('[DetalhesListaRapida] Erro ao aprovar:', error);
      setModalMessage(error.response?.data?.error || 'Erro ao aprovar lista rápida.');
      setShowModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejeitar = async () => {
    if (!mensagemAdmin.trim()) {
      setModalMessage('⚠️ Por favor, informe o motivo da rejeição.');
      setShowModal(true);
      return;
    }

    if (!window.confirm('Deseja rejeitar esta lista rápida?')) return;

    try {
      setSubmitting(true);
      await api.put(`/admin/listas-rapidas/${id}/rejeitar`, {
        mensagem_admin: mensagemAdmin.trim()
      });
      setModalMessage('✅ Lista rápida rejeitada com sucesso!');
      setShowModal(true);

      // Navegar após mostrar a mensagem
      setTimeout(() => {
        setShowModal(false);
        navigate('/admin/listas-rapidas');
      }, 1500);
    } catch (error: any) {
      console.error('[DetalhesListaRapida] Erro ao rejeitar:', error);
      setModalMessage(error.response?.data?.error || 'Erro ao rejeitar lista rápida.');
      setShowModal(true);
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

  const handleDesarquivar = async () => {
    if (!window.confirm('Desarquivar esta lista?')) return;

    try {
      setDesarquivando(true);
      await api.post(`/admin/listas-rapidas/${id}/desarquivar`);
      localStorage.setItem('admin:submissoes:showArchived', JSON.stringify(false));
      navigate('/admin/submissoes');
    } catch (error: any) {
      console.error('[DetalhesListaRapida] Erro ao desarquivar:', error);
      alert(error.response?.data?.error || 'Erro ao desarquivar lista.');
    } finally {
      setDesarquivando(false);
    }
  };

  const handleConverterChecklist = async () => {
    try {
      setConvertendo(true);

      // Preparar dados para envio
      const itensComQuantidades = itens
        .filter((item) => typeof item.id === 'number')
        .map((item) => ({
          item_id: item.id as number,
          quantidade: quantidadesChecklist[item.id as number] ?? null
        }));

      const payload = {
        nome: nomeChecklist.trim() || `Checklist - ${lista?.nome}`,
        itens: itensComQuantidades,
        incluir_fornecedor: incluirFornecedor,
        incluir_observacoes: incluirObservacoes
      };

      const response = await api.post(`/admin/listas-rapidas/${id}/converter-checklist`, payload);

      // Navegar para o checklist criado
      navigate(`/admin/checklists/${response.data.id}`);
    } catch (error: any) {
      console.error('[DetalhesListaRapida] Erro ao converter para checklist:', error);
      alert(error.response?.data?.error || 'Erro ao converter para checklist');
    } finally {
      setConvertendo(false);
      setMostrarModalChecklist(false);
    }
  };

  const handleToggleSelecionado = (itemId: number | undefined) => {
    if (!itemId) return;
    const novo = new Set(itensSelecionados);
    if (novo.has(itemId)) {
      novo.delete(itemId);
    } else {
      novo.add(itemId);
    }
    setItensSelecionados(novo);
  };

  const handleDescartarSelecionados = async () => {
    if (itensSelecionados.size === 0) {
      setModalMessage('⚠️ Selecione pelo menos um item para descartar.');
      setShowModal(true);
      return;
    }

    if (!window.confirm(`Descartar ${itensSelecionados.size} item(ns)?`)) return;

    try {
      setSubmitting(true);
      for (const itemId of itensSelecionados) {
        await api.put(`/admin/listas-rapidas/${id}/itens/${itemId}/descartar`);
      }
      setModalMessage(`✅ ${itensSelecionados.size} item(ns) descartado(s)!`);
      setShowModal(true);
      setItensSelecionados(new Set());

      setTimeout(() => {
        setShowModal(false);
        carregarDados();
      }, 1500);
    } catch (error: any) {
      setModalMessage(error.response?.data?.error || 'Erro ao descartar itens');
      setShowModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestaurarItem = async (itemId: number | undefined) => {
    if (!itemId) return;

    try {
      setSubmitting(true);
      await api.put(`/admin/listas-rapidas/${id}/itens/${itemId}/restaurar`);
      setModalMessage('✅ Item restaurado!');
      setShowModal(true);

      setTimeout(() => {
        setShowModal(false);
        carregarDados();
      }, 1000);
    } catch (error: any) {
      setModalMessage(error.response?.data?.error || 'Erro ao restaurar item');
      setShowModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  const formatarMensagem = () => {
    if (!lista) return '';

    // Filtrar apenas itens não descartados
    const itensAtivos = itens.filter(item => !item.descartado);

    let mensagem = `*LISTA RAPIDA - ${lista.nome}*\n\n`;
    mensagem += `Solicitante: ${lista.usuario_nome}\n`;
    mensagem += `Data: ${lista.submetido_em ? formatarDataBrasilia(lista.submetido_em) : '-'}\n\n`;
    mensagem += `Itens Solicitados (${itensAtivos.length}):\n\n`;

    itensAtivos.forEach((item) => {
      let marcador = '';
      let emoji = '';
      if (item.prioridade === 'urgente') {
        marcador = '[URGENTE]';
        emoji = '🔴';
      } else if (item.prioridade === 'precisa_comprar') {
        marcador = '[COMPRAR]';
        emoji = '🟡';
      } else {
        marcador = '[PREVENCAO]';
        emoji = '🟢';
      }
      mensagem += `${marcador} ${emoji} ${item.item_nome} (${item.item_unidade})\n`;
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

  const handleWhatsApp = async () => {
    if (!lista) return;

    try {
      const response = await api.get(`/auth/listas-rapidas/${id}/whatsapp`);
      const texto = response.data.texto;

      // Copiar para clipboard
      await navigator.clipboard.writeText(texto);

      // Abrir WhatsApp Web com encoding que preserva emojis
      const url = new URL('https://wa.me/');
      url.searchParams.set('text', texto);
      window.open(url.toString(), '_blank');
    } catch (error: any) {
      console.error('[DetalhesListaRapida] Erro ao compartilhar WhatsApp:', error);
      alert(error.response?.data?.error || 'Erro ao compartilhar via WhatsApp');
    }
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

  const handleEditarObservacao = (itemId: number | undefined, observacao: string, index?: number) => {
    setItensEditados(itensEditados.map((item, i) =>
      (itemId ? item.id === itemId : i === index) ? { ...item, observacao } : item
    ));
  };

  const handleEditarPrioridade = (itemId: number | undefined, prioridade: 'prevencao' | 'precisa_comprar' | 'urgente', index?: number) => {
    setItensEditados(itensEditados.map((item, i) =>
      (itemId ? item.id === itemId : i === index) ? { ...item, prioridade } : item
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

  const handleSugerirItem = async () => {
    if (!novoItemNome.trim()) {
      alert('⚠️ Preencha o nome do item!');
      return;
    }

    if (!novoItemUnidade.trim()) {
      alert('⚠️ Preencha a unidade do item!');
      return;
    }

    try {
      if (cadastrarNoSistema) {
        // Criar sugestão
        await api.post('/auth/sugestoes', {
          lista_rapida_id: parseInt(id!),
          nome_item: novoItemNome.trim(),
          unidade: novoItemUnidade.trim(),
          quantidade: 1,
          mensagem_usuario: 'Item sugerido pelo admin durante edição de lista rápida'
        });

        setModalMessage('✅ Sugestão criada! Será enviada para aprovação.');
      } else {
        // Criar item temporário
        const response = await api.post(`/auth/listas-rapidas/${id}/itens/temporario`, {
          nome_item: novoItemNome.trim(),
          unidade: novoItemUnidade.trim(),
          prioridade: 'prevencao',
          observacao: ''
        });

        // Adicionar à lista editada
        setItensEditados([...itensEditados, response.data.item]);
        setModalMessage('✅ Item temporário adicionado!');
      }

      // Limpar e fechar modal
      setNovoItemNome('');
      setNovoItemUnidade('');
      setCadastrarNoSistema(true);
      setMostrarModalSugestao(false);
      setMostrarModalBusca(false);
      setShowModal(true);
      setTimeout(() => {
        setShowModal(false);
        if (!cadastrarNoSistema) {
          carregarDados();
        }
      }, 1500);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao sugerir item.');
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

  const isArquivada = Boolean(lista.arquivada);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => navigate('/admin/submissoes')} className={styles.btnVoltar}>
          <FontAwesomeIcon icon={faArrowLeft} /> Voltar
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
            <strong>{lista.submetido_em ? formatarDataBrasilia(lista.submetido_em) : '-'}</strong>
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
                  {itensEditados.map((item, index) => (
                    <tr key={item.id || `temp-${index}`}>
                      <td>
                        <strong>{item.item_nome}</strong>
                        {item.is_temporario && (
                          <span className="badge bg-warning text-dark ms-2" style={{ fontSize: '10px' }}>
                            TEMPORÁRIO
                          </span>
                        )}
                        {item.cadastrar_no_sistema && (
                          <span className="badge bg-info ms-2" style={{ fontSize: '10px' }}>
                            SUGESTÃO
                          </span>
                        )}
                      </td>
                      <td>{item.item_unidade}</td>
                      <td>
                        <div className={styles.prioridadesBtns}>
                          <button
                            type="button"
                            className={`${styles.btnPrioridadeSmall} ${item.prioridade === 'urgente' ? styles.urgente : ''}`}
                            onClick={() => handleEditarPrioridade(item.id, 'urgente', index)}
                            title="Urgente"
                          >
                            🔴
                          </button>
                          <button
                            type="button"
                            className={`${styles.btnPrioridadeSmall} ${item.prioridade === 'precisa_comprar' ? styles.comprar : ''}`}
                            onClick={() => handleEditarPrioridade(item.id, 'precisa_comprar', index)}
                            title="Comprar"
                          >
                            🟡
                          </button>
                          <button
                            type="button"
                            className={`${styles.btnPrioridadeSmall} ${item.prioridade === 'prevencao' ? styles.prevencao : ''}`}
                            onClick={() => handleEditarPrioridade(item.id, 'prevencao', index)}
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
                          onChange={(e) => handleEditarObservacao(item.id, e.target.value, index)}
                          placeholder="Observação..."
                        />
                      </td>
                      <td className="text-center">
                          <FontAwesomeIcon
                            icon={faTrash}
                            className="text-danger"
                          onClick={() => item.id && handleRemoverItem(item.id)}
                            style={{ cursor: 'pointer', fontSize: '1.2rem' }}
                            title="Remover item"
                          />
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
                <FontAwesomeIcon icon={faPlus} /> Adicionar Item
              </button>
              <button
                onClick={handleSalvarEdicao}
                disabled={submitting}
                className={`${styles.btn} ${styles.btnSuccess}`}
              >
                <FontAwesomeIcon icon={faSave} /> Salvar Alterações
              </button>
              <button
                onClick={handleCancelarEdicao}
                disabled={submitting}
                className={`${styles.btn} ${styles.btnSecondary}`}
              >
                <FontAwesomeIcon icon={faTimes} /> Cancelar
              </button>
            </div>
          </>
        ) : (
          // MODO VISUALIZAÇÃO
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setItensSelecionados(new Set(itens.filter(i => !i.descartado).map(i => i.id!)));
                          } else {
                            setItensSelecionados(new Set());
                          }
                        }}
                        checked={itensSelecionados.size > 0 && itensSelecionados.size === itens.filter(i => !i.descartado).length}
                      />
                    </th>
                    <th>Item</th>
                    <th>Unidade</th>
                    <th>Prioridade</th>
                    <th>Observação</th>
                    <th style={{ width: '80px' }} className="text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => {
                    const badge = getPrioridadeBadge(item.prioridade);
                    const isDescartado = item.descartado || false;
                    return (
                      <tr key={item.id} style={{ opacity: isDescartado ? 0.5 : 1 }}>
                        <td>
                          <input
                            type="checkbox"
                            disabled={isDescartado}
                            checked={itensSelecionados.has(item.id!)}
                            onChange={() => handleToggleSelecionado(item.id)}
                          />
                        </td>
                        <td><strong>{item.item_nome}</strong></td>
                        <td>{item.item_unidade}</td>
                        <td>
                          <span className={badge.className}>{badge.label}</span>
                        </td>
                        <td>{item.observacao || '-'}</td>
                        <td className="text-center">
                          {isDescartado ? (
                            <button
                              type="button"
                              onClick={() => handleRestaurarItem(item.id)}
                              disabled={submitting}
                              className="btn btn-sm btn-warning"
                              title="Restaurar item"
                            >
                              <FontAwesomeIcon icon={faUndo} />
                            </button>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#999' }}>-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {itensSelecionados.size > 0 && (
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
                <button
                  onClick={handleDescartarSelecionados}
                  disabled={submitting}
                  className={`${styles.btn} ${styles.btnDanger}`}
                  style={{ backgroundColor: '#dc3545', color: 'white' }}
                >
                  Descartar {itensSelecionados.size} item(ns) selecionado(s)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {isArquivada ? (
        <div className={styles.acaoSection}>
          <h2>Lista Arquivada</h2>
          <div className={styles.acoesBotoes}>
            <button
              onClick={handleDesarquivar}
              disabled={desarquivando}
              className={`${styles.btn} ${styles.btnSecondary}`}
            >
              <FontAwesomeIcon icon={faUndo} /> Desarquivar
            </button>
          </div>
        </div>
      ) : (
        <>
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
                    <FontAwesomeIcon icon={faEdit} /> Editar Lista
                  </button>
                )}
                <button
                  onClick={handleCopiar}
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  title="Copiar lista de itens"
                >
                  <FontAwesomeIcon icon={faCopy} /> Copiar
                </button>
                <button
                  onClick={handleWhatsApp}
                  className={`${styles.btn} ${styles.btnWhatsapp}`}
                  title="Enviar lista via WhatsApp"
                >
                  <FontAwesomeIcon icon={faWhatsapp} /> Enviar via WhatsApp
                </button>
                {(lista.status === 'aprovada' || lista.status === 'rejeitada') && (
                  <button
                    onClick={handleReverter}
                    disabled={submitting}
                    className={`${styles.btn} ${styles.btnWarning}`}
                  >
                    <FontAwesomeIcon icon={faUndo} /> Reverter para Pendente
                  </button>
                )}
                {lista.status === 'aprovada' && (
                  <button
                    onClick={() => setMostrarModalChecklist(true)}
                    disabled={submitting}
                    className={`${styles.btn} ${styles.btnPrimary}`}
                  >
                    <FontAwesomeIcon icon={faCheckCircle} /> Converter para Checklist
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
                  <FontAwesomeIcon icon={faCheckCircle} /> Aprovar Lista
                </button>
                <button
                  onClick={handleRejeitar}
                  disabled={submitting}
                  className={`${styles.btn} ${styles.btnRejeitar}`}
                >
                  <FontAwesomeIcon icon={faTimesCircle} /> Rejeitar Lista
                </button>
              </div>
            </div>
          )}
        </>
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
            <FontAwesomeIcon icon={faSearch} /> Adicionar Item do Catálogo
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
                  <FontAwesomeIcon icon={faSearch} size="2x" className="mb-2" />
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
                            <FontAwesomeIcon icon={faCheck} /> Já adicionado
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
              <FontAwesomeIcon icon={faKeyboard} size="3x" className="mb-3" />
              <p>Digite no campo acima para buscar itens no catálogo global</p>
              <small>Total de itens disponíveis: {itensGlobais.length}</small>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="success"
            onClick={() => {
              setMostrarModalBusca(false);
              setMostrarModalSugestao(true);
            }}
          >
            <FontAwesomeIcon icon={faPlus} /> Sugerir Novo Item
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setMostrarModalBusca(false);
              setBuscaItem('');
            }}
          >
            <FontAwesomeIcon icon={faTimes} /> Fechar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de sugestão de item */}
      <Modal
        show={mostrarModalSugestao}
        onHide={() => {
          setMostrarModalSugestao(false);
          setNovoItemNome('');
          setNovoItemUnidade('');
          setCadastrarNoSistema(true);
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Sugerir Novo Item</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <label className="form-label"><strong>Nome do Item *</strong></label>
            <input
              type="text"
              className="form-control"
              value={novoItemNome}
              onChange={(e) => setNovoItemNome(e.target.value)}
              placeholder="Ex: Abacaxi"
            />
          </div>

          <div className="mb-3">
            <label className="form-label"><strong>Unidade *</strong></label>
            <input
              type="text"
              className="form-control"
              value={novoItemUnidade}
              onChange={(e) => setNovoItemUnidade(e.target.value)}
              placeholder="Ex: kg, un, L"
            />
          </div>

          <div className="mb-3">
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="cadastrarNoSistema"
                checked={cadastrarNoSistema}
                onChange={(e) => setCadastrarNoSistema(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="cadastrarNoSistema">
                Cadastrar este item no sistema (requer aprovação do admin)
              </label>
            </div>
            {!cadastrarNoSistema && (
              <small className="text-muted ms-4">
                Item será usado apenas nesta lista e não ficará disponível para outros usuários.
              </small>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setMostrarModalSugestao(false);
              setNovoItemNome('');
              setNovoItemUnidade('');
              setCadastrarNoSistema(true);
            }}
          >
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSugerirItem}>
            Confirmar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de conversão para checklist */}
      <Modal
        show={mostrarModalChecklist}
        onHide={() => setMostrarModalChecklist(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FontAwesomeIcon icon={faCheckCircle} /> Converter para Checklist
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Nome do checklist */}
          <div className="mb-4">
            <label className="form-label fw-bold">Nome do Checklist</label>
            <input
              type="text"
              className="form-control"
              placeholder={`Checklist - ${lista?.nome || ''}`}
              value={nomeChecklist}
              onChange={(e) => setNomeChecklist(e.target.value)}
            />
            <small className="text-muted">Deixe em branco para usar o nome padrão</small>
          </div>

          {/* Opções */}
          <div className="mb-4">
            <label className="form-label fw-bold">Opções</label>
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="incluirFornecedor"
                checked={incluirFornecedor}
                onChange={(e) => setIncluirFornecedor(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="incluirFornecedor">
                Incluir fornecedor dos itens
              </label>
            </div>
            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="incluirObservacoes"
                checked={incluirObservacoes}
                onChange={(e) => setIncluirObservacoes(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="incluirObservacoes">
                Incluir observações dos itens
              </label>
            </div>
          </div>

          {/* Tabela de itens com quantidades */}
          <div>
            <label className="form-label fw-bold">Quantidades (opcional)</label>
            <p className="text-muted small">Defina a quantidade de cada item. Deixe em branco para omitir.</p>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="table table-sm table-hover">
                <thead className="table-light sticky-top">
                  <tr>
                    <th>Item</th>
                    <th>Prioridade</th>
                    <th style={{ width: '150px' }}>Quantidade</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.item_nome}</strong>
                        <br />
                        <small className="text-muted">{item.item_unidade}</small>
                      </td>
                      <td>
                        <span className={`badge ${
                          item.prioridade === 'urgente' ? 'bg-danger' :
                          item.prioridade === 'precisa_comprar' ? 'bg-warning' :
                          'bg-info'
                        }`}>
                          {item.prioridade === 'urgente' ? 'Urgente' :
                           item.prioridade === 'precisa_comprar' ? 'Precisa Comprar' :
                           'Prevenção'}
                        </span>
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          placeholder="Opcional"
                          min="0"
                          step="0.1"
                          value={typeof item.id === 'number' ? (quantidadesChecklist[item.id] ?? '') : ''}
                          onChange={(e) => {
                            if (typeof item.id !== 'number') return;
                            const valor = e.target.value;
                            setQuantidadesChecklist(prev => ({
                              ...prev,
                              [item.id as number]: valor === '' ? null : parseFloat(valor)
                            }));
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setMostrarModalChecklist(false)}
            disabled={convertendo}
          >
            <FontAwesomeIcon icon={faTimes} /> Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleConverterChecklist}
            disabled={convertendo}
          >
            <FontAwesomeIcon icon={faCheckCircle} /> {convertendo ? 'Convertendo...' : 'Criar Checklist'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default DetalhesListaRapida;
