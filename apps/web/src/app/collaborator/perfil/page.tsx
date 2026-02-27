'use client';

import { useState, useEffect, useRef } from 'react';
import { Container, Form, Button, Alert, Spinner, Card, Badge, Row, Col } from 'react-bootstrap';
import { FaUser, FaEnvelope, FaIdCard, FaSignOutAlt, FaSave, FaLock, FaKey, FaCamera } from 'react-icons/fa';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import AvatarCropModal from '@/components/AvatarCropModal';

interface Profile {
  id: number;
  nome: string;
  username: string | null;
  email: string;
  role: string;
  aprovado: boolean;
  avatarUrl?: string | null;
  restaurante: { id: number; nome: string } | null;
}

export default function PerfilColaborador() {
  const { logout, updateAvatarUrl } = useAuth();
  const { success, error } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({ nome: '', username: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [senhaData, setSenhaData] = useState({ senhaAtual: '', novaSenha: '', confirmar: '' });
  const [senhaError, setSenhaError] = useState('');
  const [savingSenha, setSavingSenha] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get('/v1/auth/profile')
      .then((r) => {
        setProfile(r.data);
        setFormData({ nome: r.data.nome, username: r.data.username ?? '', email: r.data.email });
        setAvatarUrl(r.data.avatarUrl ?? null);
      })
      .catch(() => error('Erro ao carregar', 'Não foi possível carregar o perfil'))
      .finally(() => setLoading(false));
  }, []);

  const hasChanges = profile
    ? formData.nome !== profile.nome ||
      formData.email !== profile.email ||
      formData.username !== (profile.username ?? '')
    : false;

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim() || !formData.email.trim()) {
      error('Campos obrigatórios', 'Nome e email são obrigatórios');
      return;
    }
    setSaving(true);
    try {
      await api.put('/v1/auth/profile', formData);
      success('Perfil atualizado', 'Suas informações foram salvas com sucesso');
      const r = await api.get('/v1/auth/profile');
      setProfile(r.data);
    } catch (err: any) {
      error('Erro ao salvar', err.response?.data?.message ?? 'Não foi possível atualizar o perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleSenhaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSenhaError('');
    if (!senhaData.senhaAtual || !senhaData.novaSenha) {
      setSenhaError('Preencha todos os campos');
      return;
    }
    if (senhaData.novaSenha.length < 6) {
      setSenhaError('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (senhaData.novaSenha !== senhaData.confirmar) {
      setSenhaError('As senhas não coincidem');
      return;
    }
    setSavingSenha(true);
    try {
      await api.post('/v1/auth/change-password', {
        senhaAtual: senhaData.senhaAtual,
        novaSenha: senhaData.novaSenha,
      });
      success('Senha alterada', 'Sua nova senha já está ativa');
      setSenhaData({ senhaAtual: '', novaSenha: '', confirmar: '' });
    } catch (err: any) {
      setSenhaError(err.response?.data?.message ?? 'Erro ao alterar senha');
    } finally {
      setSavingSenha(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      error('Arquivo muito grande', 'A imagem deve ter no máximo 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropConfirm = async (base64: string) => {
    setShowCropModal(false);
    setSavingAvatar(true);
    try {
      await api.put('/v1/auth/avatar', { avatarBase64: base64 });
      setAvatarUrl(base64);
      updateAvatarUrl(base64);
      success('Foto atualizada', 'Sua foto de perfil foi salva com sucesso');
    } catch {
      error('Erro ao salvar foto', 'Não foi possível atualizar a foto de perfil');
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setSavingAvatar(true);
    try {
      await api.delete('/v1/auth/avatar');
      setAvatarUrl(null);
      updateAvatarUrl(null);
      success('Foto removida', 'Sua foto de perfil foi removida');
    } catch {
      error('Erro ao remover foto', 'Não foi possível remover a foto de perfil');
    } finally {
      setSavingAvatar(false);
    }
  };

  if (loading) return (
    <Container className="py-4 text-center">
      <Spinner animation="border" variant="primary" />
      <p className="mt-2">Carregando perfil...</p>
    </Container>
  );

  const roleLabel = profile?.role === 'SUPER_ADMIN' ? 'Super Admin'
    : profile?.role === 'ADMIN' ? 'Administrador' : 'Colaborador';

  return (
    <>
      <Container className="py-4" style={{ maxWidth: 640 }}>
        <h2 className="mb-4"><FaUser className="me-2" />Meu Perfil</h2>

        {/* Avatar */}
        <Card className="mb-4 shadow-sm">
          <Card.Header><strong><FaCamera className="me-2" />Foto de Perfil</strong></Card.Header>
          <Card.Body className="d-flex align-items-center gap-4">
            {/* Avatar display + click to change */}
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid #dee2e6' }}
                />
              ) : (
                <div style={{
                  width: 80, height: 80, borderRadius: '50%', background: '#6c757d',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '2rem', fontWeight: 700, border: '2px solid #dee2e6'
                }}>
                  {profile?.nome?.charAt(0).toUpperCase() ?? <FaUser />}
                </div>
              )}
              <div style={{
                position: 'absolute', bottom: 0, right: 0, background: '#0d6efd',
                borderRadius: '50%', width: 24, height: 24, display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.7rem'
              }}>
                <FaCamera />
              </div>
            </div>

            <div className="d-flex flex-column gap-2">
              <Button variant="outline-primary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={savingAvatar}>
                <FaCamera className="me-1" /> Alterar foto
              </Button>
              {avatarUrl && (
                <Button variant="outline-danger" size="sm" onClick={handleRemoveAvatar} disabled={savingAvatar}>
                  Remover foto
                </Button>
              )}
              <small className="text-muted">JPG, PNG · Max 5MB</small>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </Card.Body>
        </Card>

        {/* Informações Pessoais */}
        <Card className="mb-4 shadow-sm">
          <Card.Header><strong>Informações Pessoais</strong></Card.Header>
          <Card.Body>
            <Form onSubmit={handleProfileSubmit}>
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

        {/* Mudar Senha */}
        <Card className="mb-4 shadow-sm">
          <Card.Header><strong><FaKey className="me-2" />Mudar Senha</strong></Card.Header>
          <Card.Body>
            {senhaError && <Alert variant="danger" dismissible onClose={() => setSenhaError('')}>{senhaError}</Alert>}
            <Form onSubmit={handleSenhaSubmit}>
              <Form.Group className="mb-3">
                <Form.Label><FaLock className="me-1" /> Senha Atual *</Form.Label>
                <Form.Control
                  type="password"
                  value={senhaData.senhaAtual}
                  onChange={(e) => setSenhaData((p) => ({ ...p, senhaAtual: e.target.value }))}
                  disabled={savingSenha}
                  autoComplete="current-password"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label><FaLock className="me-1" /> Nova Senha * (min. 6 caracteres)</Form.Label>
                <Form.Control
                  type="password"
                  value={senhaData.novaSenha}
                  onChange={(e) => setSenhaData((p) => ({ ...p, novaSenha: e.target.value }))}
                  disabled={savingSenha}
                  autoComplete="new-password"
                />
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label><FaLock className="me-1" /> Confirmar Nova Senha *</Form.Label>
                <Form.Control
                  type="password"
                  value={senhaData.confirmar}
                  onChange={(e) => setSenhaData((p) => ({ ...p, confirmar: e.target.value }))}
                  disabled={savingSenha}
                  autoComplete="new-password"
                  isInvalid={!!senhaData.confirmar && senhaData.confirmar !== senhaData.novaSenha}
                />
                <Form.Control.Feedback type="invalid">As senhas não coincidem</Form.Control.Feedback>
              </Form.Group>

              <Button type="submit" variant="warning" disabled={savingSenha}>
                <FaKey className="me-1" />
                {savingSenha ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </Form>
          </Card.Body>
        </Card>

        {/* Informações da Conta */}
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

      <AvatarCropModal
        show={showCropModal}
        imageSrc={cropSrc ?? ''}
        onConfirm={handleCropConfirm}
        onCancel={() => setShowCropModal(false)}
      />
    </>
  );
}
