'use client';

import { useState } from 'react';
import { Container, Form, Button, Alert, Card } from 'react-bootstrap';
import { FaKey, FaLock } from 'react-icons/fa';
import api from '@/lib/api';

export default function MudarSenhaColaborador() {
  const [formData, setFormData] = useState({ senhaAtual: '', novaSenha: '', confirmar: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!formData.senhaAtual || !formData.novaSenha) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }
    if (formData.novaSenha.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (formData.novaSenha !== formData.confirmar) {
      setError('As senhas não coincidem');
      return;
    }
    setSaving(true);
    try {
      await api.post('/v1/auth/change-password', {
        senhaAtual: formData.senhaAtual,
        novaSenha: formData.novaSenha,
      });
      setSuccess('Senha alterada com sucesso!');
      setFormData({ senhaAtual: '', novaSenha: '', confirmar: '' });
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao alterar senha');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container className="py-4" style={{ maxWidth: 480 }}>
      <h2 className="mb-4"><FaKey className="me-2" />Mudar Senha</h2>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Card className="shadow-sm">
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label><FaLock className="me-1" /> Senha Atual *</Form.Label>
              <Form.Control
                type="password"
                value={formData.senhaAtual}
                onChange={(e) => setFormData((p) => ({ ...p, senhaAtual: e.target.value }))}
                disabled={saving}
                autoComplete="current-password"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label><FaLock className="me-1" /> Nova Senha * (mín. 6 caracteres)</Form.Label>
              <Form.Control
                type="password"
                value={formData.novaSenha}
                onChange={(e) => setFormData((p) => ({ ...p, novaSenha: e.target.value }))}
                disabled={saving}
                autoComplete="new-password"
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label><FaLock className="me-1" /> Confirmar Nova Senha *</Form.Label>
              <Form.Control
                type="password"
                value={formData.confirmar}
                onChange={(e) => setFormData((p) => ({ ...p, confirmar: e.target.value }))}
                disabled={saving}
                autoComplete="new-password"
                isInvalid={!!formData.confirmar && formData.confirmar !== formData.novaSenha}
              />
              <Form.Control.Feedback type="invalid">As senhas não coincidem</Form.Control.Feedback>
            </Form.Group>

            <Button type="submit" variant="primary" disabled={saving} className="w-100">
              <FaKey className="me-1" />
              {saving ? 'Alterando...' : 'Alterar Senha'}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}
