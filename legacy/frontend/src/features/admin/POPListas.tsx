import React, { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Container, Form, Modal } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faCheckCircle,
  faClipboardCheck,
  faLayerGroup,
  faPlus
} from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import styles from './POPListas.module.css';

interface POPLista {
  id: number;
  nome: string;
  descricao?: string;
  recorrencia: string;
  dias_semana?: string;
  horario_sugerido?: string;
  publico: boolean;
  total_tarefas?: number;
  total_colaboradores?: number;
}

interface POPTemplate {
  id: number;
  titulo: string;
  descricao?: string;
  categoria_nome?: string;
  area_nome?: string;
  tipo_verificacao: string;
}

interface Categoria {
  id: number;
  nome: string;
}

interface Area {
  id: number;
  nome: string;
}

const POPListas: React.FC = () => {
  const [listas, setListas] = useState<POPLista[]>([]);
  const [templates, setTemplates] = useState<POPTemplate[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [templatesPreview, setTemplatesPreview] = useState<Record<number, POPTemplate[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<number[]>([]);
  const [showTemplatesTab, setShowTemplatesTab] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    categoria_id: '',
    area_id: '',
    recorrencia: 'diaria',
    dias_semana: '',
    horario_sugerido: '',
    publico: false
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [listasRes, templatesRes, categoriasRes, areasRes] = await Promise.all([
        api.get('/admin/pop-listas'),
        api.get('/admin/pop-templates'),
        api.get('/admin/pop-categorias'),
        api.get('/v1/areas')
      ]);
      const listasData = Array.isArray(listasRes.data) ? listasRes.data : [];
      setListas(listasData);
      const templatesData = Array.isArray(templatesRes.data) ? templatesRes.data : [];
      const categoriasData = Array.isArray(categoriasRes.data) ? categoriasRes.data : [];
      const areasPayload = areasRes.data;
      const areasData = Array.isArray(areasPayload) ? areasPayload : areasPayload?.areas || [];
      setTemplates(templatesData);
      setCategorias(categoriasData);
      setAreas(areasData);

      const previews = await Promise.all(
        listasData.map(async (lista: POPLista) => {
          try {
            const tarefasRes = await api.get(`/admin/pop-listas/${lista.id}/tarefas`);
            const itens = (tarefasRes.data || []).map((tarefa: any) => tarefa.template).filter(Boolean);
            return { listaId: lista.id, itens: itens.slice(0, 3) };
          } catch {
            return { listaId: lista.id, itens: [] };
          }
        })
      );
      const previewMap: Record<number, POPTemplate[]> = {};
      previews.forEach((item) => {
        previewMap[item.listaId] = item.itens;
      });
      setTemplatesPreview(previewMap);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar listas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = () => {
    setFormData({
      nome: '',
      descricao: '',
      categoria_id: '',
      area_id: '',
      recorrencia: 'diaria',
      dias_semana: '',
      horario_sugerido: '',
      publico: false
    });
    setSelectedTemplates([]);
    setShowTemplatesTab(false);
    setSearchTerm('');
    setFilterCategoria('');
    setFilterArea('');
    setFilterTipo('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleToggleTemplate = (templateId: number) => {
    setSelectedTemplates((prev) => {
      if (prev.includes(templateId)) {
        return prev.filter((id) => id !== templateId);
      }
      return [...prev, templateId];
    });
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      const payload = {
        ...formData,
        categoria_id: formData.categoria_id ? Number(formData.categoria_id) : null,
        area_id: formData.area_id ? Number(formData.area_id) : null,
        template_ids: selectedTemplates
      };
      await api.post('/admin/pop-listas', payload);
      handleCloseModal();
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao criar lista');
    }
  };

  const filteredTemplates = templates.filter((template) => {
    if (searchTerm && !template.titulo.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (filterCategoria && template.categoria_nome !== filterCategoria) {
      return false;
    }
    if (filterArea && template.area_nome !== filterArea) {
      return false;
    }
    if (filterTipo && template.tipo_verificacao !== filterTipo) {
      return false;
    }
    return true;
  });

  return (
    <Container fluid className="py-4">
      <div className={styles.header}>
        <div>
          <h2 className="mb-1">
            <FontAwesomeIcon icon={faClipboardCheck} /> POP Listas
          </h2>
          <p className="text-muted">Organize checklists diarios por area e recorrencia</p>
        </div>
        <Button variant="primary" onClick={handleOpenModal}>
          <FontAwesomeIcon icon={faPlus} /> Nova Lista
        </Button>
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
        <div className={styles.cardsGrid}>
          {listas.map((lista) => (
            <Card key={lista.id} className={styles.listaCard}>
              <Card.Body>
                <div className={styles.cardHeader}>
                  <div>
                    <h5 className={styles.cardTitle}>{lista.nome}</h5>
                    <p className="text-muted">{lista.descricao || 'Sem descricao'}</p>
                  </div>
                  <Badge bg="secondary">{lista.recorrencia}</Badge>
                </div>
                <div className={styles.cardMeta}>
                  <span>Tarefas: <strong>{lista.total_tarefas ?? 0}</strong></span>
                  <span>Colaboradores: <strong>{lista.total_colaboradores ?? 0}</strong></span>
                  {lista.publico && <Badge bg="success">Publica</Badge>}
                </div>
                <div className={styles.previewBox}>
                  <div className={styles.previewTitle}>
                    <FontAwesomeIcon icon={faLayerGroup} /> Primeiras tarefas
                  </div>
                  {(templatesPreview[lista.id] || []).map((template) => (
                    <div key={template.id} className={styles.previewItem}>
                      <span>{template.titulo}</span>
                      <Badge bg="light" text="dark">{template.tipo_verificacao}</Badge>
                    </div>
                  ))}
                  {(templatesPreview[lista.id] || []).length === 0 && (
                    <div className="text-muted">Nenhuma tarefa vinculada</div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline-primary"
                  onClick={() => navigate(`/admin/pop-listas/${lista.id}`)}
                  className={styles.cardButton}
                >
                  Detalhes <FontAwesomeIcon icon={faArrowRight} />
                </Button>
              </Card.Body>
            </Card>
          ))}
          {listas.length === 0 && (
            <Card className={styles.emptyCard}>
              <Card.Body>Nenhuma lista criada.</Card.Body>
            </Card>
          )}
        </div>
      )}

      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Nova Lista POP</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className={styles.tabsHeader}>
            <Button
              variant={showTemplatesTab ? 'outline-secondary' : 'primary'}
              onClick={() => setShowTemplatesTab(false)}
            >
              Informacoes
            </Button>
            <Button
              variant={showTemplatesTab ? 'primary' : 'outline-secondary'}
              onClick={() => setShowTemplatesTab(true)}
            >
              Tarefas ({selectedTemplates.length})
            </Button>
            {showTemplatesTab && (
              <Button
                variant="outline-primary"
                className={styles.newTaskButton}
                onClick={() => navigate('/admin/pop-templates')}
              >
                Nova tarefa
              </Button>
            )}
          </div>

          {!showTemplatesTab ? (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Nome</Form.Label>
                <Form.Control
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Descricao</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                />
              </Form.Group>
              <div className={styles.grid}>
                <Form.Group>
                  <Form.Label>Categoria</Form.Label>
                  <Form.Select
                    value={formData.categoria_id}
                    onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                  >
                    <option value="">Selecione</option>
                    {categorias.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.nome}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group>
                  <Form.Label>Area</Form.Label>
                  <Form.Select
                    value={formData.area_id}
                    onChange={(e) => setFormData({ ...formData, area_id: e.target.value })}
                  >
                    <option value="">Selecione</option>
                    {areas.map((area) => (
                      <option key={area.id} value={area.id}>{area.nome}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group>
                  <Form.Label>Recorrencia</Form.Label>
                  <Form.Select
                    value={formData.recorrencia}
                    onChange={(e) => setFormData({ ...formData, recorrencia: e.target.value })}
                  >
                    <option value="diaria">Diaria</option>
                    <option value="semanal">Semanal</option>
                    <option value="mensal">Mensal</option>
                    <option value="sob_demanda">Sob demanda</option>
                  </Form.Select>
                </Form.Group>
                <Form.Group>
                  <Form.Label>Dias da semana</Form.Label>
                  <Form.Control
                    placeholder="1,2,3,4,5"
                    value={formData.dias_semana}
                    onChange={(e) => setFormData({ ...formData, dias_semana: e.target.value })}
                  />
                </Form.Group>
                <Form.Group>
                  <Form.Label>Horario sugerido</Form.Label>
                  <Form.Control
                    type="time"
                    value={formData.horario_sugerido}
                    onChange={(e) => setFormData({ ...formData, horario_sugerido: e.target.value })}
                  />
                </Form.Group>
                <Form.Group className="d-flex align-items-center gap-2">
                  <Form.Check
                    type="checkbox"
                    label="Publica"
                    checked={formData.publico}
                    onChange={(e) => setFormData({ ...formData, publico: e.target.checked })}
                  />
                </Form.Group>
              </div>
            </Form>
          ) : (
            <div>
              <div className={styles.filtersBar}>
                <Form.Control
                  placeholder="Buscar tarefa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Form.Select
                  value={filterCategoria}
                  onChange={(e) => setFilterCategoria(e.target.value)}
                >
                  <option value="">Categoria</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.nome}>{cat.nome}</option>
                  ))}
                </Form.Select>
                <Form.Select
                  value={filterArea}
                  onChange={(e) => setFilterArea(e.target.value)}
                >
                  <option value="">Area</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.nome}>{area.nome}</option>
                  ))}
                </Form.Select>
                <Form.Select
                  value={filterTipo}
                  onChange={(e) => setFilterTipo(e.target.value)}
                >
                  <option value="">Tipo</option>
                  <option value="checkbox">Checkbox</option>
                  <option value="medicao">Medicao</option>
                  <option value="temperatura">Temperatura</option>
                  <option value="texto">Texto</option>
                  <option value="foto">Foto</option>
                </Form.Select>
              </div>

              <div className={styles.templatesGrid}>
                {filteredTemplates.map((template) => {
                  const selected = selectedTemplates.includes(template.id);
                  return (
                    <Card key={template.id} className={styles.templateCard}>
                      <Card.Body>
                        <div className={styles.templateHeader}>
                          <h6>{template.titulo}</h6>
                          <Badge bg="light" text="dark">{template.tipo_verificacao}</Badge>
                        </div>
                        <p className="text-muted">{template.descricao || 'Sem descricao'}</p>
                        <div className={styles.templateMeta}>
                          <span>{template.categoria_nome || 'Sem categoria'}</span>
                          <span>{template.area_nome || 'Sem area'}</span>
                        </div>
                        <Button
                          variant={selected ? 'success' : 'outline-primary'}
                          size="sm"
                          onClick={() => handleToggleTemplate(template.id)}
                        >
                          <FontAwesomeIcon icon={faCheckCircle} /> {selected ? 'Selecionado' : 'Adicionar'}
                        </Button>
                      </Card.Body>
                    </Card>
                  );
                })}
                {filteredTemplates.length === 0 && (
                  <div className="text-muted">Nenhuma tarefa encontrada.</div>
                )}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit}>Salvar</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default POPListas;
