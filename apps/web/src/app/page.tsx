'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Container, Spinner } from 'react-bootstrap';

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
    <Container className="d-flex justify-content-center align-items-center vh-100">
      <Spinner animation="border" variant="primary" />
    </Container>
  );
}
