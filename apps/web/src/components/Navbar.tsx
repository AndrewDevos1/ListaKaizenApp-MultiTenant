'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Navbar as BSNavbar, Nav, Container, Button } from 'react-bootstrap';
import { useAuth } from '@/contexts/AuthContext';

export default function AppNavbar() {
  const { user, logout, isAdmin } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  return (
    <BSNavbar bg="dark" variant="dark" expand="lg" sticky="top">
      <Container fluid>
        <BSNavbar.Brand as={Link} href="/">
          Kaizen Lists
        </BSNavbar.Brand>
        <BSNavbar.Toggle aria-controls="main-nav" />
        <BSNavbar.Collapse id="main-nav">
          <Nav className="me-auto">
            {isAdmin ? (
              <>
                <Nav.Link as={Link} href="/admin/dashboard" active={pathname === '/admin/dashboard'}>
                  Dashboard
                </Nav.Link>
                <Nav.Link as={Link} href="/admin/items" active={pathname === '/admin/items'}>
                  Itens
                </Nav.Link>
                <Nav.Link as={Link} href="/admin/areas" active={pathname === '/admin/areas'}>
                  Areas
                </Nav.Link>
                <Nav.Link as={Link} href="/admin/listas" active={pathname === '/admin/listas'}>
                  Listas
                </Nav.Link>
              </>
            ) : (
              <>
                <Nav.Link as={Link} href="/collaborator/dashboard" active={pathname === '/collaborator/dashboard'}>
                  Dashboard
                </Nav.Link>
                <Nav.Link as={Link} href="/collaborator/listas" active={pathname === '/collaborator/listas'}>
                  Minhas Listas
                </Nav.Link>
              </>
            )}
          </Nav>
          <Nav>
            <Nav.Item className="d-flex align-items-center text-light me-3">
              {user.nome}
            </Nav.Item>
            <Button variant="outline-light" size="sm" onClick={logout}>
              Sair
            </Button>
          </Nav>
        </BSNavbar.Collapse>
      </Container>
    </BSNavbar>
  );
}
