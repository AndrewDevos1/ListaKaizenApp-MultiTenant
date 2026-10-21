'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert, Badge, Button, Form, Spinner, Table } from 'react-bootstrap';
import { FaCopy, FaWhatsapp } from 'react-icons/fa';
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

function gerarTextoCompartilhamento(
  submissao: SubmissaoDetail,
  recebimento: RecebimentoDetail,
) {
  const linhas = [
    '*RECEBIMENTO CONFIRMADO*',
    `*${submissao.lista.nome}*`,
    `Submissão #${submissao.id}`,
    recebimento.confirmadoEm
      ? `Confirmado em: ${formatDate(recebimento.confirmadoEm)}`
      : null,
    '',
  ].filter(Boolean) as string[];

  recebimento.itens.forEach((item) => {
    const icone = item.confirmado ? '✅' : '❌';
    linhas.push(
      `${icone} ${item.pedido.item.nome}: ${item.pedido.qtdSolicitada} ${item.pedido.item.unidadeMedida}`,
    );
  });

  if (recebimento.observacoes) {
    linhas.push('', `Obs: ${recebimento.observacoes}`);
  }

  return linhas.join('\n');
}

export default function ConfirmarRecebimentoPage() {
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
      const { data: sub } = await api.get(`/v1/collaborator/submissoes/${submissaoId}`);
      setSubmissao(sub);

      try {
        const { data: rec } = await api.get(
          `/v1/collaborator/submissoes/${submissaoId}/recebimento`,
        );
        setRecebimento(rec);
      } catch (err: any) {
        if (err?.response?.status !== 404) {
          throw err;
        }
        setRecebimento(null);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao carregar confirmação de recebimento');
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
      const { data } = await api.post(
        `/v1/collaborator/submissoes/${submissaoId}/recebimento`,
        {
          itensConfirmados: selectedIds,
          observacoes,
        },
      );
      setRecebimento(data);
      setSuccess('Recebimento confirmado com sucesso.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao confirmar recebimento');
    } finally {
      setSaving(false);
    }
  };

  const handleCopiar = async () => {
    if (!submissao || !recebimento) return;
    const texto = gerarTextoCompartilhamento(submissao, recebimento);
    try {
      await navigator.clipboard.writeText(texto);
      setSuccess('Resumo copiado para a área de transferência.');
    } catch {
      setError('Não foi possível copiar automaticamente.');
    }
  };

  const handleWhatsApp = () => {
    if (!submissao || !recebimento) return;
    const texto = gerarTextoCompartilhamento(submissao, recebimento);
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

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <Link href={`/collaborator/submissoes/${submissao.id}`} className={styles.backButton}>
          ← Voltar para Submissão
        </Link>

        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <h1 className={styles.listTitle}>Confirmar Recebimento</h1>
            <div className={styles.listMeta}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Lista:</span>
                {submissao.lista.nome}
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Submissão:</span>
                #{submissao.id}
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

        {recebimento ? (
          <div className={styles.tableSection}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <Badge bg="success">Recebimento já confirmado</Badge>
              {recebimento.confirmadoEm && (
                <span className={styles.cellMuted}>em {formatDate(recebimento.confirmadoEm)}</span>
              )}
            </div>
            <Table striped bordered hover responsive className={styles.table}>
              <thead>
                <tr className={styles.tableHeader}>
                  <th className={styles.tableHeaderCell}>Item</th>
                  <th className={styles.tableHeaderCell}>Qtd</th>
                  <th className={styles.tableHeaderCell}>Recebido</th>
                </tr>
              </thead>
              <tbody>
                {recebimento.itens.map((item) => (
                  <tr key={item.pedidoId} className={styles.tableRow}>
                    <td className={`${styles.tableCell} ${styles.cellBold}`}>
                      {item.pedido.item.nome}
                    </td>
                    <td className={styles.tableCell}>
                      {item.pedido.qtdSolicitada} {item.pedido.item.unidadeMedida}
                    </td>
                    <td className={styles.tableCell}>
                      <Badge bg={item.confirmado ? 'success' : 'danger'}>
                        {item.confirmado ? 'Recebido' : 'Não recebido'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>

            <div className={styles.actionButtons}>
              <Button variant="outline-success" size="sm" onClick={handleWhatsApp}>
                <FaWhatsapp style={{ marginRight: '0.35rem' }} />
                WhatsApp
              </Button>
              <Button variant="outline-secondary" size="sm" onClick={handleCopiar}>
                <FaCopy style={{ marginRight: '0.35rem' }} />
                Copiar
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.tableSection}>
            {pedidosAprovados.length === 0 ? (
              <Alert variant="warning" className="mb-0">
                Esta submissão não possui itens aprovados para recebimento.
              </Alert>
            ) : (
              <>
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

                <Table striped bordered hover responsive className={styles.table}>
                  <thead>
                    <tr className={styles.tableHeader}>
                      <th className={styles.tableHeaderCell} style={{ width: 52 }}>OK</th>
                      <th className={styles.tableHeaderCell}>Item</th>
                      <th className={styles.tableHeaderCell}>Qtd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidosAprovados.map((pedido) => (
                      <tr key={pedido.id} className={styles.tableRow}>
                        <td className={styles.tableCell} style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            className="form-check-input m-0"
                            checked={selectedIds.includes(pedido.id)}
                            onChange={() => togglePedido(pedido.id)}
                            disabled={saving}
                          />
                        </td>
                        <td className={`${styles.tableCell} ${styles.cellBold}`}>
                          {pedido.item.nome}
                        </td>
                        <td className={styles.tableCell}>
                          {pedido.qtdSolicitada} {pedido.item.unidadeMedida}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>

                <Form.Group className="mt-3">
                  <Form.Label>Observações (opcional)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Ex: item X veio com embalagem danificada"
                    disabled={saving}
                  />
                </Form.Group>

                <div className={styles.actionButtons} style={{ marginTop: '1rem' }}>
                  <Button variant="success" onClick={handleConfirmar} disabled={saving}>
                    {saving ? <Spinner animation="border" size="sm" /> : 'Confirmar Recebimento'}
                  </Button>
                  <Button
                    variant="outline-secondary"
                    onClick={() => router.push(`/collaborator/submissoes/${submissao.id}`)}
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
