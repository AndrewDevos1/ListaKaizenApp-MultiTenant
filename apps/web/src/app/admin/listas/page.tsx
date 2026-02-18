'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Button, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import Link from 'next/link';
import api from '@/lib/api';
import styles from './Listas.module.css';
import { FaPlus, FaList, FaTrash } from 'react-icons/fa';

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
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <h2 className={styles.pageTitle}>Listas</h2>
          <Button variant="primary" onClick={() => setShowModal(true)}>
            <FaPlus /> Nova Lista
          </Button>
        </div>

        {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

        <div className={styles.listsGrid}>
          <div className={`${styles.listCard} ${styles.cardCriar}`} onClick={() => setShowModal(true)}>
            <div className={styles.criarContent}>
              <div className={styles.criarIcon}>
                <FaPlus />
              </div>
              <p className={styles.criarText}>Criar Nova Lista</p>
            </div>
          </div>

          {listas.map((lista) => (
            <Link
              key={lista.id}
              href={`/admin/listas/${lista.id}`}
              className={`${styles.listCard} ${styles.cardLista}`}
            >
              <div className={styles.listHeader}>
                <div className={styles.listIcon}>
                  <FaList />
                </div>
              </div>

              <h3 className={styles.listName}>{lista.nome}</h3>
              <p className={styles.listDescription}>
                {lista._count.itensRef} itens • {lista._count.colaboradores} colaborador{lista._count.colaboradores !== 1 ? 'es' : ''}
              </p>

              <div className={styles.listMeta}>
                <span className={styles.metaItem}>
                  <strong>{lista._count.itensRef}</strong> itens
                </span>
                <span className={styles.metaItem}>
                  <strong>{lista._count.colaboradores}</strong> colab.
                </span>
              </div>

              <div className={styles.listActions}>
                <button
                  className={styles.actionBtn}
                  onClick={(e) => {
                    e.preventDefault();
                  }}
                >
                  Gerenciar
                </button>
                <button
                  className={styles.actionBtn}
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete(lista.id);
                  }}
                >
                  <FaTrash />
                </button>
              </div>
            </Link>
          ))}
        </div>

        {listas.length === 0 && (
          <div className={styles.emptyState}>
            <FaList className={styles.emptyIcon} />
            <h3 className={styles.emptyTitle}>Nenhuma lista cadastrada</h3>
            <p className={styles.emptyText}>Clique em "Nova Lista" para criar sua primeira lista</p>
          </div>
        )}

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
      </div>
    </div>
  );
}
