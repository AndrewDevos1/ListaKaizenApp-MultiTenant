import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import ToastContainer from '@/components/ToastContainer';
import SwRegister from '@/components/SwRegister';
import PWAInstallBootstrap from '@/components/PWAInstallBootstrap';

export const metadata: Metadata = {
  title: 'Kaizen - Lista de Compras',
  description: 'Sistema de gerenciamento de listas e estoque',
};

export const viewport: Viewport = {
  themeColor: '#000080',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
          <ToastContainer />
          <PWAInstallBootstrap />
          <SwRegister />
        </ToastProvider>
      </body>
    </html>
  );
}
