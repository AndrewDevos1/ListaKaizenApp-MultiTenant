'use client';

import { useEffect } from 'react';

export default function SwRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    // Em desenvolvimento/local, evita qualquer SW ativo para não quebrar assets do Next.
    if (process.env.NODE_ENV !== 'production' || isLocalhost) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs
          .filter((reg) => reg.active?.scriptURL === `${window.location.origin}/sw.js`)
          .forEach((reg) => reg.unregister());
      });
      caches.keys().then((keys) => {
        keys.filter((key) => key.startsWith('kaizen-lists-')).forEach((key) => caches.delete(key));
      });
      return;
    }

    const onControllerChange = () => {
      const lastReload = Number(sessionStorage.getItem('kaizen-sw-reloaded-at') || 0);
      if (reloading || Date.now() - lastReload < 5000) return;
      sessionStorage.setItem('kaizen-sw-reloaded-at', String(Date.now()));
      reloading = true;
      console.log('[SW] Novo controller ativo. Recarregando para aplicar a atualização.');
      window.location.reload();
    };

    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((reg) => {
          console.log('[SW] Service Worker registrado:', reg.scope);
          reg.update().catch(() => undefined);

          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (
                  newWorker.state === 'installed' &&
                  navigator.serviceWorker.controller
                ) {
                  console.log('[SW] Nova versão disponível. Recarregue para atualizar.');
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn('[SW] Falha ao registrar Service Worker:', err);
        });
    };

    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad);
    return () => {
      window.removeEventListener('load', onLoad);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  return null;
}
