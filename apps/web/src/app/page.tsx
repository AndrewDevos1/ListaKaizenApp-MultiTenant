'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/collaborator/dashboard');
      }
    }
  }, [user, loading, router]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '4px solid var(--color-primary, #667eea)',
        borderTop: '4px solid transparent',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
