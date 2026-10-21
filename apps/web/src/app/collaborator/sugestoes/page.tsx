'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { Table, Alert, Spinner, Badge, Button, Modal, Form } from 'react-bootstrap';
import api from '@/lib/api';
import styles from './SugestoesColaborador.module.css';
import { FaLightbulb, FaPlus } from 'react-icons/fa';

type Status = 'PENDENTE' | 'APROVADO' | 'REJEITADO';

interface Sugestao {
  id: number;
  nome: string;
  unidadeMedida: string;
  status: Status;
  criadoEm: string;
}

const STATUS_VARIANT: Record<Status, string> = {
  PENDENTE: 'warning',
  APROVADO: 'success',
  REJEITADO: 'danger',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

export default function CollaboratorSugestoesPage() {
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [nome, setNome] = useState('');
  const [unidadeMedida, setUnidadeMedida] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchSugestoes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/v1/collaborator/sugestoes');
      setSugestoes(data);
    } catch {
      setError('Erro ao carregar sugestoes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSugestoes();
  }, [fetchSugestoes]);

  const openModal = () => {
    setNome('');
    setUnidadeMedida('');
    setModalError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setNome('');
    setUnidadeMedida('');
    setModalError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setModalError('O nome do item e obrigatorio.');
      return;
    }
    if (!unidadeMedida.trim()) {
      setModalError('A unidade de medida e obrigatoria.');
      return;
    }
    setSaving(true);
    setModalError('');
    try {
      await api.post('/v1/collaborator/sugestoes', {
        nome: nome.trim(),
        unidadeMedida: unidadeMedida.trim(),
      });
      closeModal();
      fetchSugestoes();
    } catch (err: any) {
      setModalError(err?.response?.data?.message || 'Erro ao criar sugestao');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <h2 className={styles.pageTitle}>
            <FaLightbulb className="me-2" />
            Minhas Sugestoes de Itens
          </h2>
          <Button variant="primary" onClick={openModal}>
            <FaPlus className="me-1" /> Nova Sugestao
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
        ) : sugestoes.length === 0 ? (
          <div className={styles.emptyState}>
            <FaLightbulb className={styles.emptyIcon} />
            <h3 className={styles.emptyTitle}>Nenhuma sugestao enviada</h3>
            <p className={styles.emptyText}>
              Clique em &ldquo;Nova Sugestao&rdquo; para sugerir um novo item ao administrador.
            </p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <Table striped bordered hover responsive className={styles.table}>
              <thead>
                <tr className={styles.tableHeader}>
                  <th className={styles.tableHeaderCell}>#</th>
                  <th className={styles.tableHeaderCell}>Nome</th>
                  <th className={styles.tableHeaderCell}>Unidade</th>
                  <th className={styles.tableHeaderCell}>Data</th>
                  <th className={styles.tableHeaderCell}>Status</th>
                </tr>
              </thead>
              <tbody>
                {sugestoes.map((s) => (
                  <tr key={s.id} className={styles.tableRow}>
                    <td className={styles.tableCell}>{s.id}</td>
                    <td className={`${styles.tableCell} fw-semibold`}>{s.nome}</td>
                    <td className={styles.tableCell}>{s.unidadeMedida}</td>
                    <td className={styles.tableCell}>{formatDate(s.criadoEm)}</td>
                    <td className={styles.tableCell}>
                      <Badge bg={STATUS_VARIANT[s.status]}>{s.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        {/* Modal: Nova Sugestao */}
        <Modal show={showModal} onHide={closeModal}>
          <Form onSubmit={handleSubmit}>
            <Modal.Header closeButton>
              <Modal.Title>Nova Sugestao de Item</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {modalError && (
                <Alert variant="danger" dismissible onClose={() => setModalError('')}>
                  {modalError}
                </Alert>
              )}
              <Form.Group className="mb-3">
                <Form.Label>
                  Nome do Item <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Azeite de oliva extravirgem"
                  required
                  autoFocus
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>
                  Unidade de Medida <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  value={unidadeMedida}
                  onChange={(e) => setUnidadeMedida(e.target.value)}
                  placeholder="Ex: L, kg, un, cx"
                  required
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
                    <Spinner animation="border" size="sm" className="me-1" /> Enviando...
                  </>
                ) : (
                  'Enviar Sugestao'
                )}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      </div>
    </div>
  );
}
