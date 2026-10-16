'use client';

import { useEffect, useState } from 'react';

type PWAState = 'loading' | 'installable' | 'ios-safari' | 'installed' | 'unsupported';

interface PWAInstallResult {
  state: PWAState;
  canShow: boolean;
  isIOS: boolean;
  install: () => Promise<boolean>;
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
    (/iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  const isSafari =
    typeof navigator !== 'undefined' &&
    /safari/i.test(navigator.userAgent) &&
    !/(crios|fxios|edgios)/i.test(navigator.userAgent);

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

    let received = false;

    const handler = (e: Event) => {
      const prompt = e as BeforeInstallPromptEvent;
      if (typeof prompt.prompt !== 'function' || !prompt.userChoice) return;
      e.preventDefault();
      deferredPrompt = prompt;
      received = true;
      console.log("[PWA Install] Evento 'beforeinstallprompt' recebido! Botão VISÍVEL.");
      setState('installable');
    };

    window.addEventListener('beforeinstallprompt', handler);

    const timer = setTimeout(() => {
      if (!received) {
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
      const prompt = deferredPrompt;
      deferredPrompt = null;
      try {
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        console.log('[PWA Install] Resultado do prompt:', outcome);
        if (outcome === 'accepted') setState('installed');
        return outcome === 'accepted';
      } catch (error) {
        console.warn('[PWA Install] Falha ao abrir prompt:', error);
      }
    }
    return false;
  };

  const canShow = state === 'installable' || state === 'ios-safari';

  console.log('[PWA Install] Estado atualizado:', { state, canShow });

  return { state, canShow, isIOS, install };
}
