'use client';

import { useState, useEffect } from 'react';
import { Container, Form, Button, Alert, Spinner, Card, Badge, Row, Col } from 'react-bootstrap';
import { FaUser, FaEnvelope, FaIdCard, FaSignOutAlt, FaSave } from 'react-icons/fa';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Profile {
  id: number;
  nome: string;
  username: string | null;
  email: string;
  role: string;
  aprovado: boolean;
  restaurante: { id: number; nome: string } | null;
}

export default function EditarPerfilAdmin() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({ nome: '', username: '', email: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/v1/auth/profile')
      .then((r) => {
        setProfile(r.data);
        setFormData({ nome: r.data.nome, username: r.data.username ?? '', email: r.data.email });
      })
      .catch(() => setError('Erro ao carregar perfil'))
      .finally(() => setLoading(false));
  }, []);

  const hasChanges = profile
    ? formData.nome !== profile.nome ||
      formData.email !== profile.email ||
      formData.username !== (profile.username ?? '')
    : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim() || !formData.email.trim()) {
      setError('Nome e email são obrigatórios');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.put('/v1/auth/profile', formData);
      setSuccess('Perfil atualizado com sucesso!');
      // Refresh profile
      const r = await api.get('/v1/auth/profile');
      setProfile(r.data);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <Container className="py-4 text-center">
      <Spinner animation="border" variant="primary" />
      <p className="mt-2">Carregando perfil...</p>
    </Container>
  );

  const roleLabel = profile?.role === 'SUPER_ADMIN' ? 'Super Administrador'
    : profile?.role === 'ADMIN' ? 'Administrador' : 'Colaborador';

  return (
    <Container className="py-4" style={{ maxWidth: 640 }}>
      <h2 className="mb-4"><FaUser className="me-2" />Editar Perfil</h2>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Card className="mb-4 shadow-sm">
        <Card.Header><strong>Informações Pessoais</strong></Card.Header>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label><FaIdCard className="me-1" /> Nome Completo *</Form.Label>
              <Form.Control
                value={formData.nome}
                onChange={(e) => setFormData((p) => ({ ...p, nome: e.target.value }))}
                disabled={saving}
                placeholder="Seu nome completo"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label><FaUser className="me-1" /> Nome de Usuário (opcional)</Form.Label>
              <Form.Control
                value={formData.username}
                onChange={(e) => setFormData((p) => ({ ...p, username: e.target.value }))}
                disabled={saving}
                placeholder="Nome de usuário único"
              />
              <Form.Text className="text-muted">Pode ser usado para login no lugar do email</Form.Text>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label><FaEnvelope className="me-1" /> Email *</Form.Label>
              <Form.Control
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                disabled={saving}
                placeholder="Seu email"
              />
            </Form.Group>

            <div className="d-flex gap-2 flex-wrap">
              <Button type="submit" variant="primary" disabled={saving || !hasChanges}>
                <FaSave className="me-1" />
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
              <Button variant="outline-secondary" onClick={() => {
                if (profile) setFormData({ nome: profile.nome, username: profile.username ?? '', email: profile.email });
                setError(''); setSuccess('');
              }} disabled={saving || !hasChanges}>
                Resetar
              </Button>
              <Button variant="outline-danger" onClick={logout} disabled={saving}>
                <FaSignOutAlt className="me-1" /> Sair
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {profile && (
        <Card className="shadow-sm">
          <Card.Header><strong>Informações da Conta</strong></Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col sm={6}>
                <small className="text-muted d-block">Tipo de Conta</small>
                <Badge bg={profile.role === 'SUPER_ADMIN' ? 'danger' : profile.role === 'ADMIN' ? 'warning' : 'primary'}>
                  {roleLabel}
                </Badge>
              </Col>
              <Col sm={6}>
                <small className="text-muted d-block">Status</small>
                <Badge bg={profile.aprovado ? 'success' : 'secondary'}>
                  {profile.aprovado ? 'Aprovado' : 'Pendente'}
                </Badge>
              </Col>
              {profile.restaurante && (
                <Col sm={12}>
                  <small className="text-muted d-block">Restaurante</small>
                  <strong>{profile.restaurante.nome}</strong>
                </Col>
              )}
            </Row>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}
