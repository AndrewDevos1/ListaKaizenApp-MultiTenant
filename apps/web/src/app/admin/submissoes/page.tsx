'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Alert,
  Spinner,
  Badge,
  Button,
  ButtonGroup,
  Modal,
  Form,
  InputGroup,
} from 'react-bootstrap';
import Link from 'next/link';
import api from '@/lib/api';
import styles from '@/app/admin/listas/[id]/ListaDetail.module.css';
import { FaClipboardCheck, FaWhatsapp, FaCopy, FaCheck } from 'react-icons/fa';

type StatusSubmissao = 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'PARCIAL' | 'ARQUIVADO';
type StatusFiltro = 'TODOS' | 'PENDENTE' | 'APROVADO' | 'REJEITADO';
type TipoFiltro = 'TRADICIONAIS' | 'CONSOLIDADAS';
type StatusConsolidado =
  | 'AGUARDANDO_SUBLISTAS'
  | 'PRONTO_PARA_APROVAR'
  | 'APROVADO_PARCIAL'
  | 'APROVADO_COMPLETO'
  | 'EXPIRADO';
type StatusConsolidadoFiltro = 'TODAS' | 'AGUARDANDO' | 'APROVADAS' | 'REJEITADAS';

const TIPO_FILTRO_STORAGE_KEY = 'admin:submissoes:tipoFiltro';
const STATUS_FILTER_STORAGE_KEY = 'admin:submissoes:statusFilter';
const STATUS_CONSOLIDADO_FILTER_STORAGE_KEY =
  'admin:submissoes:statusConsolidadoFilter';
const SHOW_ARCHIVED_STORAGE_KEY = 'admin:submissoes:showArchived';

interface SubmissaoSummary {
  id: number;
  status: StatusSubmissao;
  criadoEm: string;
  arquivada: boolean;
  lista: { id: number; nome: string };
  usuario: { id: number; nome: string; email: string };
  _count: { pedidos: number };
  recebimento?: {
    id: number;
    confirmadoEm: string | null;
    confirmadoAdminEm: string | null;
  } | null;
}

interface MergePreviewItem {
  itemNome: string;
  unidade: string;
  qtdTotal: number;
  breakdown: { submissaoId: number; colaboradorNome: string; qtd: number }[];
}

interface ConsolidadoSummary {
  id: string;
  lista: { id: number; nome: string };
  dataReferencia: string;
  status: StatusConsolidado;
  mensagem: string;
  totalSubmissoes: number;
  totalPedidos: number;
  recebidas: number;
  submissoesParaRecebimento: number[];
  submissoesArquivaveis: number[];
  submissoesDesarquivaveis: number[];
  submissoes: {
    id: number;
    status: StatusSubmissao;
    arquivada: boolean;
    criadoEm: string;
    usuario: { id: number; nome: string; email: string };
    totalPedidos: number;
    hasRecebimento: boolean;
  }[];
}

const STATUS_VARIANT: Record<StatusSubmissao, string> = {
  PENDENTE: 'warning',
  APROVADO: 'success',
  REJEITADO: 'danger',
  PARCIAL: 'info',
  ARQUIVADO: 'secondary',
};

const STATUS_CONSOLIDADO_VARIANT: Record<StatusConsolidado, string> = {
  AGUARDANDO_SUBLISTAS: 'warning',
  PRONTO_PARA_APROVAR: 'primary',
  APROVADO_PARCIAL: 'info',
  APROVADO_COMPLETO: 'success',
  EXPIRADO: 'dark',
};

