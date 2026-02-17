'use client';

import AppNavbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Container } from 'react-bootstrap';

export default function CollaboratorLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppNavbar />
      <Container fluid className="py-4 px-3 px-md-4">
        {children}
      </Container>
    </ProtectedRoute>
  );
}
