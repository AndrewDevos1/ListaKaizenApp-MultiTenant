'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Table, Alert, Spinner, Badge, Button, Modal, Form } from 'react-bootstrap';
import api from '@/lib/api';
import styles from '@/app/admin/listas/[id]/ListaDetail.module.css';
import { FaClipboardCheck, FaClipboardList, FaWhatsapp, FaCopy } from 'react-icons/fa';

type StatusSubmissao = 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'PARCIAL' | 'ARQUIVADO';
type StatusPedido = 'PENDENTE' | 'APROVADO' | 'REJEITADO';

interface Pedido {
  id: number;
  status: StatusPedido;
  qtdSolicitada: number;
  item: { id: number; nome: string; unidadeMedida: string };
}

interface SubmissaoDetail {
  id: number;
  status: StatusSubmissao;
  criadoEm: string;
  arquivada: boolean;
  lista: { id: number; nome: string };
  usuario: { id: number; nome: string; email: string };
  pedidos: Pedido[];
}

const STATUS_SUB_VARIANT: Record<StatusSubmissao, string> = {
  PENDENTE: 'warning',
  APROVADO: 'success',
  REJEITADO: 'danger',
  PARCIAL: 'info',
  ARQUIVADO: 'secondary',
};

const STATUS_PED_VARIANT: Record<StatusPedido, string> = {
  PENDENTE: 'warning',
  APROVADO: 'success',
  REJEITADO: 'danger',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function gerarTextoCompartilhamento(submissao: SubmissaoDetail): string {
  const aprovados = submissao.pedidos.filter((p) => p.status === 'APROVADO');
  const rejeitados = submissao.pedidos.filter((p) => p.status === 'REJEITADO');

  const linhas: string[] = [
    '*PEDIDO DE COMPRA*',
    `*${submissao.lista.nome}*`,
    `Submissão #${submissao.id}`,
    `Colaborador: ${submissao.usuario.nome}`,
    `Data: ${formatDate(submissao.criadoEm)}`,
    '',
  ];

  if (aprovados.length > 0) {
    linhas.push('*ITENS APROVADOS*');
    aprovados.forEach((pedido) => {
      linhas.push(
        `- ${pedido.item.nome}: ${pedido.qtdSolicitada} ${pedido.item.unidadeMedida}`,
      );
    });
  } else {
    linhas.push('Nenhum item aprovado.');
  }

  if (rejeitados.length > 0) {
    linhas.push('', '*ITENS REJEITADOS*');
    rejeitados.forEach((pedido) => {
      linhas.push(
        `- ${pedido.item.nome}: ${pedido.qtdSolicitada} ${pedido.item.unidadeMedida}`,
      );
    });
  }

  return linhas.join('\n');
}

export default function AdminSubmissaoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const submissaoId = params.id as string;

  const [submissao, setSubmissao] = useState<SubmissaoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedPedidoIds, setSelectedPedidoIds] = useState<number[]>([]);
  const [showClipboard, setShowClipboard] = useState(false);
  const [clipboardText, setClipboardText] = useState('');

  const fetchSubmissao = useCallback(async () => {
    try {
      const { data } = await api.get(`/v1/admin/submissoes/${submissaoId}`);
      setSubmissao(data);
    } catch {
      setError('Erro ao carregar submissão');
    } finally {
      setLoading(false);
    }
  }, [submissaoId]);

  useEffect(() => {
    fetchSubmissao();
  }, [fetchSubmissao]);

  useEffect(() => {
    if (!submissao) {
      setSelectedPedidoIds([]);
      return;
    }
    const pendentes = new Set(
      submissao.pedidos
        .filter((pedido) => pedido.status === 'PENDENTE')
        .map((pedido) => pedido.id),
    );
    setSelectedPedidoIds((prev) => prev.filter((id) => pendentes.has(id)));
  }, [submissao]);

  const execAction = async (key: string, fn: () => Promise<void>, msg: string) => {
    setError('');
    setSuccess('');
    setActionLoading(key);
    try {
      await fn();
      setSuccess(msg);
      fetchSubmissao();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao executar ação');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePedidoStatus = (pedidoId: number, status: 'PENDENTE' | 'APROVADO' | 'REJEITADO') => {
    const actionLabel =
      status === 'PENDENTE'
        ? 'desfeito para pendente'
        : status === 'APROVADO'
        ? 'aprovado'
        : 'rejeitado';
    execAction(
      `pedido-${pedidoId}-${status}`,
      () => api.put(`/v1/admin/pedidos/${pedidoId}/status`, { status }),
      `Pedido ${actionLabel} com sucesso`,
    );
  };

  const handleTogglePedido = (pedidoId: number) => {
    setSelectedPedidoIds((prev) =>
      prev.includes(pedidoId)
        ? prev.filter((id) => id !== pedidoId)
        : [...prev, pedidoId],
    );
  };

  const handleToggleTodosPendentes = () => {
    if (!submissao) return;
    const pendentesIds = submissao.pedidos
      .filter((pedido) => pedido.status === 'PENDENTE')
      .map((pedido) => pedido.id);
    const todosSelecionados =
      pendentesIds.length > 0 && selectedPedidoIds.length === pendentesIds.length;
    setSelectedPedidoIds(todosSelecionados ? [] : pendentesIds);
  };

  const handleAprovarSelecionados = () => {
    if (!submissao || selectedPedidoIds.length === 0) return;
    const totalSelecionados = selectedPedidoIds.length;
    if (!confirm(`Aprovar ${totalSelecionados} item(ns) selecionado(s)?`)) return;
    execAction(
      'aprovar-selecionados',
      async () => {
        for (const pedidoId of selectedPedidoIds) {
          await api.put(`/v1/admin/pedidos/${pedidoId}/status`, { status: 'APROVADO' });
        }
        setSelectedPedidoIds([]);
      },
      `${totalSelecionados} pedido(s) aprovado(s)`,
    );
  };

  const handleRejeitarSelecionados = () => {
    if (!submissao || selectedPedidoIds.length === 0) return;
    const totalSelecionados = selectedPedidoIds.length;
    if (!confirm(`Rejeitar ${totalSelecionados} item(ns) selecionado(s)?`)) return;
    execAction(
      'rejeitar-selecionados',
      async () => {
        for (const pedidoId of selectedPedidoIds) {
          await api.put(`/v1/admin/pedidos/${pedidoId}/status`, { status: 'REJEITADO' });
        }
        setSelectedPedidoIds([]);
      },
      `${totalSelecionados} pedido(s) rejeitado(s)`,
    );
  };

  const handleReverter = () => {
    if (!confirm('Reverter submissão para PENDENTE?')) return;
    execAction(
      'reverter',
      () => api.put(`/v1/admin/submissoes/${submissaoId}/reverter`),
      'Submissão revertida para PENDENTE',
    );
  };

  const handleArquivar = () => {
    if (!confirm('Arquivar esta submissão?')) return;
    execAction(
      'arquivar',
      () => api.put(`/v1/admin/submissoes/${submissaoId}/arquivar`),
      'Submissão arquivada',
    );
  };

  const handleCriarChecklist = async () => {
    setError('');
    setSuccess('');
    setActionLoading('criar-checklist');
    try {
      const { data } = await api.post('/v1/admin/checklists', { submissaoId: Number(submissaoId) });
      router.push(`/admin/checklists/${data.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao criar checklist');
      setActionLoading(null);
    }
  };

  const handleCopiarCompartilhamento = async () => {
    if (!submissao) return;
    const texto = gerarTextoCompartilhamento(submissao);
    try {
      await navigator.clipboard.writeText(texto);
      setSuccess('Texto copiado para a área de transferência');
    } catch {
      setClipboardText(texto);
      setShowClipboard(true);
    }
  };

  const handleWhatsAppCompartilhamento = () => {
    if (!submissao) return;
    const texto = gerarTextoCompartilhamento(submissao);
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  if (!submissao) {
    return <Alert variant="danger">Submissão não encontrada</Alert>;
  }

  const isLoading = (key: string) => actionLoading === key;
  const pedidosPendentes = submissao.pedidos.filter((pedido) => pedido.status === 'PENDENTE');
  const pedidosAprovados = submissao.pedidos.filter((pedido) => pedido.status === 'APROVADO');
  const pedidosRejeitados = submissao.pedidos.filter((pedido) => pedido.status === 'REJEITADO');
  const allPendentesSelecionados =
    pedidosPendentes.length > 0 && selectedPedidoIds.length === pedidosPendentes.length;

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <Link href="/admin/submissoes" className={styles.backButton}>
          ← Voltar para Submissões
        </Link>

        {/* Cabeçalho */}
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <h1 className={styles.listTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FaClipboardCheck />
              {submissao.lista.nome}
            </h1>
            <div className={styles.listMeta}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Colaborador:</span>
                {submissao.usuario.nome}
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Email:</span>
                {submissao.usuario.email}
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Data:</span>
                {formatDate(submissao.criadoEm)}
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Status:</span>
                <Badge bg={STATUS_SUB_VARIANT[submissao.status] ?? 'secondary'} style={{ fontSize: '0.9rem' }}>
                  {submissao.status}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

        {/* Ações em lote */}
        <div className={styles.tableSection} style={{ padding: '1.25rem 2rem' }}>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
            <Badge bg="warning" text="dark">Pendentes: {pedidosPendentes.length}</Badge>
            <Badge bg="success">Aprovados: {pedidosAprovados.length}</Badge>
            <Badge bg="danger">Rejeitados: {pedidosRejeitados.length}</Badge>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem', marginRight: '0.5rem' }}>
              Selecionados: {selectedPedidoIds.length}
            </span>

            {pedidosPendentes.length > 0 ? (
              <>
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={handleToggleTodosPendentes}
                  disabled={!!actionLoading || submissao.arquivada}
                >
                  {allPendentesSelecionados ? 'Limpar Seleção' : 'Selecionar Todos Pendentes'}
                </Button>
                <Button
                  variant="success"
                  size="sm"
                  onClick={handleAprovarSelecionados}
                  disabled={!!actionLoading || submissao.status === 'ARQUIVADO' || selectedPedidoIds.length === 0}
                >
                  {isLoading('aprovar-selecionados') ? <Spinner animation="border" size="sm" /> : 'Aprovar Marcados'}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleRejeitarSelecionados}
                  disabled={!!actionLoading || submissao.status === 'ARQUIVADO' || selectedPedidoIds.length === 0}
                >
                  {isLoading('rejeitar-selecionados') ? <Spinner animation="border" size="sm" /> : 'Rejeitar Marcados'}
                </Button>
              </>
            ) : (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Não há itens pendentes. Use os botões "Desfazer" por item para reabrir.
              </span>
            )}

            <Button
              variant="outline-warning"
              size="sm"
              onClick={handleReverter}
              disabled={!!actionLoading || submissao.status === 'PENDENTE'}
            >
              {isLoading('reverter') ? <Spinner animation="border" size="sm" /> : 'Reverter Submissão'}
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={handleArquivar}
              disabled={!!actionLoading || submissao.arquivada}
            >
              {isLoading('arquivar') ? <Spinner animation="border" size="sm" /> : 'Arquivar Submissão'}
            </Button>
            {pedidosAprovados.length > 0 && (
              <>
                <Button
                  variant="outline-success"
                  size="sm"
                  onClick={handleWhatsAppCompartilhamento}
                  disabled={!!actionLoading}
                >
                  <FaWhatsapp style={{ marginRight: '0.35rem' }} />
                  WhatsApp
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={handleCopiarCompartilhamento}
                  disabled={!!actionLoading}
                >
                  <FaCopy style={{ marginRight: '0.35rem' }} />
                  Copiar
                </Button>
              </>
            )}
            {(submissao.status === 'APROVADO' || submissao.status === 'PARCIAL') && !submissao.arquivada && (
              <Button
                variant="outline-info"
                size="sm"
                onClick={handleCriarChecklist}
                disabled={!!actionLoading}
              >
                {isLoading('criar-checklist') ? <Spinner animation="border" size="sm" /> : (
                  <><FaClipboardList style={{ marginRight: '0.3rem' }} />Criar Checklist</>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Tabela de pedidos */}
        <div className={styles.tableSection}>
          <h2 className={styles.sectionTitle}>
            Pedidos ({submissao.pedidos.length})
          </h2>
          <div className={styles.tableWrapper}>
            <Table striped bordered hover responsive className={styles.table}>
              <thead>
                <tr className={styles.tableHeader}>
                  <th className={styles.tableHeaderCell} style={{ width: 56, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      className="form-check-input m-0"
                      checked={allPendentesSelecionados}
                      onChange={handleToggleTodosPendentes}
                      disabled={!!actionLoading || submissao.arquivada || pedidosPendentes.length === 0}
                      aria-label="Selecionar todos os pedidos pendentes"
                    />
                  </th>
                  <th className={styles.tableHeaderCell}>#</th>
                  <th className={styles.tableHeaderCell}>Item</th>
                  <th className={styles.tableHeaderCell}>Unidade</th>
                  <th className={styles.tableHeaderCell}>Qtd Solicitada</th>
                  <th className={styles.tableHeaderCell}>Status</th>
                  <th className={styles.tableHeaderCell}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {submissao.pedidos.map((pedido) => (
                  <tr key={pedido.id} className={styles.tableRow}>
                    <td className={styles.tableCell} style={{ textAlign: 'center' }}>
                      {pedido.status === 'PENDENTE' && !submissao.arquivada ? (
                        <input
                          type="checkbox"
                          className="form-check-input m-0"
                          checked={selectedPedidoIds.includes(pedido.id)}
                          onChange={() => handleTogglePedido(pedido.id)}
                          disabled={!!actionLoading}
                          aria-label={`Selecionar pedido ${pedido.id}`}
                        />
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className={styles.tableCell}>{pedido.id}</td>
                    <td className={`${styles.tableCell} ${styles.cellBold}`}>
                      {pedido.item.nome}
                    </td>
                    <td className={styles.tableCell}>{pedido.item.unidadeMedida}</td>
                    <td className={styles.tableCell}>{pedido.qtdSolicitada}</td>
                    <td className={styles.tableCell}>
                      <Badge bg={STATUS_PED_VARIANT[pedido.status] ?? 'secondary'}>
                        {pedido.status}
                      </Badge>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.actionButtons}>
                        {pedido.status === 'PENDENTE' ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline-success"
                              disabled={!!actionLoading || submissao.arquivada}
                              onClick={() => handlePedidoStatus(pedido.id, 'APROVADO')}
                            >
                              {isLoading(`pedido-${pedido.id}-APROVADO`) ? <Spinner animation="border" size="sm" /> : 'Aprovar'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              disabled={!!actionLoading || submissao.arquivada}
                              onClick={() => handlePedidoStatus(pedido.id, 'REJEITADO')}
                            >
                              {isLoading(`pedido-${pedido.id}-REJEITADO`) ? <Spinner animation="border" size="sm" /> : 'Rejeitar'}
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            disabled={!!actionLoading || submissao.arquivada}
                            onClick={() => handlePedidoStatus(pedido.id, 'PENDENTE')}
                          >
                            {isLoading(`pedido-${pedido.id}-PENDENTE`) ? <Spinner animation="border" size="sm" /> : 'Desfazer'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {submissao.pedidos.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-4">
                      Nenhum pedido nesta submissão
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </div>
      </div>

      <Modal show={showClipboard} onHide={() => setShowClipboard(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Copiar texto</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted small mb-2">
            Não foi possível copiar automaticamente. Copie manualmente abaixo.
          </p>
          <Form.Control as="textarea" rows={12} readOnly value={clipboardText} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowClipboard(false)}>
            Fechar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
