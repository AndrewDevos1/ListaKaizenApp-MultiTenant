'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Alert, Spinner, Badge, Button, Modal, Form } from 'react-bootstrap';
import api from '@/lib/api';
import styles from './POPTemplateDetail.module.css';
import { FaClipboard, FaEdit, FaTrash, FaPlus } from 'react-icons/fa';

type TipoPOP = 'ABERTURA' | 'FECHAMENTO' | 'LIMPEZA' | 'PREPARACAO' | 'SEGURANCA';

const TIPOS: TipoPOP[] = ['ABERTURA', 'FECHAMENTO', 'LIMPEZA', 'PREPARACAO', 'SEGURANCA'];

const TIPO_VARIANT: Record<TipoPOP, string> = {
  ABERTURA: 'primary',
  FECHAMENTO: 'secondary',
  LIMPEZA: 'info',
  PREPARACAO: 'warning',
  SEGURANCA: 'danger',
};

interface Passo {
  id: number;
  descricao: string;
  ordem: number;
}

interface POPTemplate {
  id: number;
  nome: string;
  tipo: TipoPOP;
  descricao: string | null;
  ativo: boolean;
  passos: Passo[];
}

interface EditForm {
  nome: string;
  tipo: TipoPOP;
  descricao: string;
}

interface PassoForm {
  descricao: string;
  ordem: string;
}

const emptyPassoForm: PassoForm = { descricao: '', ordem: '' };

