'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Table, Alert, Spinner, Badge, Button, Modal, Form } from 'react-bootstrap';
import Link from 'next/link';
import api from '@/lib/api';
import styles from '@/app/admin/listas/[id]/ListaDetail.module.css';
import { FaPlus, FaFileInvoiceDollar, FaEye, FaLock } from 'react-icons/fa';

interface CotacaoSummary {
  id: number;
  titulo: string | null;
  status: 'ABERTA' | 'FECHADA';
  criadoEm: string;
  _count: { itens: number };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CotacoesPage() {
  const [cotacoes, setCotacoes] = useState<CotacaoSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal nova cotação
  const [showModal, setShowModal] = useState(false);
  const [novaTitulo, setNovaTitulo] = useState('');
  const [creating, setCreating] = useState(false);

  // Fechar cotação
  const [fechando, setFechando] = useState<number | null>(null);

  const fetchCotacoes = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/v1/admin/cotacoes');
      setCotacoes(data);
    } catch {
      setError('Erro ao carregar cotações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCotacoes();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const body: { titulo?: string } = {};
      if (novaTitulo.trim()) body.titulo = novaTitulo.trim();
      await api.post('/v1/admin/cotacoes', body);
      setShowModal(false);
      setNovaTitulo('');
      fetchCotacoes();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao criar cotação');
    } finally {
      setCreating(false);
    }
  };

  const handleFechar = async (id: number) => {
    if (!confirm('Fechar esta cotação? Esta ação não pode ser desfeita.')) return;
    setFechando(id);
    try {
      await api.put(`/v1/admin/cotacoes/${id}/fechar`);
      fetchCotacoes();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao fechar cotação');
    } finally {
      setFechando(null);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className={styles.listTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FaFileInvoiceDollar /> Cotações
            </h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              Gerencie cotações de preços com fornecedores
            </p>
          </div>
          <Button variant="primary" onClick={() => setShowModal(true)}>
            <FaPlus style={{ marginRight: '0.4rem' }} />
            Nova Cotação
          </Button>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <div className={styles.tableSection}>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <Table striped bordered hover responsive className={styles.table}>
                <thead>
                  <tr className={styles.tableHeader}>
                    <th className={styles.tableHeaderCell}>Título</th>
                    <th className={styles.tableHeaderCell}>Data</th>
                    <th className={styles.tableHeaderCell}>Nº Itens</th>
                    <th className={styles.tableHeaderCell}>Status</th>
                    <th className={styles.tableHeaderCell}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {cotacoes.map((c) => (
                    <tr key={c.id} className={styles.tableRow}>
                      <td className={`${styles.tableCell} ${styles.cellBold}`}>
                        {c.titulo || <span className="text-muted fst-italic">Sem título</span>}
                      </td>
                      <td className={styles.tableCell}>{formatDate(c.criadoEm)}</td>
                      <td className={styles.tableCell}>{c._count.itens}</td>
                      <td className={styles.tableCell}>
                        <Badge bg={c.status === 'ABERTA' ? 'warning' : 'secondary'}>
                          {c.status}
                        </Badge>
                      </td>
                      <td className={styles.tableCell}>
                        <div className={styles.actionButtons}>
                          <Link href={`/admin/cotacoes/${c.id}`}>
                            <Button size="sm" variant="outline-primary">
                              <FaEye style={{ marginRight: '0.3rem' }} />
                              Ver
                            </Button>
                          </Link>
                          {c.status === 'ABERTA' && (
                            <Button
                              size="sm"
                              variant="outline-secondary"
                              onClick={() => handleFechar(c.id)}
                              disabled={fechando === c.id}
                            >
                              {fechando === c.id ? (
                                <Spinner animation="border" size="sm" />
                              ) : (
                                <><FaLock style={{ marginRight: '0.3rem' }} />Fechar</>
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {cotacoes.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-4">
                        Nenhuma cotação encontrada
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Form onSubmit={handleCreate}>
          <Modal.Header closeButton>
            <Modal.Title>Nova Cotação</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group>
              <Form.Label>Título (opcional)</Form.Label>
              <Form.Control
                type="text"
                placeholder="Ex: Cotação Semana 10"
                value={novaTitulo}
                onChange={(e) => setNovaTitulo(e.target.value)}
              />
              <Form.Text className="text-muted">
                Deixe em branco para criar sem título
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={creating}>
              {creating ? <Spinner animation="border" size="sm" /> : 'Criar'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
