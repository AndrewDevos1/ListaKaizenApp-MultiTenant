'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Spinner } from 'react-bootstrap';
import { FaBell } from 'react-icons/fa';
import api from '@/lib/api';
import styles from './NotificationBell.module.css';

interface Notificacao {
  id: number;
  tipo: string;
  mensagem: string;
  lida: boolean;
  criadoEm: string;
}

function formatarData(isoString: string): string {
  try {
    const date = new Date(isoString);
    const agora = new Date();
    const diffMs = agora.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMin / 60);
    const diffD = Math.floor(diffH / 24);

    if (diffMin < 1) return 'Agora mesmo';
    if (diffMin < 60) return `${diffMin} min atrás`;
    if (diffH < 24) return `${diffH}h atrás`;
    if (diffD < 7) return `${diffD}d atrás`;
    return date.toLocaleDateString('pt-BR');
  } catch {
    return isoString;
  }
}

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const fetchCount = useCallback(async () => {
    try {
      const { data } = await api.get<{ count: number }>('/v1/notificacoes/count');
      setCount(data.count);
    } catch {
      // silencioso para nao poluir o console em cada poll
    }
  }, []);

  const fetchNotificacoes = useCallback(async () => {
    setLoadingList(true);
    try {
      const { data } = await api.get<Notificacao[]>('/v1/notificacoes');
      setNotificacoes(data);
    } catch {
      setNotificacoes([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  // Poll count a cada 30 segundos
  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleToggle = () => {
    if (!open) {
      fetchNotificacoes();
    }
    setOpen((prev) => !prev);
  };

  const handleMarcarLida = async (id: number) => {
    try {
      await api.put(`/v1/notificacoes/${id}/lida`);
      setNotificacoes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lida: true } : n)),
      );
      setCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silencioso
    }
  };

  const handleMarcarTodas = async () => {
    setMarkingAll(true);
    try {
      await api.put('/v1/notificacoes/marcar-todas');
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
      setCount(0);
    } catch {
      // silencioso
    } finally {
      setMarkingAll(false);
    }
  };

  const temNaoLidas = count > 0;

  return (
    <div className={styles.bellWrapper} ref={wrapperRef}>
      <button
        className={styles.bellButton}
        onClick={handleToggle}
        aria-label={`Notificacoes${temNaoLidas ? ` (${count} nao lidas)` : ''}`}
        title="Notificacoes"
        type="button"
      >
        <FaBell />
        {temNaoLidas && (
          <span className={styles.badge}>{count > 99 ? '99+' : count}</span>
        )}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <p className={styles.dropdownTitle}>Notificacoes</p>
            <button
              className={styles.markAllBtn}
              onClick={handleMarcarTodas}
              disabled={markingAll || !temNaoLidas}
              type="button"
            >
              {markingAll ? 'Marcando...' : 'Marcar todas como lidas'}
            </button>
          </div>

          <div className={styles.notificationList}>
            {loadingList ? (
              <div className={styles.loadingState}>
                <Spinner animation="border" size="sm" />
              </div>
            ) : notificacoes.length === 0 ? (
              <div className={styles.emptyState}>Nenhuma notificacao</div>
            ) : (
              notificacoes.map((n) => (
                <div
                  key={n.id}
                  className={`${styles.notificationItem} ${!n.lida ? styles.unread : ''}`}
                  onClick={() => !n.lida && handleMarcarLida(n.id)}
                  role={!n.lida ? 'button' : undefined}
                  tabIndex={!n.lida ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (!n.lida && (e.key === 'Enter' || e.key === ' ')) {
                      handleMarcarLida(n.id);
                    }
                  }}
                >
                  <span
                    className={`${styles.notificationDot} ${n.lida ? styles.notificationDotRead : ''}`}
                  />
                  <div className={styles.notificationContent}>
                    <p className={styles.notificationMessage}>{n.mensagem}</p>
                    <p className={styles.notificationDate}>
                      {formatarData(n.criadoEm)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
