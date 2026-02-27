'use client';

import { useEffect } from 'react';

export default function SwRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('[SW] Service Worker registrado:', reg.scope);

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
      });
    }
  }, []);

  return null;
}
