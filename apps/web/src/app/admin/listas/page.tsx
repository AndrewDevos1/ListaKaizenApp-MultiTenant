'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Table, Button, Modal, Form, Alert, Spinner, Badge } from 'react-bootstrap';
import Link from 'next/link';
import api from '@/lib/api';

interface ListaSummary {
  id: number;
  nome: string;
  criadoEm: string;
  _count: { colaboradores: number; itensRef: number };
}

export default function ListasPage() {
  const [listas, setListas] = useState<ListaSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [nome, setNome] = useState('');

  const fetchListas = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/v1/listas');
      setListas(data);
    } catch {
      setError('Erro ao carregar listas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListas();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/v1/listas', { nome });
      setShowModal(false);
      setNome('');
      fetchListas();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao criar lista');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja deletar esta lista?')) return;
    try {
      await api.delete(`/v1/listas/${id}`);
      fetchListas();
    } catch {
      setError('Erro ao deletar lista');
    }
  };

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
        <h2>Listas</h2>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          + Nova Lista
        </Button>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Colaboradores</th>
            <th>Itens</th>
            <th style={{ width: 200 }}>Acoes</th>
          </tr>
        </thead>
        <tbody>
          {listas.map((lista) => (
            <tr key={lista.id}>
              <td>
                <Link href={`/admin/listas/${lista.id}`}>{lista.nome}</Link>
              </td>
              <td>
                <Badge bg="info">{lista._count.colaboradores}</Badge>
              </td>
              <td>
                <Badge bg="secondary">{lista._count.itensRef}</Badge>
              </td>
              <td>
                <Button
                  size="sm"
                  variant="outline-primary"
                  className="me-1"
                  as={Link as any}
                  href={`/admin/listas/${lista.id}`}
                >
                  Gerenciar
                </Button>
                <Button size="sm" variant="outline-danger" onClick={() => handleDelete(lista.id)}>
                  Excluir
                </Button>
              </td>
            </tr>
          ))}
          {listas.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center text-muted">
                Nenhuma lista cadastrada
              </td>
            </tr>
          )}
        </tbody>
      </Table>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Form onSubmit={handleCreate}>
          <Modal.Header closeButton>
            <Modal.Title>Nova Lista</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group>
              <Form.Label>Nome</Form.Label>
              <Form.Control
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Lista Semanal"
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Criar
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}
