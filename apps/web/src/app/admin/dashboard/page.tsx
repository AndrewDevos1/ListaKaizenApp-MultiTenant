'use client';

import { Card, Row, Col } from 'react-bootstrap';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();

  return (
    <>
      <h2 className="mb-4">Dashboard Admin</h2>
      <p className="text-muted mb-4">Bem-vindo, {user?.nome}!</p>

      <Row className="g-4">
        <Col md={4}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Itens</Card.Title>
              <Card.Text>Gerenciar itens do estoque</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Areas</Card.Title>
              <Card.Text>Gerenciar areas do restaurante</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Listas</Card.Title>
              <Card.Text>Gerenciar listas de estoque</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
}
