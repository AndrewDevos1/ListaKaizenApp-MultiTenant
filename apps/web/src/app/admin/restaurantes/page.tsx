'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  Modal,
  Row,
  Spinner,
  Table,
} from 'react-bootstrap';
import {
  FaCopy,
  FaDownload,
  FaEdit,
  FaLink,
  FaPause,
  FaPlay,
  FaPlus,
  FaPowerOff,
  FaSync,
  FaTrash,
  FaUpload,
  FaUserLock,
  FaUsers,
  FaWhatsapp,
} from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Restaurantes.module.css';

interface Restaurante {
  id: number;
  nome: string;
  cnpj: string | null;
  ativo: boolean;
  criadoEm?: string | null;
  adminPrincipalEmail?: string | null;
  adminPrincipalNome?: string | null;
  _count: { usuarios: number };
}

interface UsuarioRestaurante {
  id: number;
  nome: string;
  email: string;
  role: string;
  ativo: boolean;
  aprovado: boolean;
  criadoEm: string;
}

interface Convite {
  id: number;
  token: string;
  email: string | null;
  role: string;
  usado: boolean;
  expiresAt: string;
  criadoEm: string;
}

interface LogsResponseItem {
  id: number;
  acao: string;
  entidade: string | null;
  usuarioId: number | null;
  restauranteId: number | null;
  criadoEm: string;
  restauranteNome?: string | null;
  usuarioNome?: string | null;
}

interface LogsResponse {
  data: LogsResponseItem[];
  total: number;
  page: number;
  pages: number;
}

interface ResumoRestore {
  sucesso: true;
  restaurante: string;
  usuarios: { criados: number; ignorados: number };
  fornecedores: { criados: number; ignorados: number };
  itens: { criados: number; ignorados: number };
  listas: { criadas: number; ignoradas: number };
  listaItemRefs: { criados: number; ignorados: number };
}

const PRODUCTION_URL = 'https://kaizen-compras.up.railway.app';

