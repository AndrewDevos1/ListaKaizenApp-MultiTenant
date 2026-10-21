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
import api from '@/lib/api';
import { FaEnvelope, FaPlus, FaBan, FaCopy, FaCheck } from 'react-icons/fa';

interface Convite {
  id: number;
  email: string | null;
  role: string;
  token: string;
  status: 'Válido' | 'Revogado' | 'Expirado';
  criadoEm: string;
  expiresAt: string;
}

interface ConviteForm {
  email: string;
  role: 'COLLABORATOR' | 'ADMIN';
  expiresInDays: number;
}

const emptyForm: ConviteForm = {
  email: '',
  role: 'COLLABORATOR',
  expiresInDays: 7,
};

function formatarData(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

function calcularStatus(convite: { revogado?: boolean; ativo?: boolean; expiresAt: string }): 'Válido' | 'Revogado' | 'Expirado' {
  if (convite.revogado || convite.ativo === false) return 'Revogado';
  if (new Date(convite.expiresAt) < new Date()) return 'Expirado';
  return 'Válido';
}

function statusVariant(status: string) {
  if (status === 'Válido') return 'success';
  if (status === 'Revogado') return 'danger';
  return 'secondary';
}

function gerarUrlConvite(token: string): string {
  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || '';
  return `${baseUrl}/convite?token=${token}`;
}

export default function ConvitesPage() {
  const [convites, setConvites] = useState<Convite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ConviteForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [urlGerada, setUrlGerada] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);

  const [revogandoId, setRevogandoId] = useState<number | null>(null);

  const fetchConvites = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/v1/admin/convites');
      // Normalizar status
      const normalized: Convite[] = data.map((c: any) => ({
        ...c,
        status: calcularStatus(c),
      }));
      setConvites(normalized);
    } catch {
      setError('Erro ao carregar convites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConvites();
  }, []);

  const openModal = () => {
    setForm(emptyForm);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        role: form.role,
        expiresInDays: form.expiresInDays,
      };
      if (form.email.trim()) {
        payload.email = form.email.trim();
      }
      const { data } = await api.post('/v1/admin/convites', payload);
      closeModal();
      fetchConvites();
      // Mostrar URL gerada
      const token = data.token || data.convite?.token;
      if (token) {
        setUrlGerada(gerarUrlConvite(token));
        setCopiado(false);
        setShowUrlModal(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao gerar convite');
    } finally {
      setSaving(false);
    }
  };

  const handleRevogar = async (id: number, email: string | null) => {
    const nome = email || `Convite #${id}`;
    if (!confirm(`Deseja revogar o convite "${nome}"?`)) return;
    setRevogandoId(id);
    try {
      await api.put(`/v1/admin/convites/${id}/revogar`);
      fetchConvites();
    } catch {
      setError('Erro ao revogar convite');
    } finally {
      setRevogandoId(null);
    }
  };

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(urlGerada);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // fallback: selecionar texto
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
    <div style={{ padding: '1.5rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
        }}
      >
        <h2 style={{ margin: 0 }}>
          <FaEnvelope className="me-2" style={{ color: '#667eea' }} />
          Convites
        </h2>
        <Button variant="primary" onClick={openModal}>
          <FaPlus className="me-1" /> Gerar Convite
        </Button>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {convites.length === 0 ? (
        <Alert variant="info">Nenhum convite gerado ainda.</Alert>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Criado em</th>
              <th>Expira em</th>
              <th style={{ width: 140 }}>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {convites.map((c) => (
              <tr key={c.id}>
                <td>{c.email || <span className="text-muted">Qualquer</span>}</td>
                <td>
                  <Badge bg={c.role === 'ADMIN' ? 'warning' : 'info'}>
                    {c.role}
                  </Badge>
                </td>
                <td>
                  <Badge bg={statusVariant(c.status)}>{c.status}</Badge>
                </td>
                <td>{formatarData(c.criadoEm)}</td>
                <td>{formatarData(c.expiresAt)}</td>
                <td>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      title="Copiar link"
                      onClick={() => {
                        setUrlGerada(gerarUrlConvite(c.token));
                        setCopiado(false);
                        setShowUrlModal(true);
                      }}
                    >
                      <FaCopy />
                    </Button>
                    {c.status === 'Válido' && (
                      <Button
                        size="sm"
                        variant="outline-danger"
                        title="Revogar"
                        onClick={() => handleRevogar(c.id, c.email)}
                        disabled={revogandoId === c.id}
                      >
                        {revogandoId === c.id ? (
                          <Spinner animation="border" size="sm" />
                        ) : (
                          <FaBan />
                        )}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Modal Gerar Convite */}
      <Modal show={showModal} onHide={closeModal}>
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>Gerar Convite</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {error && (
              <Alert variant="danger" dismissible onClose={() => setError('')}>
                {error}
              </Alert>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Email (opcional)</Form.Label>
              <Form.Control
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="convite@empresa.com"
              />
              <Form.Text className="text-muted">
                Se informado, apenas este email podera usar o convite.
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>
                Perfil <span className="text-danger">*</span>
              </Form.Label>
              <Form.Select
                value={form.role}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    role: e.target.value as 'COLLABORATOR' | 'ADMIN',
                  }))
                }
              >
                <option value="COLLABORATOR">Colaborador</option>
                <option value="ADMIN">Administrador</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Validade (dias)</Form.Label>
              <Form.Control
                type="number"
                min={1}
                max={365}
                value={form.expiresInDays}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    expiresInDays: parseInt(e.target.value) || 7,
                  }))
                }
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
                  <Spinner animation="border" size="sm" className="me-1" />
                  Gerando...
                </>
              ) : (
                'Gerar Convite'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal URL do Convite */}
      <Modal show={showUrlModal} onHide={() => setShowUrlModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Link do Convite</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted mb-2">
            Compartilhe o link abaixo com o convidado:
          </p>
          <div
            style={{
              background: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: 8,
              padding: '0.75rem 1rem',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              wordBreak: 'break-all',
              marginBottom: '0.75rem',
            }}
          >
            {urlGerada}
          </div>
          <Button
            variant={copiado ? 'success' : 'outline-primary'}
            onClick={handleCopiar}
            style={{ width: '100%' }}
          >
            {copiado ? (
              <>
                <FaCheck className="me-1" /> Copiado!
              </>
            ) : (
              <>
                <FaCopy className="me-1" /> Copiar link
              </>
            )}
          </Button>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUrlModal(false)}>
            Fechar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
