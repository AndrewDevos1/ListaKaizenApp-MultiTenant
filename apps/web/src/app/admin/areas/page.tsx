'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Table, Button, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import api from '@/lib/api';
import { Area } from 'shared';
import styles from './Areas.module.css';

export default function AreasPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Area | null>(null);
  const [nome, setNome] = useState('');

  const fetchAreas = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/v1/areas');
      setAreas(data);
    } catch {
      setError('Erro ao carregar areas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAreas();
  }, []);

  const openModal = (area?: Area) => {
    if (area) {
      setEditing(area);
      setNome(area.nome);
    } else {
      setEditing(null);
      setNome('');
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.put(`/v1/areas/${editing.id}`, { nome });
      } else {
        await api.post('/v1/areas', { nome });
      }
      setShowModal(false);
      fetchAreas();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar area');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja remover esta area?')) return;
    try {
      await api.delete(`/v1/areas/${id}`);
      fetchAreas();
    } catch {
      setError('Erro ao remover area');
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
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <h2 className={styles.pageTitle}>Áreas</h2>
          <Button variant="primary" onClick={() => openModal()}>
            + Nova Área
          </Button>
        </div>

        {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

        <div className={styles.tableWrapper}>
          <Table striped bordered hover responsive className={styles.table}>
        <thead>
          <tr>
            <th>Nome</th>
            <th style={{ width: 150 }}>Acoes</th>
          </tr>
        </thead>
        <tbody>
          {areas.map((area) => (
            <tr key={area.id}>
              <td>{area.nome}</td>
              <td>
                <Button size="sm" variant="outline-primary" className="me-1" onClick={() => openModal(area)}>
                  Editar
                </Button>
                <Button size="sm" variant="outline-danger" onClick={() => handleDelete(area.id)}>
                  Excluir
                </Button>
              </td>
            </tr>
          ))}
          {areas.length === 0 && (
            <tr>
              <td colSpan={2} className="text-center text-muted">
                Nenhuma area cadastrada
              </td>
            </tr>
          )}
        </tbody>
          </Table>
        </div>

        <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Form onSubmit={handleSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>{editing ? 'Editar Area' : 'Nova Area'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nome</Form.Label>
              <Form.Control
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Cozinha, Bar, Salao..."
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
      </div>
    </div>
  );
}
