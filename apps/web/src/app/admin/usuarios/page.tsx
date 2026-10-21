'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Alert,
  Badge,
  Button,
  Form,
  Modal,
  Spinner,
  Table,
} from 'react-bootstrap';
import {
  FaUsersCog,
  FaSearch,
  FaTimes,
  FaEdit,
  FaEnvelope,
  FaCopy,
  FaWhatsapp,
  FaTrash,
  FaKey,
  FaUserPlus,
  FaEye,
  FaEyeSlash,
} from 'react-icons/fa';
import api from '@/lib/api';
import styles from './Usuarios.module.css';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Role = 'COLLABORATOR' | 'ADMIN' | 'SUPER_ADMIN';

interface Usuario {
  id: number;
  nome: string;
  email: string;
  username: string;
  role: Role;
  aprovado: boolean;
  ativo: boolean;
}

const ROLE_LABEL: Record<Role, string> = {
  COLLABORATOR: 'Colaborador',
  ADMIN: 'Admin',
  SUPER_ADMIN: 'Super Admin',
};

const ROLE_VARIANT: Record<Role, string> = {
  COLLABORATOR: 'primary',
  ADMIN: 'warning',
  SUPER_ADMIN: 'danger',
};

function normalizeStr(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function credenciaisTexto(u: Usuario): string {
  const linhas = [
    `Olá, ${u.nome}!`,
    `Seu acesso ao sistema foi criado. Aqui estão suas credenciais:`,
    ``,
    `Nome de usuário: ${u.username || u.email}`,
    `E-mail: ${u.email}`,
    ``,
    `Acesse o sistema e altere sua senha no primeiro login.`,
  ];
  return linhas.join('\n');
}

// ─── Inner component ──────────────────────────────────────────────────────────

function UsuariosInner() {
  const searchParams = useSearchParams();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filtros
  const [filtroRole, setFiltroRole] = useState(searchParams.get('role') ?? '');
  const [filtroAprovado, setFiltroAprovado] = useState(searchParams.get('aprovado') ?? '');
  const [busca, setBusca] = useState('');

  // Modal Criar
  const [showCriar, setShowCriar] = useState(false);
  const [criarNome, setCriarNome] = useState('');
  const [criarEmail, setCriarEmail] = useState('');
  const [criarUsername, setCriarUsername] = useState('');
  const [criarSenha, setCriarSenha] = useState('');
  const [criarConfirmar, setCriarConfirmar] = useState('');
  const [criarRole, setCriarRole] = useState<Role>('COLLABORATOR');
  const [criarSenhaVis, setCriarSenhaVis] = useState(false);
  const [savingCriar, setSavingCriar] = useState(false);

  // Modal Editar
  const [showEditar, setShowEditar] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editRole, setEditRole] = useState<Role>('COLLABORATOR');
  const [savingEditar, setSavingEditar] = useState(false);

  // Modal Alterar Senha
  const [showAlterarSenha, setShowAlterarSenha] = useState(false);
  const [alterandoId, setAlterandoId] = useState<number | null>(null);
  const [alterandoNome, setAlterandoNome] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [novaSenhaVis, setNovaSenhaVis] = useState(false);
  const [savingAlterarSenha, setSavingAlterarSenha] = useState(false);

  // Modal Resetar Senha (exibe nova senha gerada)
  const [showResetarSenha, setShowResetarSenha] = useState(false);
  const [senhaGerada, setSenhaGerada] = useState('');
  const [resetandoNome, setResetandoNome] = useState('');

  // ─── Fetch ──────────────────────────────────────────────────────────────────

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (filtroRole) params.role = filtroRole;
      if (filtroAprovado !== '') params.aprovado = filtroAprovado;
      const { data } = await api.get('/v1/admin/usuarios', { params });
      setUsuarios(data);
    } catch {
      setError('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }, [filtroRole, filtroAprovado]);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const execAction = async (key: string, fn: () => Promise<void>, msg: string) => {
    setError('');
    setSuccess('');
    setActionLoading(key);
    try {
      await fn();
      setSuccess(msg);
      fetchUsuarios();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao executar ação');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAprovar = (id: number) =>
    execAction(
      `aprovar-${id}`,
      () => api.put(`/v1/admin/usuarios/${id}/aprovar`),
      'Usuário aprovado com sucesso',
    );

  const handleToggleAtivo = (u: Usuario) => {
    const acao = u.ativo ? 'desativar' : 'reativar';
    if (!confirm(`Deseja ${acao} o usuário ${u.nome}?`)) return;
    execAction(
      `toggle-${u.id}`,
      () => api.put(`/v1/admin/usuarios/${u.id}/desativar`),
      `Usuário ${u.ativo ? 'desativado' : 'reativado'} com sucesso`,
    );
  };

  const handleDeletar = (u: Usuario) => {
    if (!confirm(`Deletar ${u.nome} permanentemente? Esta ação não pode ser desfeita.`)) return;
    execAction(
      `deletar-${u.id}`,
      () => api.delete(`/v1/admin/usuarios/${u.id}`),
      'Usuário deletado com sucesso',
    );
  };

  // ─── Copiar / WhatsApp ───────────────────────────────────────────────────────

  const handleCopiar = async (u: Usuario) => {
    const texto = credenciaisTexto(u);
    try {
      await navigator.clipboard.writeText(texto);
      setSuccess(`Credenciais de ${u.nome} copiadas!`);
    } catch {
      setError('Não foi possível copiar. Use o botão WhatsApp.');
    }
  };

  const handleWhatsApp = (u: Usuario) => {
    const texto = encodeURIComponent(credenciaisTexto(u));
    window.open(`https://wa.me/?text=${texto}`, '_blank', 'noopener,noreferrer');
  };

  // ─── Modal Criar ────────────────────────────────────────────────────────────

  const abrirCriar = () => {
    setCriarNome('');
    setCriarEmail('');
    setCriarUsername('');
    setCriarSenha('');
    setCriarConfirmar('');
    setCriarRole('COLLABORATOR');
    setCriarSenhaVis(false);
    setShowCriar(true);
  };

  const salvarCriar = async () => {
    if (!criarNome.trim() || !criarEmail.trim() || !criarSenha) return;
    if (criarSenha !== criarConfirmar) {
      setError('As senhas não conferem');
      return;
    }
    setSavingCriar(true);
    setError('');
    try {
      await api.post('/v1/admin/usuarios', {
        nome: criarNome,
        email: criarEmail,
        username: criarUsername || undefined,
        senha: criarSenha,
        role: criarRole,
      });
      setShowCriar(false);
      setSuccess('Usuário criado com sucesso');
      fetchUsuarios();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao criar usuário');
    } finally {
      setSavingCriar(false);
    }
  };

  // ─── Modal Editar ────────────────────────────────────────────────────────────

  const abrirEditar = (u: Usuario) => {
    setEditando(u);
    setEditNome(u.nome);
    setEditEmail(u.email);
    setEditUsername(u.username || '');
    setEditRole(u.role);
    setShowEditar(true);
  };

  const salvarEditar = async () => {
    if (!editando) return;
    setSavingEditar(true);
    setError('');
    try {
      const body: Record<string, string> = {};
      if (editNome !== editando.nome) body.nome = editNome;
      if (editEmail !== editando.email) body.email = editEmail;
      if (editUsername !== (editando.username || '')) body.username = editUsername;
      if (editRole !== editando.role) body.role = editRole;

      if (Object.keys(body).length > 0) {
        await api.put(`/v1/admin/usuarios/${editando.id}`, body);
      }
      setShowEditar(false);
      setSuccess('Usuário atualizado com sucesso');
      fetchUsuarios();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao salvar');
    } finally {
      setSavingEditar(false);
    }
  };

  // ─── Modal Alterar Senha ─────────────────────────────────────────────────────

  const abrirAlterarSenha = (u: Usuario) => {
    setAlterandoId(u.id);
    setAlterandoNome(u.nome);
    setNovaSenha('');
    setConfirmarSenha('');
    setNovaSenhaVis(false);
    setShowEditar(false);
    setShowAlterarSenha(true);
  };

  const salvarAlterarSenha = async () => {
    if (!alterandoId || !novaSenha) return;
    if (novaSenha !== confirmarSenha) {
      setError('As senhas não conferem');
      return;
    }
    setSavingAlterarSenha(true);
    setError('');
    try {
      await api.put(`/v1/admin/usuarios/${alterandoId}/alterar-senha`, { novaSenha });
      setShowAlterarSenha(false);
      setSuccess(`Senha de ${alterandoNome} alterada com sucesso`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao alterar senha');
    } finally {
      setSavingAlterarSenha(false);
    }
  };

  // ─── Resetar Senha ───────────────────────────────────────────────────────────

  const handleResetarSenha = async (u: Usuario) => {
    if (!confirm(`Resetar a senha de ${u.nome}? Uma nova senha será gerada automaticamente.`)) return;
    setError('');
    setSuccess('');
    try {
      const { data } = await api.post(`/v1/admin/usuarios/${u.id}/resetar-senha`);
      setResetandoNome(u.nome);
      setSenhaGerada(data.novaSenha);
      setShowResetarSenha(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao resetar senha');
    }
  };

  // ─── Display ─────────────────────────────────────────────────────────────────

  const displayed = usuarios.filter((u) => {
    if (!busca) return true;
    const termo = normalizeStr(busca);
    return (
      normalizeStr(u.nome).includes(termo) ||
      normalizeStr(u.email).includes(termo)
    );
  });

  const pendentes = usuarios.filter((u) => !u.aprovado).length;

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>

        {/* ── Header ── */}
        <Link href="/admin/gerenciar-usuarios" className={styles.backLink}>
          ← Voltar
        </Link>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>
              <FaUsersCog className={styles.titleIcon} />
              Gerenciar Usuários
            </h1>
            {pendentes > 0 && (
              <span className={styles.pendenteBanner}>
                ⚠ {pendentes} usuário{pendentes > 1 ? 's' : ''} pendente{pendentes > 1 ? 's' : ''} de aprovação
              </span>
            )}
          </div>
          <div className="d-flex gap-2">
            <Button variant="primary" size="sm" onClick={abrirCriar}>
              <FaUserPlus className="me-1" /> Criar Usuário
            </Button>
            <Link href="/admin/convites" className="btn btn-outline-primary btn-sm">
              <FaEnvelope className="me-1" /> Convidar
            </Link>
          </div>
        </div>

        {/* ── Alertas ── */}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* ── Filtros + Busca ── */}
        <div className={styles.filtersBar}>
          <div className={styles.searchWrapper}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Buscar por nome ou e-mail..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            {busca && (
              <button className={styles.searchClear} onClick={() => setBusca('')} type="button">
                <FaTimes />
              </button>
            )}
          </div>

          <Form.Select size="sm" value={filtroRole} onChange={(e) => setFiltroRole(e.target.value)} className={styles.filterSelect}>
            <option value="">Todos os perfis</option>
            <option value="COLLABORATOR">Colaborador</option>
            <option value="ADMIN">Admin</option>
          </Form.Select>

          <Form.Select size="sm" value={filtroAprovado} onChange={(e) => setFiltroAprovado(e.target.value)} className={styles.filterSelect}>
            <option value="">Todos os status</option>
            <option value="true">Aprovados</option>
            <option value="false">Pendentes</option>
          </Form.Select>
        </div>

        {/* ── Tabela ── */}
        {loading ? (
          <div className="text-center py-5"><Spinner animation="border" /></div>
        ) : (
          <div className={styles.tableWrapper}>
            <Table bordered hover responsive style={{ marginBottom: 0 }}>
              <thead>
                <tr>
                  <th className={styles.th}>Nome</th>
                  <th className={styles.th}>E-mail</th>
                  <th className={styles.th} style={{ width: 120 }}>Perfil</th>
                  <th className={styles.th} style={{ width: 110 }}>Aprovação</th>
                  <th className={styles.th} style={{ width: 90 }}>Status</th>
                  <th className={styles.th} style={{ width: 280 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {displayed.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">Nenhum usuário encontrado</td>
                  </tr>
                )}
                {displayed.map((u) => {
                  const busy = (key: string) => actionLoading === key;
                  return (
                    <tr key={u.id} className={!u.aprovado ? styles.rowPendente : ''}>
                      <td className={styles.td}><strong>{u.nome}</strong></td>
                      <td className={styles.td}>{u.email}</td>
                      <td className={styles.td}>
                        <Badge bg={ROLE_VARIANT[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                      </td>
                      <td className={styles.td}>
                        {u.aprovado
                          ? <Badge bg="success">Aprovado</Badge>
                          : <Badge bg="warning" text="dark">Pendente</Badge>}
                      </td>
                      <td className={styles.td}>
                        {u.ativo
                          ? <Badge bg="success">Ativo</Badge>
                          : <Badge bg="secondary">Inativo</Badge>}
                      </td>
                      <td className={styles.td}>
                        <div className={styles.actions}>
                          {!u.aprovado && (
                            <Button size="sm" variant="success" onClick={() => handleAprovar(u.id)} disabled={!!actionLoading}>
                              {busy(`aprovar-${u.id}`) ? <Spinner animation="border" size="sm" /> : 'Aprovar'}
                            </Button>
                          )}
                          {u.role !== 'SUPER_ADMIN' && (
                            <>
                              <Button size="sm" variant="outline-secondary" onClick={() => abrirEditar(u)} disabled={!!actionLoading} title="Editar">
                                <FaEdit />
                              </Button>
                              <Button size="sm" variant="outline-success" onClick={() => handleWhatsApp(u)} title="Compartilhar via WhatsApp">
                                <FaWhatsapp />
                              </Button>
                              <Button size="sm" variant="outline-secondary" onClick={() => handleCopiar(u)} title="Copiar credenciais">
                                <FaCopy />
                              </Button>
                              <Button size="sm" variant={u.ativo ? 'outline-danger' : 'outline-success'} onClick={() => handleToggleAtivo(u)} disabled={!!actionLoading}>
                                {busy(`toggle-${u.id}`) ? <Spinner animation="border" size="sm" /> : u.ativo ? 'Desativar' : 'Reativar'}
                              </Button>
                              <Button size="sm" variant="outline-danger" onClick={() => handleDeletar(u)} disabled={!!actionLoading} title="Deletar permanentemente">
                                {busy(`deletar-${u.id}`) ? <Spinner animation="border" size="sm" /> : <FaTrash />}
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <div className={styles.tableFooter}>
              {displayed.length} usuário{displayed.length !== 1 ? 's' : ''}
              {busca && ` encontrado${displayed.length !== 1 ? 's' : ''}`}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Criar Usuário ── */}
      <Modal show={showCriar} onHide={() => setShowCriar(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title><FaUserPlus className="me-2" />Criar Usuário</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Nome <span className="text-danger">*</span></Form.Label>
            <Form.Control value={criarNome} onChange={(e) => setCriarNome(e.target.value)} disabled={savingCriar} placeholder="Nome completo" />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>E-mail <span className="text-danger">*</span></Form.Label>
            <Form.Control type="email" value={criarEmail} onChange={(e) => setCriarEmail(e.target.value)} disabled={savingCriar} placeholder="email@exemplo.com" />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Username <span className="text-muted small">(opcional)</span></Form.Label>
            <Form.Control value={criarUsername} onChange={(e) => setCriarUsername(e.target.value)} disabled={savingCriar} placeholder="nome_usuario" />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Senha <span className="text-danger">*</span></Form.Label>
            <div className="input-group">
              <Form.Control
                type={criarSenhaVis ? 'text' : 'password'}
                value={criarSenha}
                onChange={(e) => setCriarSenha(e.target.value)}
                disabled={savingCriar}
                placeholder="Mínimo 6 caracteres"
              />
              <Button variant="outline-secondary" onClick={() => setCriarSenhaVis(v => !v)} tabIndex={-1}>
                {criarSenhaVis ? <FaEyeSlash /> : <FaEye />}
              </Button>
            </div>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Confirmar Senha <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type={criarSenhaVis ? 'text' : 'password'}
              value={criarConfirmar}
              onChange={(e) => setCriarConfirmar(e.target.value)}
              disabled={savingCriar}
              isInvalid={!!criarConfirmar && criarSenha !== criarConfirmar}
            />
            {criarConfirmar && criarSenha !== criarConfirmar && (
              <Form.Control.Feedback type="invalid">As senhas não conferem</Form.Control.Feedback>
            )}
          </Form.Group>
          <Form.Group>
            <Form.Label>Perfil</Form.Label>
            <Form.Select value={criarRole} onChange={(e) => setCriarRole(e.target.value as Role)} disabled={savingCriar}>
              <option value="COLLABORATOR">Colaborador</option>
              <option value="ADMIN">Admin</option>
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCriar(false)} disabled={savingCriar}>Cancelar</Button>
          <Button variant="primary" onClick={salvarCriar} disabled={savingCriar || !criarNome || !criarEmail || !criarSenha || criarSenha !== criarConfirmar}>
            {savingCriar ? <><Spinner animation="border" size="sm" /> Criando...</> : 'Criar'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Modal Editar ── */}
      <Modal show={showEditar} onHide={() => setShowEditar(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Editar Usuário</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editando && (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Nome</Form.Label>
                <Form.Control value={editNome} onChange={(e) => setEditNome(e.target.value)} disabled={savingEditar} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>E-mail</Form.Label>
                <Form.Control type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} disabled={savingEditar} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Username</Form.Label>
                <Form.Control value={editUsername} onChange={(e) => setEditUsername(e.target.value)} disabled={savingEditar} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Perfil</Form.Label>
                <Form.Select value={editRole} onChange={(e) => setEditRole(e.target.value as Role)} disabled={savingEditar}>
                  <option value="COLLABORATOR">Colaborador</option>
                  <option value="ADMIN">Admin</option>
                </Form.Select>
              </Form.Group>
              <hr />
              <div className="d-flex gap-2">
                <Button size="sm" variant="outline-warning" onClick={() => abrirAlterarSenha(editando)}>
                  <FaKey className="me-1" /> Alterar Senha
                </Button>
                <Button size="sm" variant="outline-danger" onClick={() => { setShowEditar(false); handleResetarSenha(editando); }}>
                  Resetar Senha
                </Button>
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditar(false)} disabled={savingEditar}>Cancelar</Button>
          <Button variant="primary" onClick={salvarEditar} disabled={savingEditar}>
            {savingEditar ? <><Spinner animation="border" size="sm" /> Salvando...</> : 'Salvar'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Modal Alterar Senha ── */}
      <Modal show={showAlterarSenha} onHide={() => setShowAlterarSenha(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title><FaKey className="me-2" />Alterar Senha</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted mb-3">Definindo nova senha para <strong>{alterandoNome}</strong></p>
          <Form.Group className="mb-3">
            <Form.Label>Nova Senha</Form.Label>
            <div className="input-group">
              <Form.Control
                type={novaSenhaVis ? 'text' : 'password'}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                disabled={savingAlterarSenha}
                placeholder="Mínimo 6 caracteres"
              />
              <Button variant="outline-secondary" onClick={() => setNovaSenhaVis(v => !v)} tabIndex={-1}>
                {novaSenhaVis ? <FaEyeSlash /> : <FaEye />}
              </Button>
            </div>
          </Form.Group>
          <Form.Group>
            <Form.Label>Confirmar Nova Senha</Form.Label>
            <Form.Control
              type={novaSenhaVis ? 'text' : 'password'}
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              disabled={savingAlterarSenha}
              isInvalid={!!confirmarSenha && novaSenha !== confirmarSenha}
            />
            {confirmarSenha && novaSenha !== confirmarSenha && (
              <Form.Control.Feedback type="invalid">As senhas não conferem</Form.Control.Feedback>
            )}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAlterarSenha(false)} disabled={savingAlterarSenha}>Cancelar</Button>
          <Button variant="warning" onClick={salvarAlterarSenha} disabled={savingAlterarSenha || !novaSenha || novaSenha !== confirmarSenha}>
            {savingAlterarSenha ? <><Spinner animation="border" size="sm" /> Salvando...</> : 'Alterar Senha'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Modal Senha Gerada (Resetar) ── */}
      <Modal show={showResetarSenha} onHide={() => setShowResetarSenha(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Senha Resetada</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <p>Nova senha gerada para <strong>{resetandoNome}</strong>:</p>
          <div className={styles.senhaGerada}>{senhaGerada}</div>
          <p className="text-muted small mt-2">Copie e envie ao usuário. Esta senha não será exibida novamente.</p>
          <div className="d-flex gap-2 justify-content-center mt-3">
            <Button variant="outline-secondary" onClick={async () => {
              await navigator.clipboard.writeText(senhaGerada);
              setSuccess('Senha copiada!');
            }}>
              <FaCopy className="me-1" /> Copiar
            </Button>
            <Button variant="outline-success" onClick={() => {
              const texto = encodeURIComponent(`Nova senha de ${resetandoNome}: ${senhaGerada}`);
              window.open(`https://wa.me/?text=${texto}`, '_blank', 'noopener,noreferrer');
            }}>
              <FaWhatsapp className="me-1" /> WhatsApp
            </Button>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowResetarSenha(false)}>Fechar</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

// ─── Export com Suspense ──────────────────────────────────────────────────────

export default function AdminUsuariosPage() {
  return (
    <Suspense fallback={<div className="text-center py-5"><Spinner animation="border" /></div>}>
      <UsuariosInner />
    </Suspense>
  );
}