export default function AdminPOPTemplateDetailPage() {
  const params = useParams();
  const templateId = params.id as string;

  const [template, setTemplate] = useState<POPTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({ nome: '', tipo: 'ABERTURA', descricao: '' });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const [passoForm, setPassoForm] = useState<PassoForm>(emptyPassoForm);
  const [addingPasso, setAddingPasso] = useState(false);
  const [passoError, setPassoError] = useState('');
  const [deletingPassoId, setDeletingPassoId] = useState<number | null>(null);

  const fetchTemplate = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/v1/admin/pop/templates/${templateId}`);
      setTemplate(data);
    } catch {
      setError('Erro ao carregar template POP');
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  const openEditModal = () => {
    if (!template) return;
    setEditForm({
      nome: template.nome,
      tipo: template.tipo,
      descricao: template.descricao ?? '',
    });
    setEditError('');
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditError('');
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editForm.nome.trim()) {
      setEditError('O nome e obrigatorio.');
      return;
    }
    setSaving(true);
    setEditError('');
    try {
      await api.put(`/v1/admin/pop/templates/${templateId}`, {
        nome: editForm.nome.trim(),
        tipo: editForm.tipo,
        descricao: editForm.descricao.trim() || undefined,
      });
      setSuccess('Template atualizado com sucesso!');
      closeEditModal();
      fetchTemplate();
    } catch (err: any) {
      setEditError(err?.response?.data?.message || 'Erro ao atualizar template');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPasso = async (e: FormEvent) => {
    e.preventDefault();
    if (!passoForm.descricao.trim()) {
      setPassoError('A descricao do passo e obrigatoria.');
      return;
    }
    setAddingPasso(true);
    setPassoError('');
    try {
      await api.post(`/v1/admin/pop/templates/${templateId}/passos`, {
        descricao: passoForm.descricao.trim(),
        ordem: passoForm.ordem ? Number(passoForm.ordem) : (template?.passos.length ?? 0) + 1,
      });
      setPassoForm(emptyPassoForm);
      fetchTemplate();
    } catch (err: any) {
      setPassoError(err?.response?.data?.message || 'Erro ao adicionar passo');
    } finally {
      setAddingPasso(false);
    }
  };

  const handleDeletePasso = async (passoId: number) => {
    if (!confirm('Remover este passo?')) return;
    setDeletingPassoId(passoId);
    setError('');
    try {
      await api.delete(`/v1/admin/pop/passos/${passoId}`);
      fetchTemplate();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao remover passo');
    } finally {
      setDeletingPassoId(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  if (!template) {
    return <Alert variant="danger">Template POP nao encontrado.</Alert>;
  }

  const passosOrdenados = [...template.passos].sort((a, b) => a.ordem - b.ordem);

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <Link href="/admin/pop/templates" className={styles.backButton}>
          ← Voltar para Templates
        </Link>

        {/* Cabecalho */}
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <h1
              className={styles.templateTitle}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
            >
              <FaClipboard />
              {template.nome}
            </h1>
            <div className={styles.templateMeta}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Tipo:</span>
                <Badge bg={TIPO_VARIANT[template.tipo]}>{template.tipo}</Badge>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Status:</span>
                <Badge bg={template.ativo ? 'success' : 'secondary'}>
                  {template.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Passos:</span>
                {template.passos.length}
              </div>
            </div>
            {template.descricao && (
              <p className={styles.descricao}>{template.descricao}</p>
            )}
          </div>
          <div className={styles.headerActions}>
            <Button variant="outline-primary" onClick={openEditModal}>
              <FaEdit className="me-1" /> Editar
            </Button>
          </div>
        </div>

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

        {/* Passos */}
        <div className={styles.passosSection}>
          <h2 className={styles.sectionTitle}>Passos ({template.passos.length})</h2>

          {passosOrdenados.length === 0 ? (
            <div className={styles.emptyPassos}>
              Nenhum passo adicionado ainda. Use o formulario abaixo para comecar.
            </div>
          ) : (
            passosOrdenados.map((passo) => (
              <div key={passo.id} className={styles.passoItem}>
                <div className={styles.passoOrdem}>{passo.ordem}</div>
                <p className={styles.passoDescricao}>{passo.descricao}</p>
                <Button
                  size="sm"
                  variant="outline-danger"
                  title="Remover passo"
                  onClick={() => handleDeletePasso(passo.id)}
                  disabled={deletingPassoId === passo.id}
                >
                  {deletingPassoId === passo.id ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <FaTrash />
                  )}
                </Button>
              </div>
            ))
          )}

          {/* Formulario adicionar passo */}
          <div className={styles.addPassoForm}>
            <h4 className={styles.addPassoTitle}>Adicionar Passo</h4>
            {passoError && (
              <Alert variant="danger" dismissible onClose={() => setPassoError('')}>
                {passoError}
              </Alert>
            )}
            <Form onSubmit={handleAddPasso}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <Form.Label>
                    Descricao <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={passoForm.descricao}
                    onChange={(e) =>
                      setPassoForm((prev) => ({ ...prev, descricao: e.target.value }))
                    }
                    placeholder="Ex: Verificar temperatura do equipamento"
                    required
                  />
                </div>
                <div style={{ minWidth: '100px' }}>
                  <Form.Label>Ordem</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={passoForm.ordem}
                    onChange={(e) =>
                      setPassoForm((prev) => ({ ...prev, ordem: e.target.value }))
                    }
                    placeholder="Auto"
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <Button type="submit" variant="primary" disabled={addingPasso}>
                    {addingPasso ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      <>
                        <FaPlus className="me-1" /> Adicionar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Form>
          </div>
        </div>

        {/* Modal: Editar Template */}
        <Modal show={showEditModal} onHide={closeEditModal}>
          <Form onSubmit={handleEditSubmit}>
            <Modal.Header closeButton>
              <Modal.Title>Editar Template POP</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {editError && (
                <Alert variant="danger" dismissible onClose={() => setEditError('')}>
                  {editError}
                </Alert>
              )}
              <Form.Group className="mb-3">
                <Form.Label>
                  Nome <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  value={editForm.nome}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, nome: e.target.value }))}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>
                  Tipo <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  value={editForm.tipo}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, tipo: e.target.value as TipoPOP }))
                  }
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
                  value={editForm.descricao}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, descricao: e.target.value }))
                  }
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={closeEditModal} disabled={saving}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-1" /> Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      </div>
    </div>
  );
}
