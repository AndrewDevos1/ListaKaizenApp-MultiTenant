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
} from 'react-bootstrap';
import api from '@/lib/api';
import { Item } from 'shared';

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [nome, setNome] = useState('');
  const [unidadeMedida, setUnidadeMedida] = useState('');
  const [search, setSearch] = useState('');

  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/v1/items');
      setItems(data);
    } catch {
      setError('Erro ao carregar itens');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const openModal = (item?: Item) => {
    if (item) {
      setEditing(item);
      setNome(item.nome);
      setUnidadeMedida(item.unidadeMedida);
    } else {
      setEditing(null);
      setNome('');
      setUnidadeMedida('');
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.put(`/v1/items/${editing.id}`, { nome, unidadeMedida });
      } else {
        await api.post('/v1/items', { nome, unidadeMedida });
      }
      setShowModal(false);
      fetchItems();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar item');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja desativar este item?')) return;
    try {
      await api.delete(`/v1/items/${id}`);
      fetchItems();
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
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Itens</h2>
        <Button variant="primary" onClick={() => openModal()}>
          + Novo Item
        </Button>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      <InputGroup className="mb-3" style={{ maxWidth: 400 }}>
        <Form.Control
          placeholder="Buscar item..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </InputGroup>

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Unidade</th>
            <th style={{ width: 150 }}>Acoes</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((item) => (
            <tr key={item.id}>
              <td>{item.nome}</td>
              <td>{item.unidadeMedida}</td>
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
              <td colSpan={3} className="text-center text-muted">
                Nenhum item encontrado
              </td>
            </tr>
          )}
        </tbody>
      </Table>

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
    </>
  );
}
