'use client';

import { useState, useEffect } from 'react';
import { Container, Card, Button, Form, Badge, Alert } from 'react-bootstrap';
import {
  FaCog, FaUser, FaSignOutAlt, FaMoon, FaSun, FaClock,
  FaSyncAlt, FaBell, FaBellSlash, FaMobileAlt, FaUserEdit,
} from 'react-icons/fa';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import InstallAppButton from '@/components/InstallAppButton';

const SESSION_TIMEOUTS = [
  { value: 5, label: '5 minutos — Alta segurança' },
  { value: 10, label: '10 minutos — Alta segurança' },
  { value: 15, label: '15 minutos — Alta segurança' },
  { value: 30, label: '30 minutos — Padrão (recomendado)' },
  { value: 45, label: '45 minutos — Balanceado' },
  { value: 60, label: '60 minutos — Conveniência' },
  { value: 90, label: '90 minutos — Conveniência' },
  { value: 120, label: '120 minutos — Máximo' },
];

export default function ConfiguracoesColaborador() {
  const { logout, user } = useAuth();
  const { success } = useToast();
  const { state: pushState, subscribe, unsubscribe } = usePushNotifications();

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(30);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const theme = localStorage.getItem('theme') || 'light';
    setIsDarkMode(theme === 'dark');

    const saved = localStorage.getItem('configSessionTimeout');
    if (saved) setSessionTimeout(parseInt(saved, 10));
  }, []);

  const handleToggleDarkMode = () => {
    const newState = !isDarkMode;
    setIsDarkMode(newState);
    const theme = newState ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    if (newState) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };

  const handleSaveSession = () => {
    localStorage.setItem('configSessionTimeout', sessionTimeout.toString());
    success('Configuração salva', `Timeout de sessão definido para ${sessionTimeout} minutos`);
  };

  const handleHardRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  return (
    <Container className="py-4" style={{ maxWidth: 680 }}>
      <h2 className="mb-4"><FaCog className="me-2" />Configurações</h2>

      {/* Conta */}
      <Card className="mb-4 shadow-sm">
        <Card.Header><strong><FaUser className="me-2" />Minha Conta</strong></Card.Header>
        <Card.Body>
          <p className="text-muted mb-3">
            Logado como <strong>{user?.nome}</strong>
            {' '}<Badge bg="primary" className="ms-1">Colaborador</Badge>
          </p>
          <div className="d-flex gap-2 flex-wrap">
            <Link href="/collaborator/perfil">
              <Button variant="outline-primary" size="sm">
                <FaUserEdit className="me-1" /> Editar Perfil
              </Button>
            </Link>
            <Button variant="outline-danger" size="sm" onClick={logout}>
              <FaSignOutAlt className="me-1" /> Sair da Conta
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Aparência */}
      <Card className="mb-4 shadow-sm">
        <Card.Header><strong>{isDarkMode ? <FaMoon className="me-2" /> : <FaSun className="me-2" />}Aparência</strong></Card.Header>
        <Card.Body>
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <div className="fw-semibold">Modo {isDarkMode ? 'Escuro' : 'Claro'}</div>
              <small className="text-muted">Alterna entre tema claro e escuro</small>
            </div>
            <Button variant={isDarkMode ? 'light' : 'dark'} size="sm" onClick={handleToggleDarkMode}>
              {isDarkMode ? <><FaSun className="me-1" /> Modo Claro</> : <><FaMoon className="me-1" /> Modo Escuro</>}
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Timeout de Sessão */}
      <Card className="mb-4 shadow-sm">
        <Card.Header><strong><FaClock className="me-2" />Timeout de Sessão</strong></Card.Header>
        <Card.Body>
          <p className="text-muted mb-3">
            Define o tempo de inatividade antes de solicitar novo login.
          </p>
          <Form.Group className="mb-3">
            <Form.Label>Tempo de sessão</Form.Label>
            <Form.Select
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(parseInt(e.target.value, 10))}
              style={{ maxWidth: 360 }}
            >
              {SESSION_TIMEOUTS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Form.Select>
            <Form.Text className="text-muted">
              Após {sessionTimeout} minuto{sessionTimeout !== 1 ? 's' : ''} sem atividade, o login será encerrado.
            </Form.Text>
          </Form.Group>
          <div className="d-flex gap-2">
            <Button variant="primary" size="sm" onClick={handleSaveSession}>
              Salvar
            </Button>
            <Button variant="outline-secondary" size="sm" onClick={() => { setSessionTimeout(30); localStorage.setItem('configSessionTimeout', '30'); success('Padrão restaurado', 'Timeout resetado para 30 minutos'); }}>
              Resetar Padrão
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Notificações Push */}
      <Card className="mb-4 shadow-sm">
        <Card.Header><strong><FaBell className="me-2" />Notificações Push</strong></Card.Header>
        <Card.Body>
          <p className="text-muted mb-3">
            Receba notificações nativas mesmo com o app fechado.
          </p>
          {pushState === 'unsupported' && (
            <Alert variant="warning" className="mb-0">Seu navegador não suporta notificações push.</Alert>
          )}
          {pushState === 'denied' && (
            <Alert variant="danger" className="mb-0">Permissão negada. Habilite nas configurações do navegador.</Alert>
          )}
          {(pushState === 'idle' || pushState === 'loading') && (
            <Button variant="primary" size="sm" onClick={subscribe} disabled={pushState === 'loading'}>
              <FaBell className="me-1" /> {pushState === 'loading' ? 'Ativando...' : 'Ativar notificações'}
            </Button>
          )}
          {pushState === 'subscribed' && (
            <div className="d-flex align-items-center gap-3">
              <Badge bg="success"><FaBell className="me-1" /> Notificações ativas</Badge>
              <Button variant="outline-secondary" size="sm" onClick={unsubscribe}>
                <FaBellSlash className="me-1" /> Desativar
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Instalar App (PWA) */}
      <Card className="mb-4 shadow-sm">
        <Card.Header><strong><FaMobileAlt className="me-2" />Instalar App</strong></Card.Header>
        <Card.Body>
          <p className="text-muted mb-3">
            Instale o Kaizen na tela inicial do seu dispositivo para acesso rápido.
          </p>
          <InstallAppButton />
          <small className="text-muted d-block mt-2">
            Se o botão não aparecer, o app já está instalado ou seu navegador não suporta instalação.
          </small>
        </Card.Body>
      </Card>

      {/* Atualizar App */}
      <Card className="shadow-sm">
        <Card.Header><strong><FaSyncAlt className="me-2" />Atualizar App</strong></Card.Header>
        <Card.Body>
          <p className="text-muted mb-3">
            Limpa o cache e força o carregamento da versão mais recente.
          </p>
          <Button variant="outline-primary" size="sm" onClick={handleHardRefresh} disabled={refreshing}>
            <FaSyncAlt className={`me-1 ${refreshing ? 'fa-spin' : ''}`} />
            {refreshing ? 'Atualizando...' : 'Atualizar agora'}
          </Button>
        </Card.Body>
      </Card>
    </Container>
  );
}
