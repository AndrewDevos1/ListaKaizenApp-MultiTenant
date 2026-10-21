'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { Table, Alert, Spinner, Badge, Button, Modal, Form } from 'react-bootstrap';
import Link from 'next/link';
import api from '@/lib/api';
import styles from './ListasRapidasColaborador.module.css';
import { FaClipboardList, FaPlus, FaEye } from 'react-icons/fa';

type Status = 'RASCUNHO' | 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'ARQUIVADO';

interface ListaRapida {
  id: number;
  nome: string;
  status: Status;
  criadoEm: string;
  _count?: { itens: number };
}

const STATUS_VARIANT: Record<Status, string> = {
  RASCUNHO: 'secondary',
  PENDENTE: 'warning',
  APROVADO: 'success',
  REJEITADO: 'danger',
  ARQUIVADO: 'dark',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

export default function CollaboratorListasRapidasPage() {
  const [listas, setListas] = useState<ListaRapida[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [nome, setNome] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchListas = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/v1/collaborator/listas-rapidas');
      setListas(data);
    } catch {
      setError('Erro ao carregar listas rápidas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListas();
  }, [fetchListas]);

  const openModal = () => {
    setNome('');
    setModalError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setNome('');
    setModalError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setModalError('O nome da lista é obrigatório.');
      return;
    }
    setSaving(true);
    setModalError('');
    try {
      await api.post('/v1/collaborator/listas-rapidas', { nome: nome.trim() });
      closeModal();
      fetchListas();
    } catch (err: any) {
      setModalError(err?.response?.data?.message || 'Erro ao criar lista');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <h2 className={styles.pageTitle}>
            <FaClipboardList className="me-2" />
            Minhas Listas Rapidas
          </h2>
          <Button variant="primary" onClick={openModal}>
            <FaPlus className="me-1" /> Nova Lista Rapida
          </Button>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
          </div>
        ) : listas.length === 0 ? (
          <div className={styles.emptyState}>
            <FaClipboardList className={styles.emptyIcon} />
            <h3 className={styles.emptyTitle}>Nenhuma lista criada</h3>
            <p className={styles.emptyText}>
              Clique em &ldquo;Nova Lista Rapida&rdquo; para criar sua primeira lista.
            </p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <Table striped bordered hover responsive className={styles.table}>
              <thead>
                <tr className={styles.tableHeader}>
                  <th className={styles.tableHeaderCell}>#</th>
                  <th className={styles.tableHeaderCell}>Nome</th>
                  <th className={styles.tableHeaderCell}>Itens</th>
                  <th className={styles.tableHeaderCell}>Data</th>
                  <th className={styles.tableHeaderCell}>Status</th>
                  <th className={styles.tableHeaderCell} style={{ width: 100 }}>
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody>
                {listas.map((lista) => (
                  <tr key={lista.id} className={styles.tableRow}>
                    <td className={styles.tableCell}>{lista.id}</td>
                    <td className={`${styles.tableCell} fw-semibold`}>{lista.nome}</td>
                    <td className={styles.tableCell}>
                      {lista._count?.itens ?? <span className={styles.cellMuted}>—</span>}
                    </td>
                    <td className={styles.tableCell}>{formatDate(lista.criadoEm)}</td>
                    <td className={styles.tableCell}>
                      <Badge bg={STATUS_VARIANT[lista.status]}>{lista.status}</Badge>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.actionButtons}>
                        <Link href={`/collaborator/listas-rapidas/${lista.id}`} passHref>
                          <Button size="sm" variant="outline-primary" title="Ver detalhes">
                            <FaEye />
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        {/* Modal: Nova Lista Rapida */}
        <Modal show={showModal} onHide={closeModal}>
          <Form onSubmit={handleSubmit}>
            <Modal.Header closeButton>
              <Modal.Title>Nova Lista Rapida</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {modalError && (
                <Alert variant="danger" dismissible onClose={() => setModalError('')}>
                  {modalError}
                </Alert>
              )}
              <Form.Group>
                <Form.Label>
                  Nome da lista <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Compras da semana"
                  required
                  autoFocus
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={closeModal} disabled={saving}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-1" /> Criando...
                  </>
                ) : (
                  'Criar'
                )}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      </div>
    </div>
  );
}
