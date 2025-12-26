
import React, { useState, useEffect } from 'react';
import { Card, Table, Alert } from 'react-bootstrap';
import api from '../../services/api';
import Spinner from '../../components/Spinner';

interface Pedido {
  id: number;
  item: { nome: string };
  data_pedido: string;
  status: string;
}

const RecentUserSubmissions: React.FC = () => {
  const [submissions, setSubmissions] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const response = await api.get('/v1/pedidos/me');
        setSubmissions(response.data);
      } catch (err) {
        setError('Falha ao carregar suas submissões recentes.');
      }
      setLoading(false);
    };

    fetchSubmissions();
  }, []);

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <Card className="mb-4">
      <Card.Header>
        <h5 className="mb-0">Minhas Últimas Submissões</h5>
      </Card.Header>
      <Card.Body>
        {submissions.length === 0 ? (
          <Alert variant="info">Nenhuma submissão encontrada.</Alert>
        ) : (
          <Table responsive hover className="mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Item</th>
                <th>Data de Envio</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {submissions.slice(0, 5).map((submission) => (
                <tr key={submission.id}>
                  <td>{submission.id}</td>
                  <td>{submission.item.nome}</td>
                  <td>{new Date(submission.data_pedido).toLocaleDateString()}</td>
                  <td>{submission.status}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
};

export default RecentUserSubmissions;
