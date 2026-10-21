'use client';

import { Button, Spinner } from 'react-bootstrap';
import { FaBell, FaBellSlash } from 'react-icons/fa';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function PushNotificationButton() {
  const { state, subscribe, unsubscribe } = usePushNotifications();

  if (state === 'unsupported') return null;

  if (state === 'loading') {
    return (
      <Button variant="outline-secondary" size="sm" disabled>
        <Spinner animation="border" size="sm" />
      </Button>
    );
  }

  if (state === 'subscribed') {
    return (
      <Button
        variant="outline-secondary"
        size="sm"
        onClick={unsubscribe}
        title="Desativar notificações push"
      >
        <FaBell className="me-1 d-none d-sm-inline" />
        <span className="d-none d-sm-inline">Notificações ativas</span>
        <span className="d-sm-none">
          <FaBell />
        </span>
      </Button>
    );
  }

  if (state === 'denied') {
    return (
      <Button
        variant="outline-secondary"
        size="sm"
        disabled
        title="Notificações bloqueadas pelo navegador"
      >
        <FaBellSlash className="me-1 d-none d-sm-inline" />
        <span className="d-none d-sm-inline">Bloqueado</span>
        <span className="d-sm-none">
          <FaBellSlash />
        </span>
      </Button>
    );
  }

  return (
    <Button
      variant="outline-secondary"
      size="sm"
      onClick={subscribe}
      title="Ativar notificações push"
    >
      <FaBell className="me-1 d-none d-sm-inline" />
      <span className="d-none d-sm-inline">Ativar notificações</span>
      <span className="d-sm-none">
        <FaBell />
      </span>
    </Button>
  );
}
