import React, { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Container, Row, Col } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboardList, faPlay, faRedo } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import styles from './MinhasPOPListas.module.css';

interface POPLista {
  id: number;
  nome: string;
  descricao?: string;
  recorrencia: string;
}

interface POPExecucao {
  id: number;
  lista_id: number;
  status: string;
}

const MinhasPOPListas: React.FC = () => {
  const [listas, setListas] = useState<POPLista[]>([]);
  const [execucoesHoje, setExecucoesHoje] = useState<POPExecucao[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [listasRes, execucoesRes] = await Promise.all([
        api.get('/collaborator/pop-listas'),
        api.get('/collaborator/pop-execucoes/hoje')
      ]);
      setListas(listasRes.data.listas || []);
      setExecucoesHoje(execucoesRes.data.execucoes || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar listas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getExecucaoForLista = (listaId: number) => {
    return execucoesHoje.find((execucao) => execucao.lista_id === listaId);
  };

  const handleStart = async (listaId: number) => {
    try {
      const response = await api.post('/collaborator/pop-execucoes', { lista_id: listaId });
      navigate(`/collaborator/pop-execucoes/${response.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao iniciar checklist');
    }
  };

  const handleContinue = (execucaoId: number) => {
    navigate(`/collaborator/pop-execucoes/${execucaoId}`);
  };

  return (
    <Container fluid className="py-4">
      <div className={styles.header}>
        <div>
          <h2 className="mb-1">
            <FontAwesomeIcon icon={faClipboardList} /> POPs Diarios
          </h2>
          <p className="text-muted">Execute os checklists diarios da sua area</p>
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : (
        <Row className="g-3">
          {listas.map((lista) => {
            const execucao = getExecucaoForLista(lista.id);
            const status = execucao?.status || 'pendente';
            const concluido = status === 'concluido';
            return (
              <Col key={lista.id} md={6} lg={4}>
                <Card className={styles.card}>
                  <Card.Body>
                    <h5>{lista.nome}</h5>
                    <p className="text-muted">{lista.descricao || 'Sem descricao'}</p>
                    <div className="d-flex gap-2 align-items-center mb-3">
                      <Badge bg="secondary">{lista.recorrencia}</Badge>
                      {status !== 'pendente' && <Badge bg="info">{status}</Badge>}
                    </div>
                    {concluido ? (
                      <Button variant="success" disabled>
                        Concluido
                      </Button>
                    ) : execucao ? (
                      <Button variant="outline-primary" onClick={() => handleContinue(execucao.id)}>
                        <FontAwesomeIcon icon={faRedo} /> Continuar
                      </Button>
                    ) : (
                      <Button variant="primary" onClick={() => handleStart(lista.id)}>
                        <FontAwesomeIcon icon={faPlay} /> Iniciar
                      </Button>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
          {listas.length === 0 && (
            <Col>
              <Alert variant="info">Nenhuma lista disponivel.</Alert>
            </Col>
          )}
        </Row>
      )}
    </Container>
  );
};

export default MinhasPOPListas;
