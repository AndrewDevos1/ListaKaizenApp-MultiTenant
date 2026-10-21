'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert, Badge, Button, Form, Spinner, Table } from 'react-bootstrap';
import api from '@/lib/api';
import styles from '@/app/admin/listas/[id]/ListaDetail.module.css';

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
  lista: { id: number; nome: string };
  usuario: { id: number; nome: string; email: string };
  pedidos: Pedido[];
}

interface RecebimentoDetail {
  id: number;
  observacoes?: string | null;
  confirmadoEm?: string | null;
  confirmadoAdminEm?: string | null;
  confirmadoPor?: { id: number; nome: string; email: string } | null;
  confirmadoAdmin?: { id: number; nome: string; email: string } | null;
  itens: Array<{
    pedidoId: number;
    confirmado: boolean;
    pedido: Pedido;
  }>;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ConfirmarRecebimentoAdminPage() {
  const params = useParams();
  const router = useRouter();
  const submissaoId = params.id as string;

  const [submissao, setSubmissao] = useState<SubmissaoDetail | null>(null);
  const [recebimento, setRecebimento] = useState<RecebimentoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: sub } = await api.get(`/v1/admin/submissoes/${submissaoId}`);
      setSubmissao(sub);

      try {
        const { data: rec } = await api.get(`/v1/admin/submissoes/${submissaoId}/recebimento`);
        setRecebimento(rec);
      } catch (err: any) {
        if (err?.response?.status !== 404) {
          throw err;
        }
        setRecebimento(null);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao carregar recebimento');
    } finally {
      setLoading(false);
    }
  }, [submissaoId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pedidosAprovados = useMemo(
    () => (submissao?.pedidos ?? []).filter((pedido) => pedido.status === 'APROVADO'),
    [submissao],
  );

  useEffect(() => {
    if (recebimento) {
      setSelectedIds(
        recebimento.itens.filter((item) => item.confirmado).map((item) => item.pedidoId),
      );
      setObservacoes(recebimento.observacoes ?? '');
      return;
    }
    setSelectedIds([]);
    setObservacoes('');
  }, [recebimento, pedidosAprovados]);

  const togglePedido = (pedidoId: number) => {
    setSelectedIds((prev) =>
      prev.includes(pedidoId)
        ? prev.filter((id) => id !== pedidoId)
        : [...prev, pedidoId],
    );
  };

  const toggleTodos = () => {
    if (selectedIds.length === pedidosAprovados.length) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(pedidosAprovados.map((pedido) => pedido.id));
  };

  const handleConfirmar = async () => {
    if (!submissao) return;
    if (pedidosAprovados.length === 0) {
      setError('Não há itens aprovados para confirmar.');
      return;
    }

    if (
      selectedIds.length < pedidosAprovados.length &&
      !confirm(
        `Existem ${pedidosAprovados.length - selectedIds.length} item(ns) não marcado(s) como recebido(s). Confirmar assim mesmo?`,
      )
    ) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await api.post(`/v1/admin/submissoes/${submissaoId}/recebimento`, {
        itensConfirmados: selectedIds,
        observacoes,
      });
      setRecebimento(data);
      setSuccess('Recebimento confirmado administrativamente.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao confirmar recebimento');
    } finally {
      setSaving(false);
    }
  };

  const handleDesfazer = async () => {
    if (!confirm('Desfazer este recebimento?')) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.delete(`/v1/admin/submissoes/${submissaoId}/recebimento`);
      setRecebimento(null);
      setSuccess('Recebimento desfeito com sucesso.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao desfazer recebimento');
    } finally {
      setSaving(false);
    }
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

  const adminJaConfirmou = Boolean(recebimento?.confirmadoAdminEm);

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <Link href={`/admin/submissoes/${submissao.id}`} className={styles.backButton}>
          ← Voltar para Submissão
        </Link>

        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <h1 className={styles.listTitle}>Recebimento da Submissão #{submissao.id}</h1>
            <div className={styles.listMeta}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Lista:</span>
                {submissao.lista.nome}
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Colaborador:</span>
                {submissao.usuario.nome}
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Status:</span>
                <Badge bg={submissao.status === 'APROVADO' ? 'success' : 'info'}>
                  {submissao.status}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

        <div className={styles.tableSection}>
          {pedidosAprovados.length === 0 ? (
            <Alert variant="warning" className="mb-0">
              Esta submissão não possui itens aprovados para recebimento.
            </Alert>
          ) : (
            <>
              {recebimento && (
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <Badge bg="success">Recebimento registrado</Badge>
                  {recebimento.confirmadoEm && (
                    <Badge bg="primary">
                      Colaborador: {recebimento.confirmadoPor?.nome ?? 'N/A'} em{' '}
                      {formatDate(recebimento.confirmadoEm)}
                    </Badge>
                  )}
                  {recebimento.confirmadoAdminEm && (
                    <Badge bg="dark">
                      Admin: {recebimento.confirmadoAdmin?.nome ?? 'N/A'} em{' '}
                      {formatDate(recebimento.confirmadoAdminEm)}
                    </Badge>
                  )}
                </div>
              )}

              {!adminJaConfirmou && (
                <div className={styles.actionButtons} style={{ marginBottom: '1rem' }}>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={toggleTodos}
                    disabled={saving}
                  >
                    {selectedIds.length === pedidosAprovados.length
                      ? 'Desmarcar todos'
                      : 'Marcar todos'}
                  </Button>
                  <span className={styles.cellMuted}>
                    Marcados: {selectedIds.length} / {pedidosAprovados.length}
                  </span>
                </div>
              )}

              <Table striped bordered hover responsive className={styles.table}>
                <thead>
                  <tr className={styles.tableHeader}>
                    {!adminJaConfirmou && (
                      <th className={styles.tableHeaderCell} style={{ width: 52 }}>
                        OK
                      </th>
                    )}
                    <th className={styles.tableHeaderCell}>Item</th>
                    <th className={styles.tableHeaderCell}>Qtd</th>
                    <th className={styles.tableHeaderCell}>Recebido</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidosAprovados.map((pedido) => {
                    const recebidoExistente = recebimento?.itens.find(
                      (item) => item.pedidoId === pedido.id,
                    );
                    const confirmado = receivedOrSelected(
                      adminJaConfirmou,
                      selectedIds.includes(pedido.id),
                      recebidoExistente?.confirmado ?? false,
                    );

                    return (
                      <tr key={pedido.id} className={styles.tableRow}>
                        {!adminJaConfirmou && (
                          <td className={styles.tableCell} style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              className="form-check-input m-0"
                              checked={selectedIds.includes(pedido.id)}
                              onChange={() => togglePedido(pedido.id)}
                              disabled={saving}
                            />
                          </td>
                        )}
                        <td className={`${styles.tableCell} ${styles.cellBold}`}>
                          {pedido.item.nome}
                        </td>
                        <td className={styles.tableCell}>
                          {pedido.qtdSolicitada} {pedido.item.unidadeMedida}
                        </td>
                        <td className={styles.tableCell}>
                          <Badge bg={confirmado ? 'success' : 'danger'}>
                            {confirmado ? 'Recebido' : 'Não recebido'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>

              {!adminJaConfirmou && (
                <>
                  <Form.Group className="mt-3">
                    <Form.Label>Observações (opcional)</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      disabled={saving}
                    />
                  </Form.Group>
                  <div className={styles.actionButtons} style={{ marginTop: '1rem' }}>
                    <Button variant="success" onClick={handleConfirmar} disabled={saving}>
                      {saving ? <Spinner animation="border" size="sm" /> : 'Confirmar Administrativamente'}
                    </Button>
                    <Button
                      variant="outline-secondary"
                      onClick={() => router.push(`/admin/submissoes/${submissao.id}`)}
                      disabled={saving}
                    >
                      Cancelar
                    </Button>
                  </div>
                </>
              )}

              {recebimento && (
                <div className={styles.actionButtons} style={{ marginTop: '1rem' }}>
                  <Button
                    variant="outline-danger"
                    onClick={handleDesfazer}
                    disabled={saving}
                  >
                    {saving ? <Spinner animation="border" size="sm" /> : 'Desfazer Recebimento'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function receivedOrSelected(
  adminJaConfirmou: boolean,
  selected: boolean,
  recebidoExistente: boolean,
) {
  if (adminJaConfirmou) return recebidoExistente;
  return selected;
}