const EMPTY_FORM = { nome: '', cnpj: '' };
const EMPTY_LOG_FILTERS = {
  restauranteId: '',
  usuarioId: '',
  acao: '',
  entidade: '',
  startDate: '',
  endDate: '',
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function slugify(input: string) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function copiarTexto(texto: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      // fallback below
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = texto;
  textarea.style.position = 'fixed';
  textarea.style.top = '-1000px';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

export default function AdminRestaurantesPage() {
  const { isSuperAdmin } = useAuth();
  const router = useRouter();

  const [restaurantes, setRestaurantes] = useState<Restaurante[]>([]);
  const [loadingRestaurantes, setLoadingRestaurantes] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showRestauranteModal, setShowRestauranteModal] = useState(false);
  const [editingRestaurante, setEditingRestaurante] = useState<Restaurante | null>(null);
  const [restauranteForm, setRestauranteForm] = useState(EMPTY_FORM);
  const [savingRestaurante, setSavingRestaurante] = useState(false);

  const [showFirstConfirmModal, setShowFirstConfirmModal] = useState(false);
  const [showSecondConfirmModal, setShowSecondConfirmModal] = useState(false);
  const [restauranteToDeactivate, setRestauranteToDeactivate] = useState<Restaurante | null>(null);
  const [confirmationText, setConfirmationText] = useState('');
  const [deactivateLoading, setDeactivateLoading] = useState<number | null>(null);

  const [backupLoadingId, setBackupLoadingId] = useState<number | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<Restaurante | null>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [restoreResult, setRestoreResult] = useState<ResumoRestore | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [credentialsRestaurante, setCredentialsRestaurante] = useState<Restaurante | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  const [showUsersModal, setShowUsersModal] = useState(false);
  const [usersRestaurante, setUsersRestaurante] = useState<Restaurante | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioRestaurante[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [resetSenhaLoadingId, setResetSenhaLoadingId] = useState<number | null>(null);

  const [showAlterarSenhaModal, setShowAlterarSenhaModal] = useState(false);
  const [usuarioAlterarSenha, setUsuarioAlterarSenha] = useState<UsuarioRestaurante | null>(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [savingNovaSenha, setSavingNovaSenha] = useState(false);

  const [selectedRestauranteConviteId, setSelectedRestauranteConviteId] = useState<string>('');
  const [convites, setConvites] = useState<Convite[]>([]);
  const [loadingConvites, setLoadingConvites] = useState(false);
  const [gerandoConvite, setGerandoConvite] = useState(false);
  const [conviteEmail, setConviteEmail] = useState('');
  const [conviteRole, setConviteRole] = useState<'COLLABORATOR' | 'ADMIN'>('COLLABORATOR');
  const [conviteDias, setConviteDias] = useState(7);
  const [linkConviteGerado, setLinkConviteGerado] = useState('');
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [revogandoConviteId, setRevogandoConviteId] = useState<number | null>(null);

  const [logs, setLogs] = useState<LogsResponseItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState('');
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsFilters, setLogsFilters] = useState(EMPTY_LOG_FILTERS);

  const selectedRestauranteConvite = useMemo(
    () => restaurantes.find((restaurante) => restaurante.id === Number(selectedRestauranteConviteId)) ?? null,
    [restaurantes, selectedRestauranteConviteId],
  );

  const loadRestaurantes = useCallback(async () => {
    setLoadingRestaurantes(true);
    setError('');
    try {
      const response = await api.get<Restaurante[]>('/restaurantes');
      setRestaurantes(response.data);
      if (!selectedRestauranteConviteId && response.data.length > 0) {
        setSelectedRestauranteConviteId(String(response.data[0].id));
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro ao carregar restaurantes');
    } finally {
      setLoadingRestaurantes(false);
    }
  }, [selectedRestauranteConviteId]);

  const loadConvites = useCallback(async () => {
    if (!selectedRestauranteConviteId) {
      setConvites([]);
      return;
    }
    setLoadingConvites(true);
    try {
      const response = await api.get<Convite[]>('/v1/admin/convites', {
        params: { restauranteId: selectedRestauranteConviteId },
      });
      setConvites(response.data);
    } catch {
      setConvites([]);
    } finally {
      setLoadingConvites(false);
    }
  }, [selectedRestauranteConviteId]);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    setLogsError('');
    try {
      const params: Record<string, string | number> = { page: 1, limit: 100 };
      if (logsFilters.restauranteId) params.restauranteId = logsFilters.restauranteId;
      if (logsFilters.usuarioId) params.usuarioId = logsFilters.usuarioId;
      if (logsFilters.acao) params.acao = logsFilters.acao;
      if (logsFilters.entidade) params.entidade = logsFilters.entidade;
      if (logsFilters.startDate) params.startDate = logsFilters.startDate;
      if (logsFilters.endDate) params.endDate = logsFilters.endDate;

      const response = await api.get<LogsResponse>('/v1/admin/logs', { params });
      setLogs(response.data.data);
      setLogsTotal(response.data.total);
    } catch (err: any) {
      setLogs([]);
      setLogsTotal(0);
      setLogsError(err?.response?.data?.message ?? 'Erro ao carregar logs');
    } finally {
      setLogsLoading(false);
    }
  }, [logsFilters]);

  useEffect(() => {
    if (!isSuperAdmin) {
      router.replace('/admin/dashboard');
      return;
    }
    void loadRestaurantes();
  }, [isSuperAdmin, loadRestaurantes, router]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    void loadConvites();
  }, [isSuperAdmin, loadConvites]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    void loadLogs();
  }, [isSuperAdmin, loadLogs]);

  if (!isSuperAdmin) return null;

  const openCreateModal = () => {
    setEditingRestaurante(null);
    setRestauranteForm(EMPTY_FORM);
    setShowRestauranteModal(true);
  };

  const openEditModal = (restaurante: Restaurante) => {
    setEditingRestaurante(restaurante);
    setRestauranteForm({
      nome: restaurante.nome,
      cnpj: restaurante.cnpj ?? '',
    });
    setShowRestauranteModal(true);
  };

  const handleSaveRestaurante = async () => {
    if (!restauranteForm.nome.trim()) {
      setError('Informe o nome do restaurante');
      return;
    }
    setSavingRestaurante(true);
    setError('');
    setSuccess('');
    try {
      if (editingRestaurante) {
        await api.put(`/restaurantes/${editingRestaurante.id}`, {
          nome: restauranteForm.nome.trim(),
          cnpj: restauranteForm.cnpj.trim() || undefined,
        });
        setSuccess('Restaurante atualizado com sucesso.');
      } else {
        await api.post('/restaurantes', {
          nome: restauranteForm.nome.trim(),
          cnpj: restauranteForm.cnpj.trim() || undefined,
        });
        setSuccess('Restaurante criado com sucesso.');
      }
      setShowRestauranteModal(false);
      await loadRestaurantes();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro ao salvar restaurante');
    } finally {
      setSavingRestaurante(false);
    }
  };

  const handleRequestDeactivate = (restaurante: Restaurante) => {
    if (!restaurante.ativo) {
      void handleActivate(restaurante);
      return;
    }
    setRestauranteToDeactivate(restaurante);
    setConfirmationText('');
    setShowFirstConfirmModal(true);
  };

  const handleActivate = async (restaurante: Restaurante) => {
    setDeactivateLoading(restaurante.id);
    setError('');
    setSuccess('');
    try {
      await api.put(`/restaurantes/${restaurante.id}`, { ativo: true });
      setSuccess(`Restaurante "${restaurante.nome}" ativado.`);
      await loadRestaurantes();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro ao ativar restaurante');
    } finally {
      setDeactivateLoading(null);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!restauranteToDeactivate) return;
    setDeactivateLoading(restauranteToDeactivate.id);
    setError('');
    setSuccess('');
    try {
      await api.delete(`/restaurantes/${restauranteToDeactivate.id}`);
      setSuccess(`Restaurante "${restauranteToDeactivate.nome}" desativado.`);
      setShowSecondConfirmModal(false);
      setRestauranteToDeactivate(null);
      setConfirmationText('');
      await loadRestaurantes();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro ao desativar restaurante');
    } finally {
      setDeactivateLoading(null);
    }
  };

  const handleBackup = async (restaurante: Restaurante) => {
    setBackupLoadingId(restaurante.id);
    setError('');
    try {
      const response = await api.get(`/restaurantes/${restaurante.id}/backup`, {
        responseType: 'blob',
      });
      const contentDisposition = response.headers['content-disposition'] as string | undefined;
      const filenameMatch = contentDisposition?.match(/filename="?([^";\n]+)"?/);
      const filename = filenameMatch?.[1] ?? `${slugify(restaurante.nome)}_backup.kaizen`;

      const url = window.URL.createObjectURL(new Blob([response.data as BlobPart]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? `Erro ao gerar backup de "${restaurante.nome}"`);
    } finally {
      setBackupLoadingId(null);
    }
  };

  const openRestoreModal = (restaurante: Restaurante | null) => {
    setRestoreTarget(restaurante);
    setRestoreFile(null);
    setRestoreError('');
    setRestoreResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowRestoreModal(true);
  };

  const handleRestore = async () => {
    if (!restoreFile) {
      setRestoreError('Selecione um arquivo .kaizen');
      return;
    }
    setRestoreLoading(true);
    setRestoreError('');
    setRestoreResult(null);
    try {
      const form = new FormData();
      form.append('arquivo', restoreFile);
      if (restoreTarget) {
        form.append('restauranteId', String(restoreTarget.id));
      }
      const response = await api.post<ResumoRestore>('/restaurantes/restore', form, {
        headers: { 'Content-Type': null },
      });
      setRestoreResult(response.data);
      await loadRestaurantes();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Erro ao restaurar backup';
      setRestoreError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setRestoreLoading(false);
    }
  };

  const openCredentialsModal = (restaurante: Restaurante) => {
    setCredentialsRestaurante(restaurante);
    setCopiedCredentials(false);
    setShowCredentialsModal(true);
  };

  const handleCopyCredenciais = async () => {
    if (!credentialsRestaurante) return;
    const texto =
      `*Credenciais de Acesso - ${credentialsRestaurante.nome}*\n\n` +
      `📧 Email: ${credentialsRestaurante.adminPrincipalEmail ?? '(não encontrado)'}\n` +
      `🔑 Senha: (não disponível)\n\n` +
      `🌐 Acesso: ${PRODUCTION_URL}\n\n` +
      'Use o modal de usuários para resetar senha quando necessário.';
    const ok = await copiarTexto(texto);
    if (ok) {
      setCopiedCredentials(true);
      setTimeout(() => setCopiedCredentials(false), 3000);
    }
  };

  const handleShareCredenciaisWhatsapp = () => {
    if (!credentialsRestaurante) return;
    const texto =
      `*Credenciais de Acesso - ${credentialsRestaurante.nome}*\n\n` +
      `📧 Email: ${credentialsRestaurante.adminPrincipalEmail ?? '(não encontrado)'}\n` +
      `🔑 Senha: (não disponível)\n\n` +
      `🌐 Acesso: ${PRODUCTION_URL}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const openUsersModal = async (restaurante: Restaurante) => {
    setUsersRestaurante(restaurante);
    setShowUsersModal(true);
    setLoadingUsuarios(true);
    setError('');
    try {
      const response = await api.get<UsuarioRestaurante[]>(`/restaurantes/${restaurante.id}/usuarios`);
      setUsuarios(response.data);
    } catch (err: any) {
      setUsuarios([]);
      setError(err?.response?.data?.message ?? 'Erro ao carregar usuários do restaurante');
    } finally {
      setLoadingUsuarios(false);
    }
  };

  const handleResetSenhaUsuario = async (usuario: UsuarioRestaurante) => {
    if (!usersRestaurante) return;
    if (!window.confirm(`Resetar senha de ${usuario.nome}?`)) return;
    setResetSenhaLoadingId(usuario.id);
    setError('');
    setSuccess('');
    try {
      const response = await api.post<{ novaSenha: string }>(
        `/restaurantes/usuarios/${usuario.id}/resetar-senha`,
        { restauranteId: usersRestaurante.id },
      );
      setSuccess(`Senha resetada para ${usuario.nome}: ${response.data.novaSenha}`);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro ao resetar senha');
    } finally {
      setResetSenhaLoadingId(null);
    }
  };

  const openAlterarSenhaModal = (usuario: UsuarioRestaurante) => {
    setUsuarioAlterarSenha(usuario);
    setNovaSenha('');
    setShowAlterarSenhaModal(true);
  };

  const handleSalvarNovaSenha = async () => {
    if (!usersRestaurante || !usuarioAlterarSenha) return;
    if (novaSenha.trim().length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    setSavingNovaSenha(true);
    setError('');
    setSuccess('');
    try {
      await api.put(`/restaurantes/usuarios/${usuarioAlterarSenha.id}/alterar-senha`, {
        restauranteId: usersRestaurante.id,
        novaSenha: novaSenha.trim(),
      });
      setSuccess(`Senha alterada para ${usuarioAlterarSenha.nome}.`);
      setShowAlterarSenhaModal(false);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro ao alterar senha');
    } finally {
      setSavingNovaSenha(false);
    }
  };

  const handleGerarConvite = async () => {
    if (!selectedRestauranteConviteId) {
      setError('Selecione um restaurante para gerar convite.');
      return;
    }
    setGerandoConvite(true);
    setError('');
    setSuccess('');
    try {
      const response = await api.post<{ conviteUrl: string }>(
        '/v1/admin/convites',
        {
          email: conviteEmail.trim() || undefined,
          role: conviteRole,
          expiresInDays: conviteDias,
        },
        {
          params: { restauranteId: selectedRestauranteConviteId },
        },
      );
      const conviteUrl = response.data.conviteUrl;
      const fullLink = conviteUrl.startsWith('http')
        ? conviteUrl
        : `${window.location.origin}${conviteUrl}`;
      setLinkConviteGerado(fullLink);
      setConviteEmail('');
      setConviteRole('COLLABORATOR');
      setConviteDias(7);
      setSuccess('Convite gerado com sucesso.');
      await loadConvites();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro ao gerar convite');
    } finally {
      setGerandoConvite(false);
    }
  };

  const handleCopiarConvite = async (link: string) => {
    const ok = await copiarTexto(link);
    if (ok) {
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 3000);
    }
  };

  const handleRevogarConvite = async (convite: Convite) => {
    if (!selectedRestauranteConviteId) return;
    if (!window.confirm('Deseja revogar este convite?')) return;
    setRevogandoConviteId(convite.id);
    setError('');
    setSuccess('');
    try {
      await api.put(
        `/v1/admin/convites/${convite.id}/revogar`,
        {},
        { params: { restauranteId: selectedRestauranteConviteId } },
      );
      setSuccess('Convite revogado com sucesso.');
      await loadConvites();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro ao revogar convite');
    } finally {
      setRevogandoConviteId(null);
    }
  };

  const convitesView = useMemo(
    () =>
      convites.map((convite) => {
        const expired = new Date(convite.expiresAt).getTime() < Date.now();
        const status = convite.usado ? 'Revogado/Usado' : expired ? 'Expirado' : 'Disponível';
        return {
          ...convite,
          status,
          link: `${window.location.origin}/convite?token=${convite.token}`,
          expired,
        };
      }),
    [convites],
  );

  return (
    <Container fluid className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className="mb-1">Gerenciar Restaurantes</h2>
          <p className="text-muted mb-0">Painel adaptado para gestão centralizada de restaurantes, convites e auditoria.</p>
        </div>
        <div className={styles.headerActions}>
          <Button variant="outline-secondary" onClick={() => { void loadRestaurantes(); }}>
            <FaSync className="me-2" /> Atualizar
          </Button>
          <Button variant="outline-primary" onClick={() => openRestoreModal(null)}>
            <FaUpload className="me-2" /> Restaurar Backup
          </Button>
          <Button variant="primary" onClick={openCreateModal}>
            <FaPlus className="me-2" /> Criar Restaurante
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Card className="mb-3">
        <Card.Header><strong>Convites de Acesso (Adaptado)</strong></Card.Header>
        <Card.Body>
          <Row className="g-2 align-items-end mb-3">
            <Col md={4}>
              <Form.Label className="mb-1">Restaurante</Form.Label>
              <Form.Select
                value={selectedRestauranteConviteId}
                onChange={(event) => setSelectedRestauranteConviteId(event.target.value)}
              >
                <option value="">Selecione...</option>
                {restaurantes.map((restaurante) => (
                  <option key={restaurante.id} value={String(restaurante.id)}>
                    {restaurante.nome}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Label className="mb-1">Email (opcional)</Form.Label>
              <Form.Control
                value={conviteEmail}
                onChange={(event) => setConviteEmail(event.target.value)}
                placeholder="usuario@email.com"
              />
            </Col>
            <Col md={2}>
              <Form.Label className="mb-1">Perfil</Form.Label>
              <Form.Select
                value={conviteRole}
                onChange={(event) => setConviteRole(event.target.value as 'COLLABORATOR' | 'ADMIN')}
              >
                <option value="COLLABORATOR">Colaborador</option>
                <option value="ADMIN">Admin</option>
              </Form.Select>
            </Col>
            <Col md={1}>
              <Form.Label className="mb-1">Dias</Form.Label>
              <Form.Control
                type="number"
                min={1}
                max={30}
                value={conviteDias}
                onChange={(event) => setConviteDias(Math.max(1, Number(event.target.value) || 1))}
              />
            </Col>
            <Col md={2}>
              <Button
                className="w-100"
                variant="outline-primary"
                onClick={() => { void handleGerarConvite(); }}
                disabled={gerandoConvite || !selectedRestauranteConviteId}
              >
                {gerandoConvite ? <Spinner animation="border" size="sm" /> : <><FaLink className="me-2" />Gerar</>}
              </Button>
            </Col>
          </Row>

          {linkConviteGerado && (
            <div className={styles.generatedLink}>
              <Form.Control value={linkConviteGerado} readOnly onFocus={(e) => e.currentTarget.select()} />
              <Button variant={copiedInvite ? 'success' : 'outline-secondary'} onClick={() => { void handleCopiarConvite(linkConviteGerado); }}>
                <FaCopy />
              </Button>
              <Button variant="outline-success" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(linkConviteGerado)}`, '_blank')}>
                <FaWhatsapp />
              </Button>
            </div>
          )}

          <div className="mt-3">
            {loadingConvites ? (
              <div className="text-center py-3"><Spinner animation="border" size="sm" /></div>
            ) : (
              <Table responsive hover size="sm" className="mb-0">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Perfil</th>
                    <th>Criado</th>
                    <th>Expira</th>
                    <th>Status</th>
                    <th className="text-end">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {convitesView.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-3">Sem convites para este restaurante.</td>
                    </tr>
                  ) : convitesView.map((convite) => (
                    <tr key={convite.id}>
                      <td>{convite.email ?? <span className="text-muted">Qualquer</span>}</td>
                      <td><Badge bg={convite.role === 'ADMIN' ? 'primary' : 'secondary'}>{convite.role}</Badge></td>
                      <td>{formatDate(convite.criadoEm)}</td>
                      <td>{formatDate(convite.expiresAt)}</td>
                      <td>
                        <Badge bg={convite.status === 'Disponível' ? 'success' : convite.status === 'Expirado' ? 'secondary' : 'warning'}>
                          {convite.status}
                        </Badge>
                      </td>
                      <td className="text-end">
                        <div className={styles.tableActions}>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            title="Copiar link"
                            onClick={() => { void handleCopiarConvite(convite.link); }}
                          >
                            <FaCopy />
                          </Button>
                          <Button
                            variant="outline-success"
                            size="sm"
                            title="WhatsApp"
                            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(convite.link)}`, '_blank')}
                          >
                            <FaWhatsapp />
                          </Button>
                          {!convite.usado && !convite.expired && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              title="Revogar"
                              onClick={() => { void handleRevogarConvite(convite); }}
                              disabled={revogandoConviteId === convite.id}
                            >
                              {revogandoConviteId === convite.id ? <Spinner animation="border" size="sm" /> : <FaPause />}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
          {selectedRestauranteConvite && (
            <small className="text-muted d-block mt-2">
              Restaurante selecionado: {selectedRestauranteConvite.nome}
            </small>
          )}
        </Card.Body>
      </Card>

      <Card className="mb-3">
        <Card.Header><strong>Restaurantes</strong></Card.Header>
        <Card.Body className="p-0">
          {loadingRestaurantes ? (
            <div className="text-center py-4"><Spinner animation="border" /></div>
          ) : (
            <Table responsive hover className="mb-0">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Slug</th>
                  <th>Status</th>
                  <th>Criado em</th>
                  <th className="text-center">Usuários</th>
                  <th className="text-end">Ações</th>
                </tr>
              </thead>
              <tbody>
                {restaurantes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">Nenhum restaurante encontrado.</td>
                  </tr>
                ) : restaurantes.map((restaurante) => (
                  <tr key={restaurante.id}>
                    <td>{restaurante.nome}</td>
                    <td><code>{slugify(restaurante.nome)}</code></td>
                    <td>
                      <Badge bg={restaurante.ativo ? 'success' : 'secondary'}>
                        {restaurante.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td>{formatDate(restaurante.criadoEm)}</td>
                    <td className="text-center">{restaurante._count.usuarios}</td>
                    <td className="text-end">
                      <div className={styles.tableActions}>
                        <Button size="sm" variant="outline-info" title="Credenciais" onClick={() => openCredentialsModal(restaurante)}>
                          <FaUserLock />
                        </Button>
                        <Button size="sm" variant="outline-success" title="Usuários" onClick={() => { void openUsersModal(restaurante); }}>
                          <FaUsers />
                        </Button>
                        <Button size="sm" variant="outline-primary" title="Editar" onClick={() => openEditModal(restaurante)}>
                          <FaEdit />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          title="Backup"
                          onClick={() => { void handleBackup(restaurante); }}
                          disabled={backupLoadingId === restaurante.id}
                        >
                          {backupLoadingId === restaurante.id ? <Spinner animation="border" size="sm" /> : <FaDownload />}
                        </Button>
                        <Button size="sm" variant="outline-warning" title="Restaurar" onClick={() => openRestoreModal(restaurante)}>
                          <FaUpload />
                        </Button>
                        <Button
                          size="sm"
                          variant={restaurante.ativo ? 'outline-danger' : 'outline-success'}
                          title={restaurante.ativo ? 'Desativar' : 'Ativar'}
                          onClick={() => handleRequestDeactivate(restaurante)}
                          disabled={deactivateLoading === restaurante.id}
                        >
                          {deactivateLoading === restaurante.id ? <Spinner animation="border" size="sm" /> : restaurante.ativo ? <FaTrash /> : <FaPlay />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Card>
        <Card.Header><strong>Logs do Sistema</strong></Card.Header>
        <Card.Body>
          <Row className="g-2 mb-3">
            <Col md={2}>
              <Form.Label className="mb-1">Restaurante</Form.Label>
              <Form.Select
                value={logsFilters.restauranteId}
                onChange={(event) => setLogsFilters((prev) => ({ ...prev, restauranteId: event.target.value }))}
              >
                <option value="">Todos</option>
                {restaurantes.map((restaurante) => (
                  <option key={restaurante.id} value={String(restaurante.id)}>{restaurante.nome}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Label className="mb-1">Usuário ID</Form.Label>
              <Form.Control
                value={logsFilters.usuarioId}
                onChange={(event) => setLogsFilters((prev) => ({ ...prev, usuarioId: event.target.value }))}
                placeholder="Ex: 10"
              />
            </Col>
            <Col md={2}>
              <Form.Label className="mb-1">Ação</Form.Label>
              <Form.Control
                value={logsFilters.acao}
                onChange={(event) => setLogsFilters((prev) => ({ ...prev, acao: event.target.value }))}
                placeholder="create, update..."
              />
            </Col>
            <Col md={2}>
              <Form.Label className="mb-1">Entidade</Form.Label>
              <Form.Control
                value={logsFilters.entidade}
                onChange={(event) => setLogsFilters((prev) => ({ ...prev, entidade: event.target.value }))}
                placeholder="usuario, lista..."
              />
            </Col>
            <Col md={2}>
              <Form.Label className="mb-1">Início</Form.Label>
              <Form.Control
                type="datetime-local"
                value={logsFilters.startDate}
                onChange={(event) => setLogsFilters((prev) => ({ ...prev, startDate: event.target.value }))}
              />
            </Col>
            <Col md={2}>
              <Form.Label className="mb-1">Fim</Form.Label>
              <Form.Control
                type="datetime-local"
                value={logsFilters.endDate}
                onChange={(event) => setLogsFilters((prev) => ({ ...prev, endDate: event.target.value }))}
              />
            </Col>
          </Row>
          <div className="d-flex gap-2 mb-3">
            <Button variant="primary" onClick={() => { void loadLogs(); }}>
              <FaSync className="me-2" /> Filtrar
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => setLogsFilters(EMPTY_LOG_FILTERS)}
            >
              Limpar
            </Button>
            <span className="ms-auto text-muted align-self-center">{logsTotal} registros</span>
          </div>
          {logsError && <Alert variant="danger">{logsError}</Alert>}
          {logsLoading ? (
            <div className="text-center py-3"><Spinner animation="border" /></div>
          ) : (
            <Table responsive hover size="sm">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Restaurante</th>
                  <th>Usuário</th>
                  <th>Ação</th>
                  <th>Entidade</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-3">Sem logs para os filtros atuais.</td>
                  </tr>
                ) : logs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDate(log.criadoEm)}</td>
                    <td>{log.restauranteNome ?? log.restauranteId ?? '-'}</td>
                    <td>{log.usuarioNome ?? log.usuarioId ?? '-'}</td>
                    <td><Badge bg="secondary">{log.acao}</Badge></td>
                    <td>{log.entidade ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Modal show={showRestauranteModal} onHide={() => !savingRestaurante && setShowRestauranteModal(false)} centered>
        <Modal.Header closeButton={!savingRestaurante}>
          <Modal.Title>{editingRestaurante ? 'Editar Restaurante' : 'Criar Restaurante'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Nome do Restaurante</Form.Label>
            <Form.Control
              value={restauranteForm.nome}
              onChange={(event) => setRestauranteForm((prev) => ({ ...prev, nome: event.target.value }))}
              placeholder="Ex: Restaurante Central"
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>CNPJ (opcional)</Form.Label>
            <Form.Control
              value={restauranteForm.cnpj}
              onChange={(event) => setRestauranteForm((prev) => ({ ...prev, cnpj: event.target.value }))}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRestauranteModal(false)} disabled={savingRestaurante}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => { void handleSaveRestaurante(); }} disabled={savingRestaurante}>
            {savingRestaurante ? <Spinner animation="border" size="sm" /> : 'Salvar'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showFirstConfirmModal} onHide={() => setShowFirstConfirmModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirmar Desativação</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Você está prestes a desativar o restaurante <strong>{restauranteToDeactivate?.nome}</strong>. Deseja continuar?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowFirstConfirmModal(false)}>Cancelar</Button>
          <Button
            variant="danger"
            onClick={() => {
              setShowFirstConfirmModal(false);
              setShowSecondConfirmModal(true);
            }}
          >
            Sim, continuar
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showSecondConfirmModal} onHide={() => setShowSecondConfirmModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirmação Final</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-2">Digite o nome do restaurante para confirmar:</p>
          <p className="fw-semibold">{restauranteToDeactivate?.nome}</p>
          <Form.Control
            value={confirmationText}
            onChange={(event) => setConfirmationText(event.target.value)}
            placeholder="Nome exato do restaurante"
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSecondConfirmModal(false)}>Cancelar</Button>
          <Button
            variant="danger"
            onClick={() => { void handleConfirmDeactivate(); }}
            disabled={confirmationText.trim() !== restauranteToDeactivate?.nome}
          >
            Desativar
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showRestoreModal} onHide={() => !restoreLoading && setShowRestoreModal(false)} centered>
        <Modal.Header closeButton={!restoreLoading}>
          <Modal.Title>
            {restoreTarget
              ? `Restaurar Backup — ${restoreTarget.nome}`
              : 'Restaurar Backup'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {restoreResult ? (
            <Alert variant="success" className="mb-0">
              <div className="fw-semibold mb-2">Restauração concluída</div>
              <div>Usuários: {restoreResult.usuarios.criados} criados / {restoreResult.usuarios.ignorados} ignorados</div>
              <div>Fornecedores: {restoreResult.fornecedores.criados} criados / {restoreResult.fornecedores.ignorados} ignorados</div>
              <div>Itens: {restoreResult.itens.criados} criados / {restoreResult.itens.ignorados} ignorados</div>
              <div>Listas: {restoreResult.listas.criadas} criadas / {restoreResult.listas.ignoradas} ignoradas</div>
              <div>Refs: {restoreResult.listaItemRefs.criados} criados / {restoreResult.listaItemRefs.ignorados} ignorados</div>
            </Alert>
          ) : (
            <>
              <p className="text-muted small">
                {restoreTarget
                  ? `O arquivo será restaurado no restaurante ${restoreTarget.nome}.`
                  : 'O restaurante será identificado pelo arquivo de backup.'}
              </p>
              <Form.Control
                ref={fileInputRef}
                type="file"
                accept=".kaizen"
                onChange={(event) => {
                  const input = event.target as HTMLInputElement;
                  setRestoreFile(input.files?.[0] ?? null);
                }}
              />
              {restoreError && <Alert variant="danger" className="mt-3 mb-0">{restoreError}</Alert>}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRestoreModal(false)} disabled={restoreLoading}>
            {restoreResult ? 'Fechar' : 'Cancelar'}
          </Button>
          {!restoreResult && (
            <Button variant="warning" onClick={() => { void handleRestore(); }} disabled={restoreLoading || !restoreFile}>
              {restoreLoading ? <Spinner animation="border" size="sm" /> : 'Restaurar'}
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      <Modal show={showCredentialsModal} onHide={() => setShowCredentialsModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Credenciais — {credentialsRestaurante?.nome}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Email (admin principal)</Form.Label>
            <Form.Control value={credentialsRestaurante?.adminPrincipalEmail ?? '(não encontrado)'} readOnly />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Senha</Form.Label>
            <Form.Control value="(não disponível no banco atual)" readOnly />
          </Form.Group>
          <Form.Group>
            <Form.Label>URL de acesso</Form.Label>
            <Form.Control value={PRODUCTION_URL} readOnly />
          </Form.Group>
          {copiedCredentials && <Alert variant="success" className="mt-3 mb-0">Texto copiado para clipboard.</Alert>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCredentialsModal(false)}>Fechar</Button>
          <Button variant={copiedCredentials ? 'success' : 'outline-secondary'} onClick={() => { void handleCopyCredenciais(); }}>
            <FaCopy className="me-2" /> Copiar
          </Button>
          <Button variant="success" onClick={handleShareCredenciaisWhatsapp}>
            <FaWhatsapp className="me-2" /> WhatsApp
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showUsersModal} onHide={() => setShowUsersModal(false)} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title>Usuários — {usersRestaurante?.nome}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingUsuarios ? (
            <div className="text-center py-4"><Spinner animation="border" /></div>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Criado em</th>
                  <th className="text-end">Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-3">Nenhum usuário encontrado.</td>
                  </tr>
                ) : usuarios.map((usuario) => (
                  <tr key={usuario.id}>
                    <td>{usuario.nome}</td>
                    <td>{usuario.email}</td>
                    <td><Badge bg={usuario.role === 'ADMIN' ? 'primary' : 'secondary'}>{usuario.role}</Badge></td>
                    <td>
                      <Badge bg={usuario.ativo ? 'success' : 'secondary'}>
                        {usuario.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td>{formatDate(usuario.criadoEm)}</td>
                    <td className="text-end">
                      <div className={styles.tableActions}>
                        <Button size="sm" variant="outline-primary" onClick={() => openAlterarSenhaModal(usuario)}>
                          <FaEdit />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-warning"
                          onClick={() => { void handleResetSenhaUsuario(usuario); }}
                          disabled={resetSenhaLoadingId === usuario.id}
                        >
                          {resetSenhaLoadingId === usuario.id ? <Spinner animation="border" size="sm" /> : <FaPowerOff />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Modal.Body>
      </Modal>

      <Modal show={showAlterarSenhaModal} onHide={() => !savingNovaSenha && setShowAlterarSenhaModal(false)} centered>
        <Modal.Header closeButton={!savingNovaSenha}>
          <Modal.Title>Alterar Senha — {usuarioAlterarSenha?.nome}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Label>Nova Senha (mínimo 6 caracteres)</Form.Label>
          <Form.Control
            autoFocus
            value={novaSenha}
            onChange={(event) => setNovaSenha(event.target.value)}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAlterarSenhaModal(false)} disabled={savingNovaSenha}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={() => { void handleSalvarNovaSenha(); }}
            disabled={savingNovaSenha || novaSenha.trim().length < 6}
          >
            {savingNovaSenha ? <Spinner animation="border" size="sm" /> : 'Salvar Nova Senha'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
