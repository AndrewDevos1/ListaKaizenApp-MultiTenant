import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import ToastContainer from '@/components/ToastContainer';
import SwRegister from '@/components/SwRegister';

export const metadata: Metadata = {
  title: 'Kaizen Lists',
  description: 'Sistema de gestão de estoque multi-tenant',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
          <ToastContainer />
          <SwRegister />
        </ToastProvider>
      </body>
    </html>
  );
}
