'use client';

import { useState, useEffect, Suspense, FormEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Alert, Button, Spinner, Form, Card } from 'react-bootstrap';
import Link from 'next/link';
import { FaEnvelope, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

interface DadosConvite {
  role: string;
  email: string | null;
  expiresAt: string;
  restaurante?: string;
}

function formatarRole(role: string): string {
  if (role === 'ADMIN') return 'Administrador';
  if (role === 'COLLABORATOR') return 'Colaborador';
  return role;
}

function ConviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dados, setDados] = useState<DadosConvite | null>(null);

  // Formulario de registro embutido
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [senha, setSenha] = useState('');
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Token de convite nao informado.');
      setLoading(false);
      return;
    }

    const validar = async () => {
      try {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const res = await fetch(
          `${apiUrl}/v1/convites/validar?token=${encodeURIComponent(token)}`,
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.message || 'Convite invalido ou expirado.');
          setLoading(false);
          return;
        }
        const data: DadosConvite = await res.json();
        setDados(data);
        if (data.email) {
          setEmail(data.email);
        }
      } catch {
        setError('Nao foi possivel validar o convite. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    validar();
  }, [token]);

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setRegistering(true);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const res = await fetch(`${apiUrl}/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, username, senha, token }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRegisterError(body.message || 'Erro ao criar conta.');
        return;
      }
      setRegistered(true);
    } catch {
      setRegisterError('Erro de conexao. Tente novamente.');
    } finally {
      setRegistering(false);
    }
  };

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '2rem 1rem',
  };

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 460,
    borderRadius: 16,
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    border: 'none',
    padding: '2rem',
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <Card style={cardStyle} className="text-center">
          <Spinner animation="border" style={{ color: '#667eea', margin: '2rem auto' }} />
          <p className="text-muted">Validando convite...</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <Card style={cardStyle}>
          <div className="text-center mb-3">
            <FaTimesCircle style={{ fontSize: '3rem', color: '#ef4444' }} />
          </div>
          <Alert variant="danger">{error}</Alert>
          <div className="text-center mt-3">
            <Link href="/login">
              <Button variant="outline-primary">Ir para o Login</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (registered) {
    return (
      <div style={containerStyle}>
        <Card style={cardStyle}>
          <div className="text-center mb-3">
            <FaCheckCircle style={{ fontSize: '3rem', color: '#22c55e' }} />
          </div>
          <h4 className="text-center mb-2">Conta criada com sucesso!</h4>
          <p className="text-center text-muted mb-4">
            Voce ja pode fazer login com as suas credenciais.
          </p>
          <Button
            variant="primary"
            style={{ width: '100%' }}
            onClick={() => router.push('/login')}
          >
            Ir para o Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <Card style={cardStyle}>
        <div className="text-center mb-4">
          <FaEnvelope style={{ fontSize: '2.5rem', color: '#667eea' }} />
          <h3 style={{ marginTop: '0.75rem', fontWeight: 700 }}>Voce foi convidado!</h3>
          {dados?.restaurante && (
            <p className="text-muted mb-1">
              Restaurante: <strong>{dados.restaurante}</strong>
            </p>
          )}
          <p className="text-muted mb-0">
            Perfil: <strong>{formatarRole(dados?.role || '')}</strong>
          </p>
        </div>

        <hr />

        <h5 className="mb-3">Criar sua conta</h5>

        {registerError && (
          <Alert variant="danger" dismissible onClose={() => setRegisterError('')}>
            {registerError}
          </Alert>
        )}

        <Form onSubmit={handleRegister}>
          <Form.Group className="mb-3">
            <Form.Label>Nome completo</Form.Label>
            <Form.Control
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              required
              readOnly={!!dados?.email}
            />
            {dados?.email && (
              <Form.Text className="text-muted">
                Email definido pelo convite.
              </Form.Text>
            )}
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Username</Form.Label>
            <Form.Control
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="nome_usuario"
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Senha</Form.Label>
            <Form.Control
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Minimo 6 caracteres"
              required
              minLength={6}
            />
          </Form.Group>

          <Button
            type="submit"
            variant="primary"
            style={{ width: '100%' }}
            disabled={registering}
          >
            {registering ? (
              <>
                <Spinner animation="border" size="sm" className="me-1" />
                Criando conta...
              </>
            ) : (
              'Criar conta'
            )}
          </Button>
        </Form>

        <p className="text-center text-muted mt-3 mb-0" style={{ fontSize: '0.875rem' }}>
          Ja tem conta?{' '}
          <Link href="/login" style={{ color: '#667eea' }}>
            Fazer login
          </Link>
        </p>
      </Card>
    </div>
  );
}

export default function ConvitePage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Spinner animation="border" />
        </div>
      }
    >
      <ConviteContent />
    </Suspense>
  );
}
