import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Container, Form, Tab, Tabs } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboardCheck, faPlus, faUsers } from '@fortawesome/free-solid-svg-icons';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import styles from './POPListaDetalhes.module.css';

interface POPLista {
  id: number;
  nome: string;
  descricao?: string;
  recorrencia: string;
  publico: boolean;
}

interface POPTemplate {
  id: number;
  titulo: string;
  tipo_verificacao: string;
  criticidade: string;
}

interface POPListaTarefa {
  id: number;
  template: POPTemplate;
}

interface Usuario {
  id: number;
  nome: string;
  email: string;
}

const POPListaDetalhes: React.FC = () => {
  const { listaId } = useParams();
  const navigate = useNavigate();
  const [lista, setLista] = useState<POPLista | null>(null);
  const [tarefas, setTarefas] = useState<POPListaTarefa[]>([]);
  const [templates, setTemplates] = useState<POPTemplate[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<number[]>([]);
  const [selectedColaboradores, setSelectedColaboradores] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [listaRes, tarefasRes, colabsRes, templatesRes, usuariosRes] = await Promise.all([
        api.get(`/admin/pop-listas/${listaId}`),
        api.get(`/admin/pop-listas/${listaId}/tarefas`),
        api.get(`/admin/pop-listas/${listaId}/colaboradores`),
        api.get('/admin/pop-templates'),
        api.get('/admin/users')
      ]);
      setLista(listaRes.data);
      setTarefas(tarefasRes.data || []);
      if (Array.isArray(templatesRes.data)) {
        setTemplates(templatesRes.data);
      } else {
        setTemplates([]);
        setError('Erro ao carregar templates.');
      }
      const collaboratorsOnly = (usuariosRes.data || []).filter((u: any) => u.role === 'COLLABORATOR');
      setUsuarios(collaboratorsOnly);
      setSelectedColaboradores(colabsRes.data.map((u: Usuario) => u.id));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar detalhes');
    }
  }, [listaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleTemplate = (templateId: number) => {
    setSelectedTemplates((prev) => {
      if (prev.includes(templateId)) {
        return prev.filter((id) => id !== templateId);
      }
      return [...prev, templateId];
    });
  };

  const handleAddTemplates = async () => {
    try {
      await api.post(`/admin/pop-listas/${listaId}/tarefas`, { template_ids: selectedTemplates });
      setSelectedTemplates([]);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao adicionar tarefas');
    }
  };

  const handleRemoveTarefa = async (tarefaId: number) => {
    try {
      await api.delete(`/admin/pop-listas/${listaId}/tarefas/${tarefaId}`);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao remover tarefa');
    }
  };

  const handleToggleColaborador = (userId: number) => {
    setSelectedColaboradores((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const handleSalvarColaboradores = async () => {
    try {
      await api.post(`/admin/pop-listas/${listaId}/colaboradores`, {
        colaborador_ids: selectedColaboradores
      });
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar colaboradores');
    }
  };

  return (
    <Container fluid className="py-4">
      <div className={styles.header}>
        <div>
          <Button variant="outline-secondary" size="sm" onClick={() => navigate('/admin/pop-listas')}>
            Voltar
          </Button>
          <h2 className="mt-3">
            <FontAwesomeIcon icon={faClipboardCheck} /> {lista?.nome}
          </h2>
          <p className="text-muted">{lista?.descricao || 'Sem descricao'}</p>
        </div>
        <div className={styles.meta}>
          <Badge bg="secondary">{lista?.recorrencia}</Badge>
          {lista?.publico && <Badge bg="success">Publica</Badge>}
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Tabs defaultActiveKey="tarefas" className="mb-3">
        <Tab eventKey="tarefas" title="Tarefas">
          <Card>
            <Card.Body>
              <div className={styles.sectionHeader}>
                <h5>Tarefas da Lista</h5>
              </div>
              <div className={styles.tarefasList}>
                {tarefas.map((tarefa) => (
                  <div key={tarefa.id} className={styles.tarefaItem}>
                    <div>
                      <strong>{tarefa.template?.titulo}</strong>
                      <div className="text-muted small">
                        Tipo: {tarefa.template?.tipo_verificacao} | Criticidade: {tarefa.template?.criticidade}
                      </div>
                    </div>
                    <Button size="sm" variant="outline-danger" onClick={() => handleRemoveTarefa(tarefa.id)}>
                      Remover
                    </Button>
                  </div>
                ))}
                {tarefas.length === 0 && (
                  <p className="text-muted">Nenhuma tarefa cadastrada.</p>
                )}
              </div>
            </Card.Body>
          </Card>

          <Card className="mt-3">
            <Card.Body>
              <div className={styles.sectionHeader}>
                <h5>Adicionar Templates</h5>
                <Button size="sm" variant="primary" onClick={handleAddTemplates}>
                  <FontAwesomeIcon icon={faPlus} /> Adicionar
                </Button>
              </div>
              <div className={styles.templatesGrid}>
                {templates.map((template) => (
                  <Form.Check
                    key={template.id}
                    id={`template-${template.id}`}
                    type="checkbox"
                    label={template.titulo}
                    checked={selectedTemplates.includes(template.id)}
                    onChange={() => handleToggleTemplate(template.id)}
                  />
                ))}
              </div>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="colaboradores" title="Colaboradores">
          <Card>
            <Card.Body>
              <div className={styles.sectionHeader}>
                <h5>
                  <FontAwesomeIcon icon={faUsers} /> Colaboradores atribuídos
                </h5>
                <Button size="sm" variant="primary" onClick={handleSalvarColaboradores}>
                  Salvar
                </Button>
              </div>
              <div className={styles.templatesGrid}>
                {usuarios.map((user) => (
                  <Form.Check
                    key={user.id}
                    id={`colab-${user.id}`}
                    type="checkbox"
                    label={`${user.nome} (${user.email})`}
                    checked={selectedColaboradores.includes(user.id)}
                    onChange={() => handleToggleColaborador(user.id)}
                  />
                ))}
                {usuarios.length === 0 && <p className="text-muted">Nenhum colaborador encontrado.</p>}
              </div>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default POPListaDetalhes;
