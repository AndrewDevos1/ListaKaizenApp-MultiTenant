'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';

export default function ContadorLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <ProtectedRoute>
      <div className="d-flex min-vh-100">
        <Sidebar>{children}</Sidebar>
      </div>
    </ProtectedRoute>
  );
}