const STATUS_CONSOLIDADO_LABEL: Record<StatusConsolidado, string> = {
  AGUARDANDO_SUBLISTAS: 'Aguardando',
  PRONTO_PARA_APROVAR: 'Pronto',
  APROVADO_PARCIAL: 'Aprovado Parcial',
  APROVADO_COMPLETO: 'Aprovado Completo',
  EXPIRADO: 'Expirado',
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

export default function AdminSubmissoesPage() {
  const [submissoes, setSubmissoes] = useState<SubmissaoSummary[]>([]);
  const [consolidadas, setConsolidadas] = useState<ConsolidadoSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>('TRADICIONAIS');
  const [tipoFiltroHydrated, setTipoFiltroHydrated] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFiltro>('PENDENTE');
  const [statusConsolidadoFilter, setStatusConsolidadoFilter] =
    useState<StatusConsolidadoFiltro>('AGUARDANDO');
  const [showArchived, setShowArchived] = useState(false);
  const [rowActionLoading, setRowActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Merge state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeStep, setMergeStep] = useState<1 | 2 | 3>(1);
  const [mergeTitulo, setMergeTitulo] = useState('');
  const [mergePreview, setMergePreview] = useState<MergePreviewItem[]>([]);
  const [mergeTexto, setMergeTexto] = useState('');
  const [mergeLoading, setMergeLoading] = useState(false);
  const [mergeError, setMergeError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  const fetchSubmissoes = async (status: StatusFiltro, arquivada: boolean) => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { arquivada: String(arquivada) };
      if (status !== 'TODOS') {
        params.status = status;
      }
      const { data } = await api.get('/v1/admin/submissoes', { params });
      setSubmissoes(data);
    } catch {
      setError('Erro ao carregar submissões');
    } finally {
      setLoading(false);
    }
  };

  const fetchConsolidadas = async (arquivada: boolean) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/v1/admin/submissoes', {
        params: { tipo: 'CONSOLIDADAS', arquivada: String(arquivada) },
      });
      setConsolidadas(data);
    } catch {
      setError('Erro ao carregar submissões consolidadas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedTipoFiltro = window.localStorage.getItem(TIPO_FILTRO_STORAGE_KEY);
    if (storedTipoFiltro === 'TRADICIONAIS' || storedTipoFiltro === 'CONSOLIDADAS') {
      setTipoFiltro(storedTipoFiltro);
    }

    const storedStatusFilter = window.localStorage.getItem(STATUS_FILTER_STORAGE_KEY);
    if (
      storedStatusFilter === 'TODOS' ||
      storedStatusFilter === 'PENDENTE' ||
      storedStatusFilter === 'APROVADO' ||
      storedStatusFilter === 'REJEITADO'
    ) {
      setStatusFilter(storedStatusFilter);
    }

    const storedStatusConsolidado = window.localStorage.getItem(
      STATUS_CONSOLIDADO_FILTER_STORAGE_KEY,
    );
    if (
      storedStatusConsolidado === 'TODAS' ||
      storedStatusConsolidado === 'AGUARDANDO' ||
      storedStatusConsolidado === 'APROVADAS' ||
      storedStatusConsolidado === 'REJEITADAS'
    ) {
      setStatusConsolidadoFilter(storedStatusConsolidado);
    }

    const storedShowArchived = window.localStorage.getItem(SHOW_ARCHIVED_STORAGE_KEY);
    if (storedShowArchived === 'true' || storedShowArchived === 'false') {
      setShowArchived(storedShowArchived === 'true');
    }

    setTipoFiltroHydrated(true);
  }, []);

  useEffect(() => {
    if (!tipoFiltroHydrated) return;
    if (tipoFiltro === 'CONSOLIDADAS') {
      fetchConsolidadas(showArchived);
      setSelectedIds(new Set());
      return;
    }
    fetchSubmissoes(statusFilter, showArchived);
    setSelectedIds(new Set());
  }, [statusFilter, showArchived, tipoFiltro, tipoFiltroHydrated]);

  const execSubmissaoAction = async (
    key: string,
    fn: () => Promise<void>,
    fallbackError: string,
  ) => {
    setError('');
    setRowActionLoading(key);
    try {
      await fn();
      if (tipoFiltro === 'CONSOLIDADAS') {
        await fetchConsolidadas(showArchived);
      } else {
        await fetchSubmissoes(statusFilter, showArchived);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || fallbackError);
    } finally {
      setRowActionLoading(null);
    }
  };

  const handleAprovarSubmissao = async (id: number) => {
    await execSubmissaoAction(
      `aprovar-${id}`,
      () => api.post(`/v1/admin/submissoes/${id}/aprovar`),
      'Erro ao aprovar submissão',
    );
  };

  const handleRejeitarSubmissao = async (id: number) => {
    if (!confirm('Rejeitar todos os pedidos pendentes desta submissão?')) return;
    await execSubmissaoAction(
      `rejeitar-${id}`,
      () => api.post(`/v1/admin/submissoes/${id}/rejeitar`),
      'Erro ao rejeitar submissão',
    );
  };

  const handleReverterSubmissao = async (id: number) => {
    if (!confirm('Reverter esta submissão para PENDENTE?')) return;
    await execSubmissaoAction(
      `reverter-${id}`,
      () => api.put(`/v1/admin/submissoes/${id}/reverter`),
      'Erro ao reverter submissão',
    );
  };

  const handleArquivar = async (id: number) => {
    if (!confirm('Arquivar esta submissão?')) return;
    await execSubmissaoAction(
      `arquivar-${id}`,
      () => api.put(`/v1/admin/submissoes/${id}/arquivar`),
      'Erro ao arquivar submissão',
    );
  };

  const handleDesarquivar = async (id: number) => {
    if (!confirm('Desarquivar esta submissão?')) return;
    await execSubmissaoAction(
      `desarquivar-${id}`,
      () => api.put(`/v1/admin/submissoes/${id}/desarquivar`),
      'Erro ao desarquivar submissão',
    );
  };

  const handleArquivarConsolidada = async (lote: ConsolidadoSummary) => {
    if (!lote.submissoesArquivaveis.length) return;
    if (
      !confirm(
        `Arquivar ${lote.submissoesArquivaveis.length} submissão(ões) deste lote consolidado?`,
      )
    ) {
      return;
    }
    setError('');
    setRowActionLoading(`arquivar-consolidada-${lote.id}`);
    try {
      const results = await Promise.allSettled(
        lote.submissoesArquivaveis.map((id) =>
          api.put(`/v1/admin/submissoes/${id}/arquivar`),
        ),
      );
      const failures = results.filter(
        (result) => result.status === 'rejected',
      ).length;
      if (failures > 0) {
        setError(
          `${failures} submissão(ões) não puderam ser arquivadas neste lote.`,
        );
      }
      await fetchConsolidadas(showArchived);
    } catch {
      setError('Erro ao arquivar lote consolidado');
    } finally {
      setRowActionLoading(null);
    }
  };

  const handleDesarquivarConsolidada = async (lote: ConsolidadoSummary) => {
    if (!lote.submissoesDesarquivaveis.length) return;
    if (
      !confirm(
        `Desarquivar ${lote.submissoesDesarquivaveis.length} submissão(ões) deste lote consolidado?`,
      )
    ) {
      return;
    }
    setError('');
    setRowActionLoading(`desarquivar-consolidada-${lote.id}`);
    try {
      const results = await Promise.allSettled(
        lote.submissoesDesarquivaveis.map((id) =>
          api.put(`/v1/admin/submissoes/${id}/desarquivar`),
        ),
      );
      const failures = results.filter(
        (result) => result.status === 'rejected',
      ).length;
      if (failures > 0) {
        setError(
          `${failures} submissão(ões) não puderam ser desarquivadas neste lote.`,
        );
      }
      await fetchConsolidadas(showArchived);
    } catch {
      setError('Erro ao desarquivar lote consolidado');
    } finally {
      setRowActionLoading(null);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allFilteredSelected = filteredSubmissoes.every((s) => selectedIds.has(s.id));
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSubmissoes.map((s) => s.id)));
    }
  };

  const openMergeModal = () => {
    setMergeStep(1);
    setMergeTitulo('');
    setMergePreview([]);
    setMergeTexto('');
    setMergeError('');
    setCopySuccess(false);
    setShowMergeModal(true);
  };

  const closeMergeModal = () => {
    setShowMergeModal(false);
    setSelectedIds(new Set());
  };

  const handleGerarPreview = async () => {
    setMergeLoading(true);
    setMergeError('');
    try {
      const { data } = await api.post('/v1/admin/submissoes/merge-preview', {
        submissaoIds: Array.from(selectedIds),
      });
      setMergePreview(data);
      setMergeStep(2);
    } catch (err: any) {
      setMergeError(err?.response?.data?.message || 'Erro ao gerar preview');
    } finally {
      setMergeLoading(false);
    }
  };

  const handleGerarTexto = async () => {
    setMergeLoading(true);
    setMergeError('');
    try {
      const body: { submissaoIds: number[]; titulo?: string } = {
        submissaoIds: Array.from(selectedIds),
      };
      if (mergeTitulo.trim()) body.titulo = mergeTitulo.trim();
      const { data } = await api.post('/v1/admin/submissoes/merge-whatsapp', body);
      setMergeTexto(data.texto);
      setMergeStep(3);
    } catch (err: any) {
      setMergeError(err?.response?.data?.message || 'Erro ao gerar texto');
    } finally {
      setMergeLoading(false);
    }
  };

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(mergeTexto);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    } catch {
      setMergeError('Não foi possível copiar. Selecione o texto manualmente.');
    }
  };

  const selectedSubmissoes = submissoes.filter((s) => selectedIds.has(s.id));

  const filteredSubmissoes = useMemo(() => {
    if (!searchQuery.trim()) return submissoes;
    const q = searchQuery.toLowerCase();
    return submissoes.filter(
      (s) =>
        s.lista.nome.toLowerCase().includes(q) ||
        s.usuario.nome.toLowerCase().includes(q) ||
        s.status.toLowerCase().includes(q) ||
        formatDate(s.criadoEm).toLowerCase().includes(q) ||
        s.criadoEm.toLowerCase().includes(q) ||
        String(s.id).includes(q),
    );
  }, [submissoes, searchQuery]);

  const filteredConsolidadas = useMemo(() => {
    const byStatus = consolidadas.filter((lote) => {
      if (statusConsolidadoFilter === 'TODAS') return true;
      if (statusConsolidadoFilter === 'AGUARDANDO') {
        return (
          lote.status === 'AGUARDANDO_SUBLISTAS' ||
          lote.status === 'PRONTO_PARA_APROVAR' ||
          lote.status === 'APROVADO_PARCIAL'
        );
      }
      if (statusConsolidadoFilter === 'APROVADAS') {
        return lote.status === 'APROVADO_COMPLETO';
      }
      return lote.status === 'EXPIRADO';
    });

    if (!searchQuery.trim()) return byStatus;
    const q = searchQuery.toLowerCase();
    return byStatus.filter(
      (lote) =>
        lote.lista.nome.toLowerCase().includes(q) ||
        lote.status.toLowerCase().includes(q) ||
        STATUS_CONSOLIDADO_LABEL[lote.status].toLowerCase().includes(q) ||
        lote.mensagem.toLowerCase().includes(q) ||
        formatDate(lote.dataReferencia).toLowerCase().includes(q) ||
        lote.id.toLowerCase().includes(q),
    );
  }, [consolidadas, searchQuery, statusConsolidadoFilter]);

  const handleStatusFilterChange = (nextStatus: StatusFiltro) => {
    setStatusFilter(nextStatus);
    window.localStorage.setItem(STATUS_FILTER_STORAGE_KEY, nextStatus);
  };

  const handleStatusConsolidadoFilterChange = (
    nextStatus: StatusConsolidadoFiltro,
  ) => {
    setStatusConsolidadoFilter(nextStatus);
    window.localStorage.setItem(
      STATUS_CONSOLIDADO_FILTER_STORAGE_KEY,
      nextStatus,
    );
  };

  const handleToggleArchived = () => {
    const nextShowArchived = !showArchived;
    setShowArchived(nextShowArchived);
    window.localStorage.setItem(
      SHOW_ARCHIVED_STORAGE_KEY,
      String(nextShowArchived),
    );
    if (nextShowArchived) {
      setStatusFilter('TODOS');
      setStatusConsolidadoFilter('TODAS');
      window.localStorage.setItem(STATUS_FILTER_STORAGE_KEY, 'TODOS');
      window.localStorage.setItem(
        STATUS_CONSOLIDADO_FILTER_STORAGE_KEY,
        'TODAS',
      );
    }
    setSearchQuery('');
    setSelectedIds(new Set());
  };

  const handleTipoFiltroChange = (nextTipo: TipoFiltro) => {
    if (nextTipo === tipoFiltro) return;
    setTipoFiltro(nextTipo);
    window.localStorage.setItem(TIPO_FILTRO_STORAGE_KEY, nextTipo);
    setSearchQuery('');
    setSelectedIds(new Set());
    setError('');
    setShowMergeModal(false);
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className={styles.listTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FaClipboardCheck /> Submissões
            </h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              Gerencie as submissões de estoque dos colaboradores
            </p>
          </div>
          {tipoFiltro === 'TRADICIONAIS' && !showArchived && selectedIds.size > 0 && (
            <Button variant="success" onClick={openMergeModal}>
              <FaWhatsapp style={{ marginRight: '0.4rem' }} />
              Merge WhatsApp ({selectedIds.size} selecionada{selectedIds.size !== 1 ? 's' : ''})
            </Button>
          )}
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <div className={styles.tableSection}>
          <div style={{ marginBottom: '0.9rem' }}>
            <ButtonGroup>
              <Button
                size="sm"
                variant={tipoFiltro === 'TRADICIONAIS' ? 'primary' : 'outline-primary'}
                onClick={() => handleTipoFiltroChange('TRADICIONAIS')}
              >
                Submissões
              </Button>
              <Button
                size="sm"
                variant={tipoFiltro === 'CONSOLIDADAS' ? 'primary' : 'outline-primary'}
                onClick={() => handleTipoFiltroChange('CONSOLIDADAS')}
              >
                Consolidadas
              </Button>
            </ButtonGroup>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              marginBottom: '0.8rem',
            }}
          >
            {tipoFiltro === 'CONSOLIDADAS' ? (
              <ButtonGroup>
                <Button
                  size="sm"
                  variant={
                    statusConsolidadoFilter === 'TODAS'
                      ? 'primary'
                      : 'outline-primary'
                  }
                  onClick={() => handleStatusConsolidadoFilterChange('TODAS')}
                >
                  Todas
                </Button>
                <Button
                  size="sm"
                  variant={
                    statusConsolidadoFilter === 'AGUARDANDO'
                      ? 'warning'
                      : 'outline-warning'
                  }
                  onClick={() => handleStatusConsolidadoFilterChange('AGUARDANDO')}
                >
                  Aguardando
                </Button>
                <Button
                  size="sm"
                  variant={
                    statusConsolidadoFilter === 'APROVADAS'
                      ? 'success'
                      : 'outline-success'
                  }
                  onClick={() => handleStatusConsolidadoFilterChange('APROVADAS')}
                >
                  Aprovadas
                </Button>
                <Button
                  size="sm"
                  variant={
                    statusConsolidadoFilter === 'REJEITADAS'
                      ? 'dark'
                      : 'outline-dark'
                  }
                  onClick={() => handleStatusConsolidadoFilterChange('REJEITADAS')}
                >
                  Rejeitadas
                </Button>
              </ButtonGroup>
            ) : (
              <ButtonGroup>
                <Button
                  size="sm"
                  variant={statusFilter === 'TODOS' ? 'primary' : 'outline-primary'}
                  onClick={() => handleStatusFilterChange('TODOS')}
                >
                  Todos
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'PENDENTE' ? 'warning' : 'outline-warning'}
                  onClick={() => handleStatusFilterChange('PENDENTE')}
                >
                  Pendente
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'APROVADO' ? 'success' : 'outline-success'}
                  onClick={() => handleStatusFilterChange('APROVADO')}
                >
                  Aprovados
                </Button>
                <Button
                  size="sm"
                  variant={statusFilter === 'REJEITADO' ? 'danger' : 'outline-danger'}
                  onClick={() => handleStatusFilterChange('REJEITADO')}
                >
                  Rejeitados
                </Button>
              </ButtonGroup>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <span
                style={{
                  fontSize: '0.9rem',
                  color: !showArchived
                    ? 'var(--text-primary)'
                    : 'var(--text-secondary)',
                }}
              >
                Ativas
              </span>
              <Form.Check
                type="switch"
                id="submissoes-arquivadas-switch"
                checked={showArchived}
                onChange={handleToggleArchived}
                aria-label="Alternar entre ativas e arquivadas"
                style={{ marginBottom: 0 }}
              />
              <span
                style={{
                  fontSize: '0.9rem',
                  color: showArchived
                    ? 'var(--text-primary)'
                    : 'var(--text-secondary)',
                }}
              >
                Arquivadas
              </span>
            </div>
          </div>

          <div style={{ marginBottom: '1rem', maxWidth: 520 }}>
            <InputGroup size="sm">
              <Form.Control
                type="text"
                placeholder={
                  tipoFiltro === 'CONSOLIDADAS'
                    ? 'Buscar por lista consolidada, data, status ou chave...'
                    : 'Buscar por lista, colaborador, data/hora, status ou #id...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <Button variant="outline-secondary" onClick={() => setSearchQuery('')}>
                  Limpar
                </Button>
              )}
            </InputGroup>
            {searchQuery && (
              <small className="text-muted">
                {tipoFiltro === 'CONSOLIDADAS'
                  ? `${filteredConsolidadas.length} resultado${
                      filteredConsolidadas.length !== 1 ? 's' : ''
                    }`
                  : `${filteredSubmissoes.length} resultado${
                      filteredSubmissoes.length !== 1 ? 's' : ''
                    }`}
              </small>
            )}
          </div>

          {showArchived && (
            <Alert variant="secondary" className="py-2">
              Modo Arquivadas ativo. Altere a chave para voltar às submissões ativas.
            </Alert>
          )}

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
            </div>
          ) : tipoFiltro === 'CONSOLIDADAS' ? (
            <div className={styles.tableWrapper}>
              <Table striped bordered hover responsive className={styles.table}>
                <thead>
                  <tr className={styles.tableHeader}>
                    <th className={styles.tableHeaderCell}>#</th>
                    <th className={styles.tableHeaderCell}>Lista Consolidada</th>
                    <th className={styles.tableHeaderCell}>Submissões</th>
                    <th className={styles.tableHeaderCell}>Data</th>
                    <th className={styles.tableHeaderCell}>Status</th>
                    <th className={styles.tableHeaderCell}>Mensagem</th>
                    <th className={styles.tableHeaderCell}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConsolidadas.map((lote) => {
                    const primeiraSubmissao = lote.submissoes[0];
                    const podeArquivar =
                      !showArchived && lote.submissoesArquivaveis.length > 0;
                    const podeDesarquivar =
                      showArchived && lote.submissoesDesarquivaveis.length > 0;
                    return (
                      <tr key={lote.id} className={styles.tableRow}>
                        <td className={styles.tableCell}>{lote.id}</td>
                        <td className={`${styles.tableCell} ${styles.cellBold}`}>
                          {lote.lista.nome}
                        </td>
                        <td className={styles.tableCell}>
                          <div>
                            <div>{lote.totalSubmissoes} submissão(ões)</div>
                            <small className="text-muted">
                              {lote.recebidas}/{lote.totalSubmissoes} com recebimento
                            </small>
                          </div>
                        </td>
                        <td className={styles.tableCell}>
                          {formatDate(lote.dataReferencia)}
                        </td>
                        <td className={styles.tableCell}>
                          <Badge
                            bg={STATUS_CONSOLIDADO_VARIANT[lote.status] ?? 'secondary'}
                          >
                            {STATUS_CONSOLIDADO_LABEL[lote.status]}
                          </Badge>
                        </td>
                        <td className={styles.tableCell}>{lote.mensagem}</td>
                        <td className={styles.tableCell}>
                          <div className={styles.actionButtons}>
                            {primeiraSubmissao ? (
                              <Link href={`/admin/submissoes/${primeiraSubmissao.id}`}>
                                <Button size="sm" variant="outline-primary">
                                  Ver
                                </Button>
                              </Link>
                            ) : null}

                            {lote.submissoesParaRecebimento.length > 0 ? (
                              <Link
                                href={`/admin/submissoes/${lote.submissoesParaRecebimento[0]}/recebimento`}
                              >
                                <Button size="sm" variant="outline-success">
                                  Recebimento
                                </Button>
                              </Link>
                            ) : lote.recebidas > 0 ? (
                              <Badge bg="success">Recebidos</Badge>
                            ) : (
                              <Badge bg="secondary">Sem recebimento</Badge>
                            )}

                            {podeArquivar && (
                              <Button
                                size="sm"
                                variant="outline-secondary"
                                onClick={() => handleArquivarConsolidada(lote)}
                                disabled={rowActionLoading !== null}
                              >
                                {rowActionLoading ===
                                `arquivar-consolidada-${lote.id}` ? (
                                  <Spinner animation="border" size="sm" />
                                ) : (
                                  'Arquivar lote'
                                )}
                              </Button>
                            )}

                            {podeDesarquivar && (
                              <Button
                                size="sm"
                                variant="outline-warning"
                                onClick={() => handleDesarquivarConsolidada(lote)}
                                disabled={rowActionLoading !== null}
                              >
                                {rowActionLoading ===
                                `desarquivar-consolidada-${lote.id}` ? (
                                  <Spinner animation="border" size="sm" />
                                ) : (
                                  'Desarquivar lote'
                                )}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredConsolidadas.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-4">
                        {searchQuery
                          ? 'Nenhum lote consolidado encontrado para essa busca'
                          : 'Nenhum lote consolidado encontrado'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <Table striped bordered hover responsive className={styles.table}>
                <thead>
                  <tr className={styles.tableHeader}>
                    <th className={styles.tableHeaderCell} style={{ width: '2.5rem' }}>
                      <Form.Check
                        type="checkbox"
                        checked={
                          filteredSubmissoes.length > 0 &&
                          filteredSubmissoes.every((s) => selectedIds.has(s.id))
                        }
                        onChange={toggleSelectAll}
                        aria-label="Selecionar todas"
                      />
                    </th>
                    <th className={styles.tableHeaderCell}>#</th>
                    <th className={styles.tableHeaderCell}>Lista</th>
                    <th className={styles.tableHeaderCell}>Colaborador</th>
                    <th className={styles.tableHeaderCell}>Data</th>
                    <th className={styles.tableHeaderCell}>Nº Pedidos</th>
                    <th className={styles.tableHeaderCell}>Status</th>
                    <th className={styles.tableHeaderCell}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissoes.map((s) => (
                    <tr key={s.id} className={styles.tableRow}>
                      <td className={styles.tableCell}>
                        <Form.Check
                          type="checkbox"
                          checked={selectedIds.has(s.id)}
                          onChange={() => toggleSelect(s.id)}
                          aria-label={`Selecionar submissão ${s.id}`}
                        />
                      </td>
                      <td className={styles.tableCell}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          {s.id}
                          {s.recebimento?.id ? (
                            <FaCheck
                              title="Recebimento confirmado"
                              aria-label="Recebimento confirmado"
                              style={{ color: '#28a745', fontSize: '0.85rem' }}
                            />
                          ) : null}
                        </span>
                      </td>
                      <td className={`${styles.tableCell} ${styles.cellBold}`}>
                        {s.lista.nome}
                      </td>
                      <td className={styles.tableCell}>{s.usuario.nome}</td>
                      <td className={styles.tableCell}>{formatDate(s.criadoEm)}</td>
                      <td className={styles.tableCell}>{s._count.pedidos}</td>
                      <td className={styles.tableCell}>
                        <Badge bg={STATUS_VARIANT[s.status as StatusSubmissao] ?? 'secondary'}>
                          {s.status}
                        </Badge>
                      </td>
                      <td className={styles.tableCell}>
                        <div className={styles.actionButtons}>
                          <Link href={`/admin/submissoes/${s.id}`}>
                            <Button size="sm" variant="outline-primary">
                              Ver
                            </Button>
                          </Link>

                          {!s.arquivada && s.status === 'PENDENTE' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline-success"
                                onClick={() => handleAprovarSubmissao(s.id)}
                                disabled={rowActionLoading !== null}
                              >
                                {rowActionLoading === `aprovar-${s.id}` ? (
                                  <Spinner animation="border" size="sm" />
                                ) : (
                                  'Aprovar'
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-danger"
                                onClick={() => handleRejeitarSubmissao(s.id)}
                                disabled={rowActionLoading !== null}
                              >
                                {rowActionLoading === `rejeitar-${s.id}` ? (
                                  <Spinner animation="border" size="sm" />
                                ) : (
                                  'Rejeitar'
                                )}
                              </Button>
                            </>
                          )}

                          {!s.arquivada && s.status !== 'PENDENTE' && (
                            <Button
                              size="sm"
                              variant="outline-warning"
                              onClick={() => handleReverterSubmissao(s.id)}
                              disabled={rowActionLoading !== null}
                            >
                              {rowActionLoading === `reverter-${s.id}` ? (
                                <Spinner animation="border" size="sm" />
                              ) : (
                                'Reverter'
                              )}
                            </Button>
                          )}

                          {!s.arquivada && (
                            <Button
                              size="sm"
                              variant="outline-secondary"
                              onClick={() => handleArquivar(s.id)}
                              disabled={rowActionLoading !== null}
                            >
                              {rowActionLoading === `arquivar-${s.id}` ? (
                                <Spinner animation="border" size="sm" />
                              ) : (
                                'Arquivar'
                              )}
                            </Button>
                          )}

                          {s.arquivada && (
                            <Button
                              size="sm"
                              variant="outline-warning"
                              onClick={() => handleDesarquivar(s.id)}
                              disabled={rowActionLoading !== null}
                            >
                              {rowActionLoading === `desarquivar-${s.id}` ? (
                                <Spinner animation="border" size="sm" />
                              ) : (
                                'Desarquivar'
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredSubmissoes.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-4">
                        {searchQuery
                          ? 'Nenhuma submissão encontrada para essa busca'
                          : 'Nenhuma submissão encontrada'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Merge WhatsApp */}
      <Modal show={showMergeModal} onHide={closeMergeModal} size="lg" backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaWhatsapp style={{ marginRight: '0.5rem', color: '#25D366' }} />
            Merge WhatsApp
            {mergeStep === 1 && ' — Etapa 1: Confirmar'}
            {mergeStep === 2 && ' — Etapa 2: Preview'}
            {mergeStep === 3 && ' — Etapa 3: Texto Gerado'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {mergeError && (
            <Alert variant="danger" dismissible onClose={() => setMergeError('')}>
              {mergeError}
            </Alert>
          )}

          {/* Etapa 1 */}
          {mergeStep === 1 && (
            <div>
              <p className="text-muted mb-3">
                As seguintes submissões serão consolidadas:
              </p>
              <Table bordered size="sm" className="mb-3">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Lista</th>
                    <th>Colaborador</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSubmissoes.map((s) => (
                    <tr key={s.id}>
                      <td>{s.id}</td>
                      <td>{s.lista.nome}</td>
                      <td>{s.usuario.nome}</td>
                      <td>{formatDate(s.criadoEm)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <Form.Group>
                <Form.Label>Título do pedido (opcional)</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ex: Pedido Semanal — Cozinha"
                  value={mergeTitulo}
                  onChange={(e) => setMergeTitulo(e.target.value)}
                />
              </Form.Group>
            </div>
          )}

          {/* Etapa 2 */}
          {mergeStep === 2 && (
            <div>
              <p className="text-muted mb-3">
                Consolidação de <strong>{mergePreview.length}</strong> item(s) das submissões selecionadas:
              </p>
              <div style={{ overflowX: 'auto' }}>
                <Table bordered size="sm">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Unidade</th>
                      <th>Qtd Total</th>
                      <th>Breakdown</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mergePreview.map((item, idx) => (
                      <tr key={idx}>
                        <td><strong>{item.itemNome}</strong></td>
                        <td>{item.unidade}</td>
                        <td><Badge bg="primary">{item.qtdTotal}</Badge></td>
                        <td style={{ fontSize: '0.85rem', color: '#666' }}>
                          {item.breakdown.map((b) => `${b.colaboradorNome}: ${b.qtd}`).join(' | ')}
                        </td>
                      </tr>
                    ))}
                    {mergePreview.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center text-muted">
                          Nenhum item encontrado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </div>
          )}

          {/* Etapa 3 */}
          {mergeStep === 3 && (
            <div>
              <p className="text-muted mb-2">
                Texto pronto para envio via WhatsApp:
              </p>
              <Form.Control
                as="textarea"
                rows={12}
                readOnly
                value={mergeTexto}
                style={{ fontFamily: 'monospace', fontSize: '0.9rem', backgroundColor: '#f8f9fa' }}
              />
              {copySuccess && (
                <Alert variant="success" className="mt-2 mb-0 py-2">
                  Texto copiado para a área de transferência!
                </Alert>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeMergeModal}>
            Fechar
          </Button>
          {mergeStep === 1 && (
            <Button variant="primary" onClick={handleGerarPreview} disabled={mergeLoading}>
              {mergeLoading ? <Spinner animation="border" size="sm" /> : 'Gerar Preview'}
            </Button>
          )}
          {mergeStep === 2 && (
            <>
              <Button variant="outline-secondary" onClick={() => setMergeStep(1)} disabled={mergeLoading}>
                Voltar
              </Button>
              <Button variant="success" onClick={handleGerarTexto} disabled={mergeLoading}>
                {mergeLoading ? <Spinner animation="border" size="sm" /> : (
                  <><FaWhatsapp style={{ marginRight: '0.4rem' }} />Gerar Texto</>
                )}
              </Button>
            </>
          )}
          {mergeStep === 3 && (
            <Button variant="primary" onClick={handleCopiar}>
              <FaCopy style={{ marginRight: '0.4rem' }} />
              Copiar para Área de Transferência
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
}
