'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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
} from 'react-icons/fa';
import api from '@/lib/api';
import styles from './Usuarios.module.css';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Role = 'COLLABORATOR' | 'ADMIN' | 'SUPER_ADMIN';

interface Usuario {
  id: number;
  nome: string;
  email: string;
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

// ─── Inner component (usa useSearchParams) ────────────────────────────────────

function UsuariosInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filtros
  const [filtroRole, setFiltroRole] = useState(searchParams.get('role') ?? '');
  const [filtroAprovado, setFiltroAprovado] = useState(
    searchParams.get('aprovado') ?? '',
  );
  const [busca, setBusca] = useState('');

  // Modal Editar
  const [showEditar, setShowEditar] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [editRole, setEditRole] = useState<Role>('COLLABORATOR');
  const [savingEditar, setSavingEditar] = useState(false);

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

  // ─── Modal Editar ────────────────────────────────────────────────────────────

  const abrirEditar = (u: Usuario) => {
    setEditando(u);
    setEditRole(u.role);
    setShowEditar(true);
  };

  const salvarEditar = async () => {
    if (!editando) return;
    setSavingEditar(true);
    setError('');
    try {
      if (editRole !== editando.role) {
        await api.put(`/v1/admin/usuarios/${editando.id}/role`, { role: editRole });
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
          <Link href="/admin/convites" className="btn btn-outline-primary btn-sm">
            <FaEnvelope className="me-1" /> Convidar Usuário
          </Link>
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
              <button
                className={styles.searchClear}
                onClick={() => setBusca('')}
                type="button"
              >
                <FaTimes />
              </button>
            )}
          </div>

          <Form.Select
            size="sm"
            value={filtroRole}
            onChange={(e) => setFiltroRole(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">Todos os perfis</option>
            <option value="COLLABORATOR">Colaborador</option>
            <option value="ADMIN">Admin</option>
          </Form.Select>

          <Form.Select
            size="sm"
            value={filtroAprovado}
            onChange={(e) => setFiltroAprovado(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">Todos os status</option>
            <option value="true">Aprovados</option>
            <option value="false">Pendentes</option>
          </Form.Select>
        </div>

        {/* ── Tabela ── */}
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
          </div>
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
                  <th className={styles.th} style={{ width: 200 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {displayed.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">
                      Nenhum usuário encontrado
                    </td>
                  </tr>
                )}
                {displayed.map((u) => {
                  const busy = (key: string) => actionLoading === key;

                  return (
                    <tr key={u.id} className={!u.aprovado ? styles.rowPendente : ''}>
                      <td className={styles.td}>
                        <strong>{u.nome}</strong>
                      </td>
                      <td className={styles.td}>{u.email}</td>
                      <td className={styles.td}>
                        <Badge bg={ROLE_VARIANT[u.role]}>
                          {ROLE_LABEL[u.role]}
                        </Badge>
                      </td>
                      <td className={styles.td}>
                        {u.aprovado ? (
                          <Badge bg="success">Aprovado</Badge>
                        ) : (
                          <Badge bg="warning" text="dark">Pendente</Badge>
                        )}
                      </td>
                      <td className={styles.td}>
                        {u.ativo ? (
                          <Badge bg="success">Ativo</Badge>
                        ) : (
                          <Badge bg="secondary">Inativo</Badge>
                        )}
                      </td>
                      <td className={styles.td}>
                        <div className={styles.actions}>
                          {!u.aprovado && (
                            <Button
                              size="sm"
                              variant="success"
                              onClick={() => handleAprovar(u.id)}
                              disabled={!!actionLoading}
                            >
                              {busy(`aprovar-${u.id}`) ? (
                                <Spinner animation="border" size="sm" />
                              ) : (
                                'Aprovar'
                              )}
                            </Button>
                          )}
                          {u.role !== 'SUPER_ADMIN' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline-secondary"
                                onClick={() => abrirEditar(u)}
                                disabled={!!actionLoading}
                                title="Editar"
                              >
                                <FaEdit />
                              </Button>
                              <Button
                                size="sm"
                                variant={u.ativo ? 'outline-danger' : 'outline-success'}
                                onClick={() => handleToggleAtivo(u)}
                                disabled={!!actionLoading}
                              >
                                {busy(`toggle-${u.id}`) ? (
                                  <Spinner animation="border" size="sm" />
                                ) : u.ativo ? (
                                  'Desativar'
                                ) : (
                                  'Reativar'
                                )}
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

      {/* ── Modal Editar ── */}
      <Modal show={showEditar} onHide={() => setShowEditar(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Editar Usuário</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editando && (
            <>
              <p className="mb-1">
                <strong>{editando.nome}</strong>
              </p>
              <p className="text-muted small mb-3">{editando.email}</p>
              <Form.Group>
                <Form.Label>Perfil</Form.Label>
                <Form.Select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as Role)}
                  disabled={savingEditar}
                >
                  <option value="COLLABORATOR">Colaborador</option>
                  <option value="ADMIN">Admin</option>
                </Form.Select>
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditar(false)} disabled={savingEditar}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={salvarEditar} disabled={savingEditar}>
            {savingEditar ? (
              <><Spinner animation="border" size="sm" /> Salvando...</>
            ) : (
              'Salvar'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

// ─── Export com Suspense (necessário por useSearchParams) ─────────────────────

export default function AdminUsuariosPage() {
  return (
    <Suspense fallback={<div className="text-center py-5"><Spinner animation="border" /></div>}>
      <UsuariosInner />
    </Suspense>
  );
}
