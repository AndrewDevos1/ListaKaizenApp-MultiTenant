import React from 'react';
import { useNotifications } from '../context/NotificationContext';
import styles from './NotificationToasts.module.css';

const AUTO_DISMISS_MS = 6000;

const NotificationToasts: React.FC = () => {
  const { toasts, dismissToast } = useNotifications();
  const timersRef = React.useRef<Map<string, number>>(new Map());

  React.useEffect(() => {
    const activeIds = new Set(toasts.map((toast) => toast.id));

    timersRef.current.forEach((timer, id) => {
      if (!activeIds.has(id)) {
        window.clearTimeout(timer);
        timersRef.current.delete(id);
      }
    });

    toasts.forEach((toast) => {
      if (timersRef.current.has(toast.id)) return;
      const timer = window.setTimeout(() => {
        dismissToast(toast.id);
        timersRef.current.delete(toast.id);
      }, AUTO_DISMISS_MS);
      timersRef.current.set(toast.id, timer);
    });
  }, [toasts, dismissToast]);

  React.useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className={styles.toastContainer} aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`}>
          <div className={styles.toastBody}>
            <div className={styles.toastTitle}>{toast.title}</div>
            {toast.message && <div className={styles.toastMessage}>{toast.message}</div>}
          </div>
          <button
            type="button"
            className={styles.toastClose}
            onClick={() => dismissToast(toast.id)}
            aria-label="Fechar notificacao"
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationToasts;
