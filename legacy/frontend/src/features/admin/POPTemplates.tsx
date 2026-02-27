import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, Container, Form, Modal, Table } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboardList, faPlus, faEdit, faToggleOn, faToggleOff } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import styles from './POPTemplates.module.css';

interface Categoria {
  id: number;
  nome: string;
}

interface Area {
  id: number;
  nome: string;
}

interface POPTemplate {
  id: number;
  titulo: string;
  descricao?: string;
  instrucoes?: string;
  categoria_id?: number;
  categoria_nome?: string;
  area_id?: number;
  area_nome?: string;
  tipo_verificacao: string;
  requer_foto: boolean;
  requer_medicao: boolean;
  unidade_medicao?: string;
  valor_minimo?: number;
  valor_maximo?: number;
  criticidade: string;
  tempo_estimado?: number;
  ativo: boolean;
  rapida?: boolean;
}

const defaultForm = {
  titulo: '',
  descricao: '',
  instrucoes: '',
  categoria_id: '',
  area_id: '',
  tipo_verificacao: 'checkbox',
  requer_foto: false,
  requer_medicao: false,
  rapida: false,
  unidade_medicao: '',
  valor_minimo: '',
  valor_maximo: '',
  criticidade: 'normal',
  tempo_estimado: ''
};

const POPTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<POPTemplate[]>([]);
  const [templatesRapidos, setTemplatesRapidos] = useState<POPTemplate[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<POPTemplate | null>(null);
  const [formData, setFormData] = useState({ ...defaultForm });
  const [quickTitle, setQuickTitle] = useState('');
  const [quickAreaId, setQuickAreaId] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [templatesRes, categoriasRes, areasRes] = await Promise.all([
        api.get('/admin/pop-templates'),
        api.get('/admin/pop-categorias'),
        api.get('/v1/areas')
      ]);
      const templatesPayload = templatesRes.data;
      const allTemplates = Array.isArray(templatesPayload) ? templatesPayload : [];
      setTemplates(allTemplates.filter((template: POPTemplate) => !template.rapida));
      setTemplatesRapidos(allTemplates.filter((template: POPTemplate) => template.rapida));
      const categoriasPayload = categoriasRes.data;
      const areasPayload = areasRes.data;
      setCategorias(Array.isArray(categoriasPayload) ? categoriasPayload : []);
      setAreas(Array.isArray(areasPayload) ? areasPayload : areasPayload?.areas || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (template?: POPTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        titulo: template.titulo || '',
        descricao: template.descricao || '',
        instrucoes: template.instrucoes || '',
        categoria_id: template.categoria_id ? String(template.categoria_id) : '',
        area_id: template.area_id ? String(template.area_id) : '',
        tipo_verificacao: template.tipo_verificacao || 'checkbox',
        requer_foto: template.requer_foto,
        requer_medicao: template.requer_medicao,
        rapida: Boolean(template.rapida),
        unidade_medicao: template.unidade_medicao || '',
        valor_minimo: template.valor_minimo !== undefined ? String(template.valor_minimo) : '',
        valor_maximo: template.valor_maximo !== undefined ? String(template.valor_maximo) : '',
        criticidade: template.criticidade || 'normal',
        tempo_estimado: template.tempo_estimado !== undefined ? String(template.tempo_estimado) : ''
      });
    } else {
      setEditingTemplate(null);
      setFormData({ ...defaultForm });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
    setFormData({ ...defaultForm });
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      const payload = {
        ...formData,
        categoria_id: formData.categoria_id ? Number(formData.categoria_id) : null,
        area_id: formData.area_id ? Number(formData.area_id) : null,
        valor_minimo: formData.valor_minimo ? Number(formData.valor_minimo) : null,
        valor_maximo: formData.valor_maximo ? Number(formData.valor_maximo) : null,
        tempo_estimado: formData.tempo_estimado ? Number(formData.tempo_estimado) : null
      };

      if (editingTemplate) {
        await api.put(`/admin/pop-templates/${editingTemplate.id}`, payload);
      } else {
        await api.post('/admin/pop-templates', payload);
      }

      handleCloseModal();
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar template');
    }
  };

  const handleQuickCreate = async () => {
    if (!quickTitle.trim() || !quickAreaId) return;
    try {
      setQuickSaving(true);
      await api.post('/admin/pop-templates', {
        titulo: quickTitle.trim(),
        area_id: Number(quickAreaId),
        tipo_verificacao: 'checkbox',
        criticidade: 'normal',
        rapida: true
      });
      setQuickTitle('');
      setQuickAreaId('');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao cadastrar atividade rápida');
    } finally {
      setQuickSaving(false);
    }
  };

  const handlePromoteQuick = (template: POPTemplate) => {
    setEditingTemplate(template);
    setFormData({
      titulo: template.titulo || '',
      descricao: template.descricao || '',
      instrucoes: template.instrucoes || '',
      categoria_id: template.categoria_id ? String(template.categoria_id) : '',
      area_id: template.area_id ? String(template.area_id) : '',
      tipo_verificacao: template.tipo_verificacao || 'checkbox',
      requer_foto: template.requer_foto,
      requer_medicao: template.requer_medicao,
      rapida: false,
      unidade_medicao: template.unidade_medicao || '',
      valor_minimo: template.valor_minimo !== undefined ? String(template.valor_minimo) : '',
      valor_maximo: template.valor_maximo !== undefined ? String(template.valor_maximo) : '',
      criticidade: template.criticidade || 'normal',
      tempo_estimado: template.tempo_estimado !== undefined ? String(template.tempo_estimado) : ''
    });
    setShowModal(true);
  };

  const handleToggleAtivo = async (template: POPTemplate) => {
    try {
      await api.patch(`/admin/pop-templates/${template.id}/toggle-ativo`);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao alternar status');
    }
  };

  return (
    <Container fluid className="py-4">
      <div className={styles.header}>
        <div>
          <h2 className="mb-1">
            <FontAwesomeIcon icon={faClipboardList} /> POP Atividades
          </h2>
          <p className="text-muted">Cadastre atividades padrao e selecione a area na hora de criar</p>
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card className="shadow-sm">
        <Card.Body>
          <div className={styles.tableHeader}>
            <h5 className="mb-0">Atividades cadastradas</h5>
            <Button variant="primary" size="sm" onClick={() => handleOpenModal()}>
              <FontAwesomeIcon icon={faPlus} /> Cadastrar atividade
            </Button>
          </div>
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
            </div>
          ) : (
            <Table responsive hover className="mb-0">
              <thead>
                <tr>
                  <th>Titulo</th>
                  <th>Tipo</th>
                  <th>Criticidade</th>
                  <th>Categoria</th>
                  <th>Area</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template.id}>
                    <td>{template.titulo}</td>
                    <td>{template.tipo_verificacao}</td>
                    <td>{template.criticidade}</td>
                    <td>{template.categoria_nome || '-'}</td>
                    <td>{template.area_nome || '-'}</td>
                    <td>{template.ativo ? 'Ativo' : 'Inativo'}</td>
                    <td className="text-end">
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        className="me-2"
                        onClick={() => handleOpenModal(template)}
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={() => handleToggleAtivo(template)}
                      >
                        <FontAwesomeIcon icon={template.ativo ? faToggleOn : faToggleOff} />
                      </Button>
                    </td>
                  </tr>
                ))}
                {templates.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-4">
                      Nenhum template cadastrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Card className="shadow-sm mt-4">
        <Card.Body>
          <div className={styles.tableHeader}>
            <h5 className="mb-0">Atividades rápidas</h5>
            <span className="text-muted">Cadastro simples (titulo + area)</span>
          </div>
          <div className={styles.quickForm}>
            <Form.Control
              placeholder="Titulo da atividade"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
            />
            <Form.Select
              value={quickAreaId}
              onChange={(e) => setQuickAreaId(e.target.value)}
            >
              <option value="">Area</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>{area.nome}</option>
              ))}
            </Form.Select>
            <Button variant="outline-primary" onClick={handleQuickCreate} disabled={quickSaving}>
              <FontAwesomeIcon icon={faPlus} /> Adicionar
            </Button>
          </div>
          <div className={styles.quickList}>
            {templatesRapidos.map((template) => (
              <div key={template.id} className={styles.quickItem}>
                <div>
                  <strong>{template.titulo}</strong>
                  <div className="text-muted small">{template.area_nome || 'Sem area'}</div>
                </div>
                <div className={styles.quickActions}>
                  <Button size="sm" variant="outline-secondary" onClick={() => handleOpenModal(template)}>
                    Editar
                  </Button>
                  <Button size="sm" variant="outline-success" onClick={() => handlePromoteQuick(template)}>
                    Promover
                  </Button>
                </div>
              </div>
            ))}
            {templatesRapidos.length === 0 && (
              <p className="text-muted">Nenhuma atividade rápida cadastrada.</p>
            )}
          </div>
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingTemplate ? 'Editar atividade' : 'Cadastrar atividade'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Titulo</Form.Label>
              <Form.Control
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
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
            <Form.Group className="mb-3">
              <Form.Label>Instrucoes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.instrucoes}
                onChange={(e) => setFormData({ ...formData, instrucoes: e.target.value })}
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
                <Form.Label>Tipo de verificacao</Form.Label>
                <Form.Select
                  value={formData.tipo_verificacao}
                  onChange={(e) => setFormData({ ...formData, tipo_verificacao: e.target.value })}
                >
                  <option value="checkbox">Checkbox</option>
                  <option value="medicao">Medicao</option>
                  <option value="temperatura">Temperatura</option>
                  <option value="texto">Texto</option>
                  <option value="foto">Foto</option>
                </Form.Select>
              </Form.Group>
              <Form.Group>
                <Form.Label>Criticidade</Form.Label>
                <Form.Select
                  value={formData.criticidade}
                  onChange={(e) => setFormData({ ...formData, criticidade: e.target.value })}
                >
                  <option value="baixa">Baixa</option>
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Critica</option>
                </Form.Select>
              </Form.Group>
            </div>

            <div className={styles.grid}>
              <Form.Group>
                <Form.Label>Unidade medicao</Form.Label>
                <Form.Control
                  value={formData.unidade_medicao}
                  onChange={(e) => setFormData({ ...formData, unidade_medicao: e.target.value })}
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Valor minimo</Form.Label>
                <Form.Control
                  type="number"
                  value={formData.valor_minimo}
                  onChange={(e) => setFormData({ ...formData, valor_minimo: e.target.value })}
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Valor maximo</Form.Label>
                <Form.Control
                  type="number"
                  value={formData.valor_maximo}
                  onChange={(e) => setFormData({ ...formData, valor_maximo: e.target.value })}
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Tempo estimado (min)</Form.Label>
                <Form.Control
                  type="number"
                  value={formData.tempo_estimado}
                  onChange={(e) => setFormData({ ...formData, tempo_estimado: e.target.value })}
                />
              </Form.Group>
            </div>

            <div className={styles.checkboxRow}>
              <Form.Check
                type="checkbox"
                label="Requer foto (placeholder)"
                checked={formData.requer_foto}
                onChange={(e) => setFormData({ ...formData, requer_foto: e.target.checked })}
              />
              <Form.Check
                type="checkbox"
                label="Requer medicao"
                checked={formData.requer_medicao}
                onChange={(e) => setFormData({ ...formData, requer_medicao: e.target.checked })}
              />
              <Form.Check
                type="switch"
                label="Atividade rápida"
                checked={formData.rapida}
                onChange={(e) => setFormData({ ...formData, rapida: e.target.checked })}
              />
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit}>Salvar</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default POPTemplates;
