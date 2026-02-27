'use client';

import { useState, useEffect, FormEvent } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Alert,
  Spinner,
  InputGroup,
  Row,
  Col,
} from 'react-bootstrap';
import api from '@/lib/api';
import { Item } from 'shared';
import styles from './Items.module.css';

interface FornecedorSummary {
  id: number;
  nome: string;
}

interface ItemComFornecedor extends Item {
  fornecedor?: FornecedorSummary | null;
}

export default function ItemsPage() {
  const [items, setItems] = useState<ItemComFornecedor[]>([]);
  const [fornecedores, setFornecedores] = useState<FornecedorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ItemComFornecedor | null>(null);
  const [nome, setNome] = useState('');
  const [unidadeMedida, setUnidadeMedida] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [search, setSearch] = useState('');
  const [filtroFornecedorId, setFiltroFornecedorId] = useState('');

  const fetchFornecedores = async () => {
    try {
      const { data } = await api.get('/v1/admin/fornecedores', { params: { ativo: true } });
      setFornecedores(data);
    } catch {
      // nao bloqueia a pagina se fornecedores falharem
    }
  };

  const fetchItems = async (fornId?: string) => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (fornId) params.fornecedorId = fornId;
      const { data } = await api.get('/v1/items', { params });
      setItems(data);
    } catch {
      setError('Erro ao carregar itens');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFornecedores();
    fetchItems();
  }, []);

  const handleFiltroFornecedor = (value: string) => {
    setFiltroFornecedorId(value);
    fetchItems(value || undefined);
  };

  const openModal = (item?: ItemComFornecedor) => {
    if (item) {
      setEditing(item);
      setNome(item.nome);
      setUnidadeMedida(item.unidadeMedida);
      setFornecedorId(item.fornecedor?.id?.toString() ?? '');
    } else {
      setEditing(null);
      setNome('');
      setUnidadeMedida('');
      setFornecedorId('');
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const payload: Record<string, unknown> = { nome, unidadeMedida };
      if (fornecedorId) payload.fornecedorId = parseInt(fornecedorId);
      else payload.fornecedorId = null;

      if (editing) {
        await api.put(`/v1/items/${editing.id}`, payload);
      } else {
        await api.post('/v1/items', payload);
      }
      setShowModal(false);
      fetchItems(filtroFornecedorId || undefined);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar item');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja desativar este item?')) return;
    try {
      await api.delete(`/v1/items/${id}`);
      fetchItems(filtroFornecedorId || undefined);
    } catch {
      setError('Erro ao desativar item');
    }
  };

  const filtered = items.filter((i) =>
    i.nome.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <h2 className={styles.pageTitle}>Itens</h2>
          <Button variant="primary" onClick={() => openModal()}>
            + Novo Item
          </Button>
        </div>

        {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

        <Row className="mb-3 g-2">
          <Col xs={12} sm={6} md={4}>
            <InputGroup>
              <Form.Control
                placeholder="Buscar item..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </InputGroup>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Form.Select
              value={filtroFornecedorId}
              onChange={(e) => handleFiltroFornecedor(e.target.value)}
            >
              <option value="">Todos os fornecedores</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </Form.Select>
          </Col>
        </Row>

        <div className={styles.tableWrapper}>
          <Table striped bordered hover responsive className={styles.table}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Unidade</th>
                <th>Fornecedor</th>
                <th style={{ width: 150 }}>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>{item.nome}</td>
                  <td>{item.unidadeMedida}</td>
                  <td>
                    {item.fornecedor?.nome ?? (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    <Button size="sm" variant="outline-primary" className="me-1" onClick={() => openModal(item)}>
                      Editar
                    </Button>
                    <Button size="sm" variant="outline-danger" onClick={() => handleDelete(item.id)}>
                      Excluir
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-muted">
                    Nenhum item encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>

        <Modal show={showModal} onHide={() => setShowModal(false)}>
          <Form onSubmit={handleSubmit}>
            <Modal.Header closeButton>
              <Modal.Title>{editing ? 'Editar Item' : 'Novo Item'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form.Group className="mb-3">
                <Form.Label>Nome</Form.Label>
                <Form.Control
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Unidade de Medida</Form.Label>
                <Form.Control
                  value={unidadeMedida}
                  onChange={(e) => setUnidadeMedida(e.target.value)}
                  placeholder="kg, un, L, cx..."
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Fornecedor (opcional)</Form.Label>
                <Form.Select
                  value={fornecedorId}
                  onChange={(e) => setFornecedorId(e.target.value)}
                >
                  <option value="">Nenhum</option>
                  {fornecedores.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                {editing ? 'Salvar' : 'Criar'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      </div>
    </div>
  );
}
