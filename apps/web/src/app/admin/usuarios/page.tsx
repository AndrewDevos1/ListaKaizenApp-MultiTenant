'use client';

import { useState, useEffect, useCallback } from 'react';
import { Table, Alert, Spinner, Badge, Button, Form, Row, Col } from 'react-bootstrap';
import api from '@/lib/api';
import styles from '@/app/admin/listas/[id]/ListaDetail.module.css';
import { FaUsersCog } from 'react-icons/fa';

type Role = 'ADMIN' | 'COLLABORATOR' | 'SUPER_ADMIN';

interface Usuario {
  id: number;
  nome: string;
  email: string;
  role: Role;
  aprovado: boolean;
  ativo: boolean;
}

const ROLES: Role[] = ['COLLABORATOR', 'ADMIN'];

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

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [filtroRole, setFiltroRole] = useState('');
  const [filtroAprovado, setFiltroAprovado] = useState('');

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  // Para alterar role inline
  const [roleEdit, setRoleEdit] = useState<Record<number, Role>>({});

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (filtroRole) params.role = filtroRole;
      if (filtroAprovado) params.aprovado = filtroAprovado;
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

  const handleAprovar = (id: number) => {
    execAction(
      `aprovar-${id}`,
      () => api.put(`/v1/admin/usuarios/${id}/aprovar`),
      'Usuário aprovado com sucesso',
    );
  };

  const handleDesativar = (usuario: Usuario) => {
    const acao = usuario.ativo ? 'desativar' : 'reativar';
    if (!confirm(`Deseja ${acao} o usuário ${usuario.nome}?`)) return;
    execAction(
      `toggle-${usuario.id}`,
      () => api.put(`/v1/admin/usuarios/${usuario.id}/desativar`),
      `Usuário ${acao === 'desativar' ? 'desativado' : 'reativado'} com sucesso`,
    );
  };

  const handleAlterarRole = (id: number, novaRole: Role) => {
    setRoleEdit((prev) => ({ ...prev, [id]: novaRole }));
    execAction(
      `role-${id}`,
      () => api.put(`/v1/admin/usuarios/${id}/role`, { role: novaRole }),
      'Role alterado com sucesso',
    );
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 className={styles.listTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FaUsersCog /> Gerenciar Usuários
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Aprove, desative e gerencie os papéis dos usuários do sistema
          </p>
        </div>

        {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

        {/* Filtros */}
        <div className={styles.tableSection} style={{ padding: '1.25rem 2rem', marginBottom: '1.5rem' }}>
          <Row className="g-3 align-items-end">
            <Col xs={12} sm={6} md={4}>
              <Form.Group>
                <Form.Label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Role</Form.Label>
                <Form.Select
                  value={filtroRole}
                  onChange={(e) => setFiltroRole(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="COLLABORATOR">Colaborador</option>
                  <option value="ADMIN">Admin</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Form.Group>
                <Form.Label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Status de Aprovação</Form.Label>
                <Form.Select
                  value={filtroAprovado}
                  onChange={(e) => setFiltroAprovado(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="true">Aprovados</option>
                  <option value="false">Pendentes</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Button variant="outline-primary" onClick={() => fetchUsuarios()}>
                Filtrar
              </Button>
            </Col>
          </Row>
        </div>

        <div className={styles.tableSection}>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <Table striped bordered hover responsive className={styles.table}>
                <thead>
                  <tr className={styles.tableHeader}>
                    <th className={styles.tableHeaderCell}>Nome</th>
                    <th className={styles.tableHeaderCell}>Email</th>
                    <th className={styles.tableHeaderCell}>Role</th>
                    <th className={styles.tableHeaderCell}>Aprovado</th>
                    <th className={styles.tableHeaderCell}>Ativo</th>
                    <th className={styles.tableHeaderCell}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => {
                    const isActing = (key: string) => actionLoading === key;
                    const currentRole = roleEdit[u.id] ?? u.role;

                    return (
                      <tr key={u.id} className={styles.tableRow}>
                        <td className={`${styles.tableCell} ${styles.cellBold}`}>{u.nome}</td>
                        <td className={styles.tableCell}>{u.email}</td>
                        <td className={styles.tableCell}>
                          {u.role === 'SUPER_ADMIN' ? (
                            <Badge bg={ROLE_VARIANT['SUPER_ADMIN']}>Super Admin</Badge>
                          ) : (
                            <Form.Select
                              size="sm"
                              value={currentRole}
                              onChange={(e) => handleAlterarRole(u.id, e.target.value as Role)}
                              disabled={!!actionLoading}
                              style={{ maxWidth: '140px' }}
                            >
                              {ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {ROLE_LABEL[r]}
                                </option>
                              ))}
                            </Form.Select>
                          )}
                        </td>
                        <td className={styles.tableCell}>
                          {u.aprovado ? (
                            <Badge bg="success">Aprovado</Badge>
                          ) : (
                            <Badge bg="warning" text="dark">Pendente</Badge>
                          )}
                        </td>
                        <td className={styles.tableCell}>
                          {u.ativo ? (
                            <Badge bg="success">Ativo</Badge>
                          ) : (
                            <Badge bg="secondary">Inativo</Badge>
                          )}
                        </td>
                        <td className={styles.tableCell}>
                          <div className={styles.actionButtons}>
                            {!u.aprovado && (
                              <Button
                                size="sm"
                                variant="success"
                                onClick={() => handleAprovar(u.id)}
                                disabled={!!actionLoading}
                              >
                                {isActing(`aprovar-${u.id}`) ? <Spinner animation="border" size="sm" /> : 'Aprovar'}
                              </Button>
                            )}
                            {u.role !== 'SUPER_ADMIN' && (
                              <Button
                                size="sm"
                                variant={u.ativo ? 'outline-danger' : 'outline-success'}
                                onClick={() => handleDesativar(u)}
                                disabled={!!actionLoading}
                              >
                                {isActing(`toggle-${u.id}`) ? (
                                  <Spinner animation="border" size="sm" />
                                ) : u.ativo ? (
                                  'Desativar'
                                ) : (
                                  'Reativar'
                                )}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {usuarios.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        Nenhum usuário encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
