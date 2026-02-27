'use client';

import { useState, useEffect, FormEvent } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Alert,
  Spinner,
  Badge,
} from 'react-bootstrap';
import Link from 'next/link';
import api from '@/lib/api';
import styles from './Fornecedores.module.css';
import { FaPlus, FaTruck, FaEdit, FaToggleOff, FaToggleOn, FaEye } from 'react-icons/fa';

interface Fornecedor {
  id: number;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
  _count: { itens: number };
}

interface FornecedorForm {
  nome: string;
  cnpj: string;
  telefone: string;
  email: string;
}

const emptyForm: FornecedorForm = { nome: '', cnpj: '', telefone: '', email: '' };

export default function FornecedoresPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mostrarInativos, setMostrarInativos] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Fornecedor | null>(null);
  const [form, setForm] = useState<FornecedorForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const fetchFornecedores = async () => {
    try {
      setLoading(true);
      const params = mostrarInativos ? {} : { ativo: true };
      const { data } = await api.get('/v1/admin/fornecedores', { params });
      setFornecedores(data);
    } catch {
      setError('Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFornecedores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarInativos]);

  const openModal = (fornecedor?: Fornecedor) => {
    if (fornecedor) {
      setEditing(fornecedor);
      setForm({
        nome: fornecedor.nome,
        cnpj: fornecedor.cnpj ?? '',
        telefone: fornecedor.telefone ?? '',
        email: fornecedor.email ?? '',
      });
    } else {
      setEditing(null);
      setForm(emptyForm);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm);
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        nome: form.nome,
        cnpj: form.cnpj || undefined,
        telefone: form.telefone || undefined,
        email: form.email || undefined,
      };
      if (editing) {
        await api.put(`/v1/admin/fornecedores/${editing.id}`, payload);
      } else {
        await api.post('/v1/admin/fornecedores', payload);
      }
      closeModal();
      fetchFornecedores();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar fornecedor');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAtivo = async (fornecedor: Fornecedor) => {
    const acao = fornecedor.ativo ? 'desativar' : 'reativar';
    if (!confirm(`Deseja ${acao} o fornecedor "${fornecedor.nome}"?`)) return;
    setTogglingId(fornecedor.id);
    try {
      if (fornecedor.ativo) {
        await api.delete(`/v1/admin/fornecedores/${fornecedor.id}`);
      } else {
        await api.put(`/v1/admin/fornecedores/${fornecedor.id}`, { ativo: true });
      }
      fetchFornecedores();
    } catch {
      setError(`Erro ao ${acao} fornecedor`);
    } finally {
      setTogglingId(null);
    }
  };

  const handleFormChange = (field: keyof FornecedorForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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
          <h2 className={styles.pageTitle}>Fornecedores</h2>
          <Button variant="primary" onClick={() => openModal()}>
            <FaPlus className="me-1" /> Novo Fornecedor
          </Button>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <div className={styles.filtersBar}>
          <Form.Check
            type="switch"
            id="mostrar-inativos"
            label="Mostrar inativos"
            checked={mostrarInativos}
            onChange={(e) => setMostrarInativos(e.target.checked)}
          />
          <span className="text-muted" style={{ fontSize: '0.9rem' }}>
            {fornecedores.length} fornecedor{fornecedores.length !== 1 ? 'es' : ''} encontrado
            {fornecedores.length !== 1 ? 's' : ''}
          </span>
        </div>

        {fornecedores.length === 0 ? (
          <div className={styles.emptyState}>
            <FaTruck className={styles.emptyIcon} />
            <h3 className={styles.emptyTitle}>Nenhum fornecedor cadastrado</h3>
            <p className={styles.emptyText}>
              Clique em &ldquo;Novo Fornecedor&rdquo; para adicionar o primeiro
            </p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <Table striped bordered hover responsive className={styles.table}>
              <thead>
                <tr className={styles.tableHeader}>
                  <th className={styles.tableHeaderCell}>Nome</th>
                  <th className={styles.tableHeaderCell}>CNPJ</th>
                  <th className={styles.tableHeaderCell}>Telefone</th>
                  <th className={styles.tableHeaderCell}>Email</th>
                  <th className={styles.tableHeaderCell} style={{ width: 90 }}>
                    N&ordm; Itens
                  </th>
                  <th className={styles.tableHeaderCell} style={{ width: 110 }}>
                    Status
                  </th>
                  <th className={styles.tableHeaderCell} style={{ width: 210 }}>
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody>
                {fornecedores.map((f) => (
                  <tr key={f.id} className={styles.tableRow}>
                    <td className={`${styles.tableCell} fw-semibold`}>{f.nome}</td>
                    <td className={styles.tableCell}>
                      {f.cnpj ?? <span className={styles.cellMuted}>—</span>}
                    </td>
                    <td className={styles.tableCell}>
                      {f.telefone ?? <span className={styles.cellMuted}>—</span>}
                    </td>
                    <td className={styles.tableCell}>
                      {f.email ?? <span className={styles.cellMuted}>—</span>}
                    </td>
                    <td className={styles.tableCell}>{f._count.itens}</td>
                    <td className={styles.tableCell}>
                      <Badge bg={f.ativo ? 'success' : 'secondary'}>
                        {f.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.actionButtons}>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => openModal(f)}
                          title="Editar"
                        >
                          <FaEdit />
                        </Button>
                        <Button
                          size="sm"
                          variant={f.ativo ? 'outline-warning' : 'outline-success'}
                          onClick={() => handleToggleAtivo(f)}
                          disabled={togglingId === f.id}
                          title={f.ativo ? 'Desativar' : 'Reativar'}
                        >
                          {togglingId === f.id ? (
                            <Spinner animation="border" size="sm" />
                          ) : f.ativo ? (
                            <FaToggleOff />
                          ) : (
                            <FaToggleOn />
                          )}
                        </Button>
                        <Link href={`/admin/fornecedores/${f.id}`} passHref>
                          <Button size="sm" variant="outline-secondary" title="Ver Itens">
                            <FaEye />
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        {/* Modal Criar / Editar */}
        <Modal show={showModal} onHide={closeModal}>
          <Form onSubmit={handleSubmit}>
            <Modal.Header closeButton>
              <Modal.Title>
                {editing ? 'Editar Fornecedor' : 'Novo Fornecedor'}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {error && (
                <Alert variant="danger" dismissible onClose={() => setError('')}>
                  {error}
                </Alert>
              )}
              <Form.Group className="mb-3">
                <Form.Label>
                  Nome <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  value={form.nome}
                  onChange={(e) => handleFormChange('nome', e.target.value)}
                  placeholder="Ex: Distribuidora ABC"
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>CNPJ</Form.Label>
                <Form.Control
                  value={form.cnpj}
                  onChange={(e) => handleFormChange('cnpj', e.target.value)}
                  placeholder="00.000.000/0000-00"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Telefone</Form.Label>
                <Form.Control
                  value={form.telefone}
                  onChange={(e) => handleFormChange('telefone', e.target.value)}
                  placeholder="(11) 99999-0000"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  value={form.email}
                  onChange={(e) => handleFormChange('email', e.target.value)}
                  placeholder="contato@fornecedor.com"
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={closeModal} disabled={saving}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-1" /> Salvando...
                  </>
                ) : editing ? (
                  'Salvar'
                ) : (
                  'Criar'
                )}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      </div>
    </div>
  );
}
