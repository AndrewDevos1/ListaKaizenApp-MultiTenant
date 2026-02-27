'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Spinner, Alert, Table, Button } from 'react-bootstrap';
import { FaGlobe, FaStore, FaUsers, FaClipboardList, FaClipboardCheck, FaSync } from 'react-icons/fa';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface GlobalStats {
  totalRestaurantes: number;
  totalUsuarios: number;
  totalListas: number;
  totalSubmissoes: number;
  submissoesPendentes: number;
  restaurantes: Array<{
    id: number;
    nome: string;
    ativo: boolean;
    usuarios: number;
    listas: number;
    submissoes: number;
  }>;
}

export default function GlobalDashboard() {
  const { isSuperAdmin } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStats = () => {
    setLoading(true);
    setError('');
    api.get('/v1/restaurantes/stats/global')
      .then((r) => setStats(r.data))
      .catch(() => setError('Erro ao carregar estatísticas globais'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isSuperAdmin) {
      router.replace('/admin/dashboard');
      return;
    }
    loadStats();
  }, [isSuperAdmin, router]);

  if (!isSuperAdmin) return null;

  if (loading) return (
    <Container className="py-4 text-center">
      <Spinner animation="border" variant="primary" />
      <p className="mt-2">Carregando dashboard global...</p>
    </Container>
  );

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><FaGlobe className="me-2" />Dashboard Global</h2>
        <Button variant="outline-secondary" size="sm" onClick={loadStats} disabled={loading}>
          <FaSync className="me-1" /> Atualizar
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {stats && (
        <>
          <Row className="g-3 mb-4">
            <Col sm={6} md={3}>
              <Card className="text-center shadow-sm h-100">
                <Card.Body>
                  <FaStore size={28} className="text-primary mb-2" />
                  <div className="fs-2 fw-bold">{stats.totalRestaurantes}</div>
                  <div className="text-muted small">Restaurantes</div>
                </Card.Body>
              </Card>
            </Col>
            <Col sm={6} md={3}>
              <Card className="text-center shadow-sm h-100">
                <Card.Body>
                  <FaUsers size={28} className="text-success mb-2" />
                  <div className="fs-2 fw-bold">{stats.totalUsuarios}</div>
                  <div className="text-muted small">Usuários</div>
                </Card.Body>
              </Card>
            </Col>
            <Col sm={6} md={3}>
              <Card className="text-center shadow-sm h-100">
                <Card.Body>
                  <FaClipboardList size={28} className="text-info mb-2" />
                  <div className="fs-2 fw-bold">{stats.totalListas}</div>
                  <div className="text-muted small">Listas Criadas</div>
                </Card.Body>
              </Card>
            </Col>
            <Col sm={6} md={3}>
              <Card className="text-center shadow-sm h-100">
                <Card.Body>
                  <FaClipboardCheck size={28} className="text-warning mb-2" />
                  <div className="fs-2 fw-bold">{stats.totalSubmissoes}</div>
                  <div className="text-muted small">
                    Submissões {stats.submissoesPendentes > 0 && (
                      <Badge bg="danger" pill>{stats.submissoesPendentes} pend.</Badge>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card className="shadow-sm">
            <Card.Header><strong>Restaurantes Cadastrados</strong></Card.Header>
            <Card.Body className="p-0">
              <Table hover responsive className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Nome</th>
                    <th className="text-center">Status</th>
                    <th className="text-center">Usuários</th>
                    <th className="text-center">Listas</th>
                    <th className="text-center">Submissões</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.restaurantes.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-muted py-4">Nenhum restaurante cadastrado</td></tr>
                  ) : stats.restaurantes.map((r) => (
                    <tr key={r.id}>
                      <td><strong>{r.nome}</strong></td>
                      <td className="text-center">
                        <Badge bg={r.ativo ? 'success' : 'secondary'}>{r.ativo ? 'Ativo' : 'Inativo'}</Badge>
                      </td>
                      <td className="text-center">{r.usuarios}</td>
                      <td className="text-center">{r.listas}</td>
                      <td className="text-center">{r.submissoes}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </>
      )}
    </Container>
  );
}
