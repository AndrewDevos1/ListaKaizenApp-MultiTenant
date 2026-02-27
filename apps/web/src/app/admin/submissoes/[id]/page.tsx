'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Table, Alert, Spinner, Badge, Button } from 'react-bootstrap';
import api from '@/lib/api';
import styles from '@/app/admin/listas/[id]/ListaDetail.module.css';
import { FaClipboardCheck } from 'react-icons/fa';

type StatusSubmissao = 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'PARCIAL' | 'ARQUIVADO';
type StatusPedido = 'PENDENTE' | 'APROVADO' | 'REJEITADO';

interface Pedido {
  id: number;
  status: StatusPedido;
  quantidadeSolicitada: number;
  itemRef: {
    id: number;
    quantidadeMinima: number;
    item: { id: number; nome: string; unidadeMedida: string };
  };
}

interface SubmissaoDetail {
  id: number;
  status: StatusSubmissao;
  criadoEm: string;
  arquivada: boolean;
  lista: { id: number; nome: string };
  colaborador: { id: number; usuario: { nome: string; email: string } };
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

export default function AdminSubmissaoDetailPage() {
  const params = useParams();
  const submissaoId = params.id as string;

  const [submissao, setSubmissao] = useState<SubmissaoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  const handlePedidoStatus = (pedidoId: number, status: 'APROVADO' | 'REJEITADO') => {
    execAction(
      `pedido-${pedidoId}-${status}`,
      () => api.put(`/v1/admin/pedidos/${pedidoId}/status`, { status }),
      `Pedido ${status.toLowerCase()} com sucesso`,
    );
  };

  const handleAprovarTodos = () => {
    if (!submissao) return;
    execAction(
      'aprovar-todos',
      () => api.post(`/v1/admin/submissoes/${submissaoId}/aprovar`),
      'Todos os pedidos aprovados',
    );
  };

  const handleRejeitarTodos = () => {
    if (!submissao) return;
    execAction(
      'rejeitar-todos',
      () => api.post(`/v1/admin/submissoes/${submissaoId}/rejeitar`),
      'Todos os pedidos rejeitados',
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
                {submissao.colaborador.usuario.nome}
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Email:</span>
                {submissao.colaborador.usuario.email}
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
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem', marginRight: '0.5rem' }}>
              Ações em lote:
            </span>
            <Button
              variant="success"
              size="sm"
              onClick={handleAprovarTodos}
              disabled={!!actionLoading || submissao.status === 'ARQUIVADO'}
            >
              {isLoading('aprovar-todos') ? <Spinner animation="border" size="sm" /> : 'Aprovar Todos'}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleRejeitarTodos}
              disabled={!!actionLoading || submissao.status === 'ARQUIVADO'}
            >
              {isLoading('rejeitar-todos') ? <Spinner animation="border" size="sm" /> : 'Rejeitar Todos'}
            </Button>
            <Button
              variant="outline-warning"
              size="sm"
              onClick={handleReverter}
              disabled={!!actionLoading || submissao.status === 'PENDENTE'}
            >
              {isLoading('reverter') ? <Spinner animation="border" size="sm" /> : 'Reverter'}
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={handleArquivar}
              disabled={!!actionLoading || submissao.arquivada}
            >
              {isLoading('arquivar') ? <Spinner animation="border" size="sm" /> : 'Arquivar Submissão'}
            </Button>
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
                    <td className={styles.tableCell}>{pedido.id}</td>
                    <td className={`${styles.tableCell} ${styles.cellBold}`}>
                      {pedido.itemRef.item.nome}
                    </td>
                    <td className={styles.tableCell}>{pedido.itemRef.item.unidadeMedida}</td>
                    <td className={styles.tableCell}>{pedido.quantidadeSolicitada}</td>
                    <td className={styles.tableCell}>
                      <Badge bg={STATUS_PED_VARIANT[pedido.status] ?? 'secondary'}>
                        {pedido.status}
                      </Badge>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.actionButtons}>
                        <Button
                          size="sm"
                          variant="outline-success"
                          disabled={!!actionLoading || pedido.status === 'APROVADO' || submissao.arquivada}
                          onClick={() => handlePedidoStatus(pedido.id, 'APROVADO')}
                        >
                          {isLoading(`pedido-${pedido.id}-APROVADO`) ? <Spinner animation="border" size="sm" /> : 'Aprovar'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          disabled={!!actionLoading || pedido.status === 'REJEITADO' || submissao.arquivada}
                          onClick={() => handlePedidoStatus(pedido.id, 'REJEITADO')}
                        >
                          {isLoading(`pedido-${pedido.id}-REJEITADO`) ? <Spinner animation="border" size="sm" /> : 'Rejeitar'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {submissao.pedidos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">
                      Nenhum pedido nesta submissão
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
