'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';

type PushState = 'idle' | 'loading' | 'subscribed' | 'denied' | 'unsupported';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function usePushNotifications() {
  const [state, setState] = useState<PushState>('idle');

  useEffect(() => {
    if (
      !('Notification' in window) ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      setState('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setState('denied');
      return;
    }
    // Check if already subscribed
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) setState('subscribed');
      });
    });
  }, []);

  const subscribe = useCallback(async () => {
    if (!('Notification' in window) || !('PushManager' in window)) return;

    setState('loading');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState('denied');
        return;
      }

      const { data } = await api.get<{ publicKey: string }>('/v1/push/vapid-public-key');
      const applicationServerKey = urlBase64ToUint8Array(data.publicKey);

      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      const sub = subscription.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      await api.post('/v1/push/subscribe', sub);
      setState('subscribed');
    } catch (err) {
      console.error('[Push] Erro ao ativar notificações:', err);
      setState('idle');
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setState('loading');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.delete('/v1/push/subscribe', { data: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
      setState('idle');
    } catch (err) {
      console.error('[Push] Erro ao desativar notificações:', err);
      setState('subscribed');
    }
  }, []);

  return { state, subscribe, unsubscribe };
}
