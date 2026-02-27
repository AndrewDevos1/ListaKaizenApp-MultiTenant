'use client';

import { useEffect, useState } from 'react';

type PWAState = 'loading' | 'installable' | 'ios-safari' | 'installed' | 'unsupported';

interface PWAInstallResult {
  state: PWAState;
  canShow: boolean;
  isIOS: boolean;
  install: () => Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall(): PWAInstallResult {
  const [state, setState] = useState<PWAState>('loading');

  const isIOS =
    typeof navigator !== 'undefined' &&
    /iphone|ipad|ipod/i.test(navigator.userAgent);

  const isSafari =
    typeof navigator !== 'undefined' &&
    /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true);

  useEffect(() => {
    console.log('[PWA Install] Verificando ambiente:', {
      isStandalone,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
    });
    console.log('[PWA Install] Detecção de plataforma:', { isIOS, isSafari });

    // Já instalado
    if (isStandalone) {
      console.log('[PWA Install] App já está instalado (modo standalone). Botão OCULTO.');
      setState('installed');
      return;
    }

    // iOS Safari: mostra instruções manuais
    if (isIOS && isSafari) {
      console.log('[PWA Install] iOS Safari detectado. Botão VISÍVEL (instruções manuais).');
      setState('ios-safari');
      return;
    }

    console.log("[PWA Install] Aguardando evento 'beforeinstallprompt'... (timeout de 3s)");

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      console.log("[PWA Install] Evento 'beforeinstallprompt' recebido! Botão VISÍVEL.");
      setState('installable');
    };

    window.addEventListener('beforeinstallprompt', handler);

    const timer = setTimeout(() => {
      if (state === 'loading') {
        console.log("[PWA Install] Timeout de 3s atingido. Evento 'beforeinstallprompt' NÃO recebido.");
        console.log("[PWA Install] Estado: 'unsupported'. Botão ficará OCULTO.");
        setState('unsupported');
      }
    }, 3000);

    const installedHandler = () => {
      console.log('[PWA Install] App instalado! Ocultando botão.');
      setState('installed');
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const install = async () => {
    if (state === 'installable' && deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('[PWA Install] Resultado do prompt:', outcome);
      if (outcome === 'accepted') {
        setState('installed');
      }
      deferredPrompt = null;
    }
  };

  const canShow = state === 'installable' || state === 'ios-safari';

  console.log('[PWA Install] Estado atualizado:', { state, canShow });

  return { state, canShow, isIOS, install };
}
