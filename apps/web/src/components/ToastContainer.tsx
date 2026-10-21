'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaCheckCircle, FaExclamationCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from 'react-icons/fa';
import { Toast, useToast } from '@/contexts/ToastContext';
import styles from './ToastContainer.module.css';

const ICONS = {
  success: <FaCheckCircle />,
  error:   <FaExclamationCircle />,
  warning: <FaExclamationTriangle />,
  info:    <FaInfoCircle />,
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const duration = toast.duration ?? 4000;

  const handleDismiss = useCallback(() => {
    if (exiting) return;
    setExiting(true);
    timerRef.current = setTimeout(() => onDismiss(toast.id), 220);
  }, [exiting, onDismiss, toast.id]);

  // Clean up on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`${styles.toast} ${styles[toast.type]} ${exiting ? styles.exiting : ''}`}
    >
      <div className={styles.iconWrap} aria-hidden="true">
        {ICONS[toast.type]}
      </div>

      <div className={styles.body}>
        <div className={styles.title}>{toast.title}</div>
        {toast.description && (
          <div className={styles.description}>{toast.description}</div>
        )}
      </div>

      <button
        type="button"
        className={styles.close}
        onClick={handleDismiss}
        aria-label="Fechar notificação"
      >
        <FaTimes />
      </button>

      {duration > 0 && (
        <div
          className={styles.progress}
          style={{ animationDuration: `${duration}ms` }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export default function ToastContainer() {
  const { toasts, dismiss } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return createPortal(
    <section
      className={styles.region}
      aria-label="Notificações"
      aria-relevant="additions removals"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
      ))}
    </section>,
    document.body,
  );
}
