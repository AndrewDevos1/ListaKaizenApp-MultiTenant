'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Table, Button, Modal, Form, Alert, Spinner, Badge } from 'react-bootstrap';
import api from '@/lib/api';
import styles from './Areas.module.css';
import { FaUsers, FaList } from 'react-icons/fa';

interface AreaSummary {
  id: number;
  nome: string;
  criadoEm: string;
  _count: { colaboradores: number; listas: number };
}

interface Usuario {
  id: number;
  nome: string;
  email: string;
}

interface ListaOpt {
  id: number;
  nome: string;
}

export default function AreasPage() {
  const [areas, setAreas] = useState<AreaSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal criar/editar
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AreaSummary | null>(null);
  const [nome, setNome] = useState('');

  // Modal membros
  const [showModalMembros, setShowModalMembros] = useState(false);
  const [areaAtiva, setAreaAtiva] = useState<AreaSummary | null>(null);
  const [todosUsuarios, setTodosUsuarios] = useState<Usuario[]>([]);
  const [membrosIds, setMembrosIds] = useState<Set<number>>(new Set());
  const [loadingMembros, setLoadingMembros] = useState(false);
  const [savingMembros, setSavingMembros] = useState(false);
  const [errorMembros, setErrorMembros] = useState('');

  // Modal listas
  const [showModalListas, setShowModalListas] = useState(false);
  const [todasListas, setTodasListas] = useState<ListaOpt[]>([]);
  const [listasIds, setListasIds] = useState<Set<number>>(new Set());
  const [loadingListas, setLoadingListas] = useState(false);
  const [savingListas, setSavingListas] = useState(false);
  const [errorListas, setErrorListas] = useState('');

  const fetchAreas = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/v1/areas');
      setAreas(data);
    } catch {
      setError('Erro ao carregar áreas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAreas();
  }, []);

  // ── CRUD ────────────────────────────────────────────────────────

  const openModal = (area?: AreaSummary) => {
    setEditing(area || null);
    setNome(area?.nome || '');
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.put(`/v1/areas/${editing.id}`, { nome });
      } else {
        await api.post('/v1/areas', { nome });
      }
      setShowModal(false);
      fetchAreas();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar área');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja remover esta área? As listas vinculadas serão desvinculadas.')) return;
    try {
      await api.delete(`/v1/areas/${id}`);
      fetchAreas();
    } catch {
      setError('Erro ao remover área');
    }
  };

  // ── Membros ──────────────────────────────────────────────────────

  const abrirMembros = async (area: AreaSummary) => {
    setAreaAtiva(area);
    setShowModalMembros(true);
    setLoadingMembros(true);
    setErrorMembros('');
    try {
      const [colabData, usuariosData] = await Promise.all([
        api.get(`/v1/areas/${area.id}/colaboradores`),
        api.get('/v1/admin/usuarios'),
      ]);
      setMembrosIds(new Set(colabData.data.map((c: any) => c.usuario.id)));
      setTodosUsuarios(usuariosData.data);
    } catch {
      setErrorMembros('Erro ao carregar membros');
    } finally {
      setLoadingMembros(false);
    }
  };

  const toggleMembro = (id: number) => {
    setMembrosIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const salvarMembros = async () => {
    if (!areaAtiva) return;
    setSavingMembros(true);
    setErrorMembros('');
    try {
      await api.post(`/v1/areas/${areaAtiva.id}/colaboradores`, {
        colaboradorIds: [...membrosIds],
      });
      setShowModalMembros(false);
      fetchAreas();
    } catch (err: any) {
      setErrorMembros(err.response?.data?.message || 'Erro ao salvar membros');
    } finally {
      setSavingMembros(false);
    }
  };

  // ── Listas ───────────────────────────────────────────────────────

  const abrirListas = async (area: AreaSummary) => {
    setAreaAtiva(area);
    setShowModalListas(true);
    setLoadingListas(true);
    setErrorListas('');
    try {
      const [listasAreaData, todasData] = await Promise.all([
        api.get(`/v1/areas/${area.id}/listas`),
        api.get('/v1/listas'),
      ]);
      setListasIds(new Set(listasAreaData.data.map((l: any) => l.id)));
      setTodasListas(todasData.data.map((l: any) => ({ id: l.id, nome: l.nome })));
    } catch {
      setErrorListas('Erro ao carregar listas');
    } finally {
      setLoadingListas(false);
    }
  };

  const toggleLista = (id: number) => {
    setListasIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const salvarListas = async () => {
    if (!areaAtiva) return;
    setSavingListas(true);
    setErrorListas('');
    try {
      await api.post(`/v1/areas/${areaAtiva.id}/listas`, {
        listaIds: [...listasIds],
      });
      setShowModalListas(false);
      fetchAreas();
    } catch (err: any) {
      setErrorListas(err.response?.data?.message || 'Erro ao salvar listas');
    } finally {
      setSavingListas(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <h2 className={styles.pageTitle}>Áreas</h2>
          <Button variant="primary" onClick={() => openModal()}>
            + Nova Área
          </Button>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <div className={styles.tableWrapper}>
          <Table responsive className={styles.table}>
            <thead className={styles.tableHeader}>
              <tr>
                <th className={styles.tableHeaderCell}>Nome</th>
                <th className={styles.tableHeaderCell} style={{ width: 110 }}>Membros</th>
                <th className={styles.tableHeaderCell} style={{ width: 110 }}>Listas</th>
                <th className={styles.tableHeaderCell} style={{ width: 260 }}>Ações</th>
              </tr>
            </thead>
            <tbody className={styles.tableBody}>
              {areas.map((area) => (
                <tr key={area.id} className={styles.tableRow}>
                  <td className={`${styles.tableCell} ${styles.cellBold}`}>{area.nome}</td>
                  <td className={styles.tableCell}>
                    <span className={styles.countBadge}>{area._count.colaboradores}</span>
                  </td>
                  <td className={styles.tableCell}>
                    <span className={styles.countBadge}>{area._count.listas}</span>
                  </td>
                  <td className={styles.tableCell}>
                    <div className={styles.actionButtons}>
                      <Button size="sm" variant="outline-primary" onClick={() => openModal(area)}>
                        Editar
                      </Button>
                      <Button size="sm" variant="outline-secondary" onClick={() => abrirMembros(area)}>
                        <FaUsers className="me-1" />Membros
                      </Button>
                      <Button size="sm" variant="outline-secondary" onClick={() => abrirListas(area)}>
                        <FaList className="me-1" />Listas
                      </Button>
                      <Button size="sm" variant="outline-danger" onClick={() => handleDelete(area.id)}>
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {areas.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-4">
                    Nenhuma área cadastrada
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>

        {/* Modal Criar/Editar */}
        <Modal show={showModal} onHide={() => setShowModal(false)}>
          <Form onSubmit={handleSubmit}>
            <Modal.Header closeButton>
              <Modal.Title>{editing ? 'Editar Área' : 'Nova Área'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form.Group>
                <Form.Label>Nome</Form.Label>
                <Form.Control
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Cozinha, Bar, Salão..."
                  required
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                {editing ? 'Salvar' : 'Criar'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* Modal Membros */}
        <Modal show={showModalMembros} onHide={() => setShowModalMembros(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Membros — {areaAtiva?.nome}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {errorMembros && (
              <Alert variant="danger" dismissible onClose={() => setErrorMembros('')}>
                {errorMembros}
              </Alert>
            )}
            {loadingMembros ? (
              <div className="text-center py-3"><Spinner animation="border" size="sm" /></div>
            ) : todosUsuarios.length === 0 ? (
              <p className="text-muted text-center">Nenhum usuário disponível</p>
            ) : (
              todosUsuarios.map((u) => (
                <div key={u.id} className={styles.checkItem}>
                  <div className={styles.checkInfo}>
                    <span className={styles.checkNome}>{u.nome}</span>
                    <span className={styles.checkMeta}>{u.email}</span>
                  </div>
                  <Form.Check
                    type="switch"
                    id={`membro-${u.id}`}
                    checked={membrosIds.has(u.id)}
                    onChange={() => toggleMembro(u.id)}
                  />
                </div>
              ))
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModalMembros(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={salvarMembros} disabled={savingMembros}>
              {savingMembros ? <Spinner size="sm" animation="border" /> : 'Salvar'}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Modal Listas */}
        <Modal show={showModalListas} onHide={() => setShowModalListas(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Listas — {areaAtiva?.nome}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {errorListas && (
              <Alert variant="danger" dismissible onClose={() => setErrorListas('')}>
                {errorListas}
              </Alert>
            )}
            {loadingListas ? (
              <div className="text-center py-3"><Spinner animation="border" size="sm" /></div>
            ) : todasListas.length === 0 ? (
              <p className="text-muted text-center">Nenhuma lista cadastrada</p>
            ) : (
              todasListas.map((l) => (
                <div key={l.id} className={styles.checkItem}>
                  <div className={styles.checkInfo}>
                    <span className={styles.checkNome}>{l.nome}</span>
                  </div>
                  <Form.Check
                    type="switch"
                    id={`lista-${l.id}`}
                    checked={listasIds.has(l.id)}
                    onChange={() => toggleLista(l.id)}
                  />
                </div>
              ))
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModalListas(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={salvarListas} disabled={savingListas}>
              {savingListas ? <Spinner size="sm" animation="border" /> : 'Salvar'}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
}
