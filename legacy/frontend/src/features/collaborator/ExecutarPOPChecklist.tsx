import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Container, Form, ProgressBar } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCamera, faCheck, faClipboardList, faSave } from '@fortawesome/free-solid-svg-icons';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import styles from './ExecutarPOPChecklist.module.css';

interface POPItem {
  id: number;
  titulo: string;
  descricao?: string;
  tipo_verificacao: string;
  concluido: boolean;
  valor_medido?: number;
  unidade_medicao?: string;
  dentro_padrao?: boolean | null;
  observacoes?: string;
  tem_desvio: boolean;
  descricao_desvio?: string;
  acao_corretiva?: string;
}

interface POPExecucao {
  id: number;
  lista_nome?: string;
  data_referencia: string;
  progresso: number;
  itens: POPItem[];
}

const ExecutarPOPChecklist: React.FC = () => {
  const { execucaoId } = useParams();
  const navigate = useNavigate();
  const [execucao, setExecucao] = useState<POPExecucao | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingItemId, setSavingItemId] = useState<number | null>(null);
  const [finalizando, setFinalizando] = useState(false);

  const fetchExecucao = useCallback(async () => {
    try {
      const response = await api.get(`/collaborator/pop-execucoes/${execucaoId}`);
      setExecucao(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar execucao');
    }
  }, [execucaoId]);

  useEffect(() => {
    fetchExecucao();
  }, [fetchExecucao]);

  const handleUpdateItem = async (item: POPItem) => {
    try {
      setSavingItemId(item.id);
      await api.put(`/collaborator/pop-execucoes/${execucaoId}/itens/${item.id}`, {
        concluido: item.concluido,
        valor_medido: item.valor_medido,
        observacoes: item.observacoes,
        tem_desvio: item.tem_desvio,
        descricao_desvio: item.descricao_desvio,
        acao_corretiva: item.acao_corretiva
      });
      await fetchExecucao();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar item');
    } finally {
      setSavingItemId(null);
    }
  };

  const handleFinalize = async () => {
    try {
      setFinalizando(true);
      await api.post(`/collaborator/pop-execucoes/${execucaoId}/finalizar`, {});
      navigate('/collaborator/pop-listas');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao finalizar');
    } finally {
      setFinalizando(false);
    }
  };

  const updateItemState = (itemId: number, changes: Partial<POPItem>) => {
    setExecucao((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        itens: prev.itens.map((item) => (item.id === itemId ? { ...item, ...changes } : item))
      };
    });
  };

  if (!execucao) {
    return (
      <Container fluid className="py-4">
        {error && <Alert variant="danger">{error}</Alert>}
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <div className={styles.header}>
        <div>
          <Button variant="outline-secondary" size="sm" onClick={() => navigate('/collaborator/pop-listas')}>
            Voltar
          </Button>
          <h2 className="mt-3">
            <FontAwesomeIcon icon={faClipboardList} /> {execucao.lista_nome}
          </h2>
          <p className="text-muted">Data: {execucao.data_referencia}</p>
        </div>
        <div className={styles.progressBox}>
          <span>Progresso</span>
          <ProgressBar now={execucao.progresso} label={`${execucao.progresso}%`} />
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className={styles.itemsList}>
        {execucao.itens.map((item) => (
          <Card key={item.id} className={styles.itemCard}>
            <Card.Body>
              <div className={styles.itemHeader}>
                <div>
                  <h5>{item.titulo}</h5>
                  {item.descricao && <p className="text-muted">{item.descricao}</p>}
                </div>
                <Badge bg={item.concluido ? 'success' : 'secondary'}>
                  {item.concluido ? 'Concluido' : 'Pendente'}
                </Badge>
              </div>

              {item.tipo_verificacao === 'checkbox' && (
                <Form.Check
                  type="checkbox"
                  label="Marcar como concluido"
                  checked={item.concluido}
                  onChange={(e) => updateItemState(item.id, { concluido: e.target.checked })}
                />
              )}

              {(item.tipo_verificacao === 'medicao' || item.tipo_verificacao === 'temperatura') && (
                <Form.Group className="mb-2">
                  <Form.Label>Valor medido {item.unidade_medicao ? `(${item.unidade_medicao})` : ''}</Form.Label>
                  <Form.Control
                    type="number"
                    value={item.valor_medido ?? ''}
                    onChange={(e) => updateItemState(item.id, { valor_medido: Number(e.target.value) })}
                  />
                  {item.dentro_padrao !== undefined && item.dentro_padrao !== null && (
                    <small className={item.dentro_padrao ? 'text-success' : 'text-danger'}>
                      {item.dentro_padrao ? 'Dentro do padrao' : 'Fora do padrao'}
                    </small>
                  )}
                </Form.Group>
              )}

              {item.tipo_verificacao === 'texto' && (
                <Form.Group className="mb-2">
                  <Form.Label>Resposta</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={item.observacoes ?? ''}
                    onChange={(e) => updateItemState(item.id, { observacoes: e.target.value })}
                  />
                </Form.Group>
              )}

              {item.tipo_verificacao === 'foto' && (
                <div className={styles.photoPlaceholder}>
                  <Button variant="outline-secondary" disabled>
                    <FontAwesomeIcon icon={faCamera} /> Anexar foto (em breve)
                  </Button>
                </div>
              )}

              <Form.Group className="mb-2">
                <Form.Label>Observacoes</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={item.observacoes ?? ''}
                  onChange={(e) => updateItemState(item.id, { observacoes: e.target.value })}
                />
              </Form.Group>

              <Form.Check
                type="checkbox"
                label="Registrar desvio"
                checked={item.tem_desvio}
                onChange={(e) => updateItemState(item.id, { tem_desvio: e.target.checked })}
              />

              {item.tem_desvio && (
                <div className={styles.desvioBox}>
                  <Form.Group className="mb-2">
                    <Form.Label>Descricao do desvio</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={item.descricao_desvio ?? ''}
                      onChange={(e) => updateItemState(item.id, { descricao_desvio: e.target.value })}
                    />
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Acao corretiva</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={item.acao_corretiva ?? ''}
                      onChange={(e) => updateItemState(item.id, { acao_corretiva: e.target.value })}
                    />
                  </Form.Group>
                </div>
              )}

              <div className={styles.itemActions}>
                <Button
                  variant="primary"
                  onClick={() => handleUpdateItem(item)}
                  disabled={savingItemId === item.id}
                >
                  <FontAwesomeIcon icon={faSave} /> Salvar item
                </Button>
                <Button
                  variant={item.concluido ? 'success' : 'outline-success'}
                  onClick={() => handleUpdateItem({ ...item, concluido: true })}
                  disabled={savingItemId === item.id}
                >
                  <FontAwesomeIcon icon={faCheck} /> Concluir
                </Button>
              </div>
            </Card.Body>
          </Card>
        ))}
      </div>

      <div className={styles.footer}>
        <Button variant="success" onClick={handleFinalize} disabled={finalizando}>
          Finalizar checklist
        </Button>
      </div>
    </Container>
  );
};

export default ExecutarPOPChecklist;
