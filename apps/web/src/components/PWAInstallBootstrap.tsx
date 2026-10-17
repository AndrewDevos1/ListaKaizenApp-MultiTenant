'use client';

import { useEffect } from 'react';
import { capturePWAInstallPrompt } from '@/hooks/usePWAInstall';

export default function PWAInstallBootstrap() {
  useEffect(() => {
    const handler = (event: Event) => capturePWAInstallPrompt(event);
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  return null;
}
