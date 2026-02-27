'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { Table, Alert, Spinner, Badge, Button, Modal, Form } from 'react-bootstrap';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import styles from './POPTemplates.module.css';
import { FaClipboard, FaPlus, FaEye } from 'react-icons/fa';

type TipoPOP = 'ABERTURA' | 'FECHAMENTO' | 'LIMPEZA' | 'OPERACIONAL' | 'PERSONALIZADO';

const TIPOS: TipoPOP[] = ['ABERTURA', 'FECHAMENTO', 'LIMPEZA', 'OPERACIONAL', 'PERSONALIZADO'];

const TIPO_VARIANT: Record<TipoPOP, string> = {
  ABERTURA: 'primary',
  FECHAMENTO: 'secondary',
  LIMPEZA: 'info',
  OPERACIONAL: 'warning',
  PERSONALIZADO: 'danger',
};

interface POPTemplate {
  id: number;
  nome: string;
  tipo: TipoPOP;
  descricao: string | null;
  ativo: boolean;
  _count: { execucoes: number };
}

interface TemplateForm {
  nome: string;
  tipo: TipoPOP;
  descricao: string;
}

const emptyForm: TemplateForm = { nome: '', tipo: 'ABERTURA', descricao: '' };

export default function AdminPOPTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<POPTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<TemplateForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/v1/admin/pop/templates');
      setTemplates(data);
    } catch {
      setError('Erro ao carregar templates POP');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const openModal = () => {
    setForm(emptyForm);
    setModalError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setForm(emptyForm);
    setModalError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      setModalError('O nome do template e obrigatorio.');
      return;
    }
    setSaving(true);
    setModalError('');
    try {
      const payload = {
        nome: form.nome.trim(),
        tipo: form.tipo,
        descricao: form.descricao.trim() || undefined,
        passos: [],
      };
      const { data } = await api.post('/v1/admin/pop/templates', payload);
      closeModal();
      router.push(`/admin/pop/templates/${data.id}`);
    } catch (err: any) {
      setModalError(err?.response?.data?.message || 'Erro ao criar template');
    } finally {
      setSaving(false);
    }
  };

  const handleFormChange = (field: keyof TemplateForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <h2 className={styles.pageTitle}>
            <FaClipboard className="me-2" />
            Templates POP
          </h2>
          <Button variant="primary" onClick={openModal}>
            <FaPlus className="me-1" /> Novo Template
          </Button>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
          </div>
        ) : templates.length === 0 ? (
          <div className={styles.emptyState}>
            <FaClipboard className={styles.emptyIcon} />
            <h3 className={styles.emptyTitle}>Nenhum template cadastrado</h3>
            <p className={styles.emptyText}>
              Clique em &ldquo;Novo Template&rdquo; para criar o primeiro template POP.
            </p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <Table striped bordered hover responsive className={styles.table}>
              <thead>
                <tr className={styles.tableHeader}>
                  <th className={styles.tableHeaderCell}>#</th>
                  <th className={styles.tableHeaderCell}>Nome</th>
                  <th className={styles.tableHeaderCell}>Tipo</th>
                  <th className={styles.tableHeaderCell}>Passos</th>
                  <th className={styles.tableHeaderCell}>Status</th>
                  <th className={styles.tableHeaderCell} style={{ width: 100 }}>
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id} className={styles.tableRow}>
                    <td className={styles.tableCell}>{t.id}</td>
                    <td className={`${styles.tableCell} fw-semibold`}>{t.nome}</td>
                    <td className={styles.tableCell}>
                      <Badge bg={TIPO_VARIANT[t.tipo]}>{t.tipo}</Badge>
                    </td>
                    <td className={styles.tableCell}>{t._count.execucoes}</td>
                    <td className={styles.tableCell}>
                      <Badge bg={t.ativo ? 'success' : 'secondary'}>
                        {t.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.actionButtons}>
                        <Link href={`/admin/pop/templates/${t.id}`} passHref>
                          <Button size="sm" variant="outline-primary" title="Ver / Editar">
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

        {/* Modal: Novo Template */}
        <Modal show={showModal} onHide={closeModal}>
          <Form onSubmit={handleSubmit}>
            <Modal.Header closeButton>
              <Modal.Title>Novo Template POP</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {modalError && (
                <Alert variant="danger" dismissible onClose={() => setModalError('')}>
                  {modalError}
                </Alert>
              )}
              <Form.Group className="mb-3">
                <Form.Label>
                  Nome <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  value={form.nome}
                  onChange={(e) => handleFormChange('nome', e.target.value)}
                  placeholder="Ex: Abertura do restaurante"
                  required
                  autoFocus
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>
                  Tipo <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  value={form.tipo}
                  onChange={(e) => handleFormChange('tipo', e.target.value)}
                >
                  {TIPOS.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Descricao</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={form.descricao}
                  onChange={(e) => handleFormChange('descricao', e.target.value)}
                  placeholder="Descricao opcional do template..."
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
                    <Spinner animation="border" size="sm" className="me-1" /> Criando...
                  </>
                ) : (
                  'Criar e Editar Passos'
                )}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      </div>
    </div>
  );
}
