'use client';

import { Card } from 'react-bootstrap';
import { useAuth } from '@/contexts/AuthContext';

export default function CollaboratorDashboard() {
  const { user } = useAuth();

  return (
    <>
      <h2 className="mb-4">Dashboard</h2>
      <p className="text-muted mb-4">Bem-vindo, {user?.nome}!</p>

      <Card>
        <Card.Body>
          <Card.Title>Minhas Listas</Card.Title>
          <Card.Text>
            Acesse suas listas atribuidas para gerenciar o estoque.
          </Card.Text>
        </Card.Body>
      </Card>
    </>
  );
}
