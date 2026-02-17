'use client';

import { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Spinner, Alert } from 'react-bootstrap';
import api from '@/lib/api';

interface MinhaLista {
  id: number;
  nome: string;
  _count: { itensRef: number };
}

export default function MinhasListasPage() {
  const [listas, setListas] = useState<MinhaLista[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMinhasListas = async () => {
      try {
        const { data } = await api.get('/v1/collaborator/minhas-listas');
        setListas(data);
      } catch {
        setError('Erro ao carregar suas listas');
      } finally {
        setLoading(false);
      }
    };
    fetchMinhasListas();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <>
      <h2 className="mb-4">Minhas Listas</h2>

      {error && <Alert variant="danger">{error}</Alert>}

      {listas.length === 0 ? (
        <Alert variant="info">
          Voce ainda nao foi atribuido a nenhuma lista.
        </Alert>
      ) : (
        <Row className="g-3">
          {listas.map((lista) => (
            <Col key={lista.id} md={6} lg={4}>
              <Card className="h-100">
                <Card.Body>
                  <Card.Title>{lista.nome}</Card.Title>
                  <Badge bg="secondary">{lista._count.itensRef} itens</Badge>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </>
  );
}
