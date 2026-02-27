import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Container, Form, Table } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHistory, faEye } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import styles from './HistoricoPOPExecucoes.module.css';

interface POPExecucao {
  id: number;
  lista_nome?: string;
  status: string;
  data_referencia: string;
  tarefas_concluidas: number;
  total_tarefas: number;
}

const HistoricoPOPExecucoes: React.FC = () => {
  const [execucoes, setExecucoes] = useState<POPExecucao[]>([]);
  const [filters, setFilters] = useState({ data_inicio: '', data_fim: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchExecucoes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/collaborator/pop-execucoes', { params: filters });
      setExecucoes(response.data.execucoes || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar historico');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchExecucoes();
  }, [fetchExecucoes]);

  return (
    <Container fluid className="py-4">
      <div className={styles.header}>
        <div>
          <h2 className="mb-1">
            <FontAwesomeIcon icon={faHistory} /> Historico POP
          </h2>
          <p className="text-muted">Acompanhe seus checklists concluidos</p>
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card className="mb-3">
        <Card.Body>
          <div className={styles.filters}>
            <Form.Group>
              <Form.Label>Data inicio</Form.Label>
              <Form.Control
                type="date"
                value={filters.data_inicio}
                onChange={(e) => setFilters({ ...filters, data_inicio: e.target.value })}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Data fim</Form.Label>
              <Form.Control
                type="date"
                value={filters.data_fim}
                onChange={(e) => setFilters({ ...filters, data_fim: e.target.value })}
              />
            </Form.Group>
            <Button variant="primary" className="align-self-end" onClick={fetchExecucoes}>
              Filtrar
            </Button>
          </div>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
            </div>
          ) : (
            <Table responsive hover className="mb-0">
              <thead>
                <tr>
                  <th>Lista</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th>Progresso</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {execucoes.map((execucao) => (
                  <tr key={execucao.id}>
                    <td>{execucao.lista_nome || '-'}</td>
                    <td>{execucao.status}</td>
                    <td>{execucao.data_referencia}</td>
                    <td>{execucao.tarefas_concluidas}/{execucao.total_tarefas}</td>
                    <td className="text-end">
                      <Button size="sm" variant="outline-secondary" onClick={() => navigate(`/collaborator/pop-execucoes/${execucao.id}`)}>
                        <FontAwesomeIcon icon={faEye} /> Ver
                      </Button>
                    </td>
                  </tr>
                ))}
                {execucoes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-4">
                      Nenhuma execucao encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default HistoricoPOPExecucoes;
