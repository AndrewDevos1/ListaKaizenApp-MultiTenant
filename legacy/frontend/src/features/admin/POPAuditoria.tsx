import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Container, Form, Modal, Table } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboardList, faCheck, faArchive } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import styles from './POPAuditoria.module.css';

interface POPExecucao {
  id: number;
  lista_nome?: string;
  usuario_nome?: string;
  status: string;
  data_referencia: string;
  revisado: boolean;
  arquivado: boolean;
}

const POPAuditoria: React.FC = () => {
  const [execucoes, setExecucoes] = useState<POPExecucao[]>([]);
  const [config, setConfig] = useState({ auto_arquivar: true, periodo_arquivamento_dias: 7 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ status: '', data_inicio: '', data_fim: '' });
  const [showModal, setShowModal] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [selectedExecucao, setSelectedExecucao] = useState<POPExecucao | null>(null);

  const fetchExecucoes = useCallback(async () => {
    try {
      setLoading(true);
      const [execucoesRes, configRes] = await Promise.all([
        api.get('/admin/pop-execucoes', { params: filters }),
        api.get('/admin/pop-configuracoes')
      ]);
      setExecucoes(execucoesRes.data.execucoes || []);
      if (configRes.data) {
        setConfig({
          auto_arquivar: Boolean(configRes.data.auto_arquivar),
          periodo_arquivamento_dias: Number(configRes.data.periodo_arquivamento_dias || 7)
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar execucoes');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchExecucoes();
  }, [fetchExecucoes]);

  const handleReview = (execucao: POPExecucao) => {
    setSelectedExecucao(execucao);
    setReviewText('');
    setShowModal(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedExecucao) return;
    try {
      await api.post(`/admin/pop-execucoes/${selectedExecucao.id}/revisar`, {
        observacoes_revisao: reviewText,
        revisado: true
      });
      setShowModal(false);
      fetchExecucoes();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao revisar');
    }
  };

  const handleArchive = async (execucao: POPExecucao) => {
    try {
      await api.post(`/admin/pop-execucoes/${execucao.id}/arquivar`);
      fetchExecucoes();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao arquivar');
    }
  };

  const handleSaveConfig = async () => {
    try {
      await api.put('/admin/pop-configuracoes', config);
      fetchExecucoes();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar configuracoes');
    }
  };

  return (
    <Container fluid className="py-4">
      <div className={styles.header}>
        <div>
          <h2 className="mb-1">
            <FontAwesomeIcon icon={faClipboardList} /> POP Auditoria
          </h2>
          <p className="text-muted">Acompanhe execucoes e revise conformidade</p>
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card className="mb-3">
        <Card.Body>
          <div className={styles.configBox}>
            <div>
              <h6>Arquivamento automatico</h6>
              <p className="text-muted">Configure o arquivamento semanal das execucoes antigas.</p>
            </div>
            <div className={styles.configControls}>
              <Form.Check
                type="switch"
                id="auto-archive"
                label="Ativo"
                checked={config.auto_arquivar}
                onChange={(e) => setConfig({ ...config, auto_arquivar: e.target.checked })}
              />
              <Form.Group>
                <Form.Label>Dias para arquivar</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  value={config.periodo_arquivamento_dias}
                  onChange={(e) => setConfig({ ...config, periodo_arquivamento_dias: Number(e.target.value) })}
                />
              </Form.Group>
              <Button variant="outline-primary" onClick={handleSaveConfig}>Salvar</Button>
            </div>
          </div>

          <hr />

          <div className={styles.filters}>
            <Form.Group>
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">Todos</option>
                <option value="em_andamento">Em andamento</option>
                <option value="concluido">Concluido</option>
                <option value="parcial">Parcial</option>
              </Form.Select>
            </Form.Group>
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
                  <th>Colaborador</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th>Revisado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {execucoes.map((execucao) => (
                  <tr key={execucao.id}>
                    <td>{execucao.lista_nome || '-'}</td>
                    <td>{execucao.usuario_nome || '-'}</td>
                    <td>{execucao.status}</td>
                    <td>{execucao.data_referencia}</td>
                    <td>{execucao.revisado ? 'Sim' : 'Nao'}</td>
                    <td className="text-end">
                      <Button size="sm" variant="outline-success" className="me-2" onClick={() => handleReview(execucao)}>
                        <FontAwesomeIcon icon={faCheck} /> Revisar
                      </Button>
                      {!execucao.arquivado && (
                        <Button size="sm" variant="outline-secondary" onClick={() => handleArchive(execucao)}>
                          <FontAwesomeIcon icon={faArchive} /> Arquivar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {execucoes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">
                      Nenhuma execucao encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Revisar execucao</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Observacoes de revisao</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmitReview}>Salvar</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default POPAuditoria;
