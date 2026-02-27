'use client';

import { useState, useEffect, useCallback } from 'react';
import { Table, Alert, Spinner, Badge, Button, Tabs, Tab } from 'react-bootstrap';
import Link from 'next/link';
import api from '@/lib/api';
import styles from './ListasRapidas.module.css';
import { FaClipboardList, FaEye, FaCheck, FaTimes, FaArchive } from 'react-icons/fa';

type Status = 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'ARQUIVADO';

interface ListaRapida {
  id: number;
  nome: string;
  status: Status;
  criadoEm: string;
  usuario: { id: number; nome: string };
  _count?: { itens: number };
}

const STATUS_VARIANT: Record<Status, string> = {
  PENDENTE: 'warning',
  APROVADO: 'success',
  REJEITADO: 'danger',
  ARQUIVADO: 'secondary',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

export default function AdminListasRapidasPage() {
  const [listas, setListas] = useState<ListaRapida[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<Status>('PENDENTE');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchListas = useCallback(async (status: Status) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/v1/admin/listas-rapidas', { params: { status } });
      setListas(data);
    } catch {
      setError('Erro ao carregar listas rápidas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListas(activeTab);
  }, [activeTab, fetchListas]);

  const handleAprovar = async (id: number) => {
    if (!confirm('Aprovar esta lista rápida?')) return;
    setActionLoading(id);
    setError('');
    try {
      await api.put(`/v1/admin/listas-rapidas/${id}/aprovar`);
      setSuccess('Lista aprovada com sucesso!');
      fetchListas(activeTab);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao aprovar lista');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejeitar = async (id: number) => {
    if (!confirm('Rejeitar esta lista rápida?')) return;
    setActionLoading(id);
    setError('');
    try {
      await api.put(`/v1/admin/listas-rapidas/${id}/rejeitar`);
      setSuccess('Lista rejeitada.');
      fetchListas(activeTab);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao rejeitar lista');
    } finally {
      setActionLoading(null);
    }
  };

  const handleArquivar = async (id: number) => {
    if (!confirm('Arquivar esta lista rápida?')) return;
    setActionLoading(id);
    setError('');
    try {
      await api.put(`/v1/admin/listas-rapidas/${id}/arquivar`);
      setSuccess('Lista arquivada.');
      fetchListas(activeTab);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao arquivar lista');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <h2 className={styles.pageTitle}>
            <FaClipboardList className="me-2" />
            Listas Rápidas
          </h2>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <div className={styles.tabsWrapper}>
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => {
              setSuccess('');
              setActiveTab(k as Status);
            }}
            className="mb-3"
          >
            <Tab eventKey="PENDENTE" title="Pendente" />
            <Tab eventKey="APROVADO" title="Aprovado" />
            <Tab eventKey="REJEITADO" title="Rejeitado" />
            <Tab eventKey="ARQUIVADO" title="Arquivado" />
          </Tabs>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
          </div>
        ) : listas.length === 0 ? (
          <div className={styles.emptyState}>
            <FaClipboardList className={styles.emptyIcon} />
            <h3 className={styles.emptyTitle}>Nenhuma lista encontrada</h3>
            <p className={styles.emptyText}>
              Nenhuma lista rápida com status &ldquo;{activeTab}&rdquo; no momento.
            </p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <Table striped bordered hover responsive className={styles.table}>
              <thead>
                <tr className={styles.tableHeader}>
                  <th className={styles.tableHeaderCell}>#</th>
                  <th className={styles.tableHeaderCell}>Nome</th>
                  <th className={styles.tableHeaderCell}>Colaborador</th>
                  <th className={styles.tableHeaderCell}>Data</th>
                  <th className={styles.tableHeaderCell}>Status</th>
                  <th className={styles.tableHeaderCell} style={{ width: 220 }}>
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody>
                {listas.map((lista) => (
                  <tr key={lista.id} className={styles.tableRow}>
                    <td className={styles.tableCell}>{lista.id}</td>
                    <td className={`${styles.tableCell} fw-semibold`}>{lista.nome}</td>
                    <td className={styles.tableCell}>{lista.usuario.nome}</td>
                    <td className={styles.tableCell}>{formatDate(lista.criadoEm)}</td>
                    <td className={styles.tableCell}>
                      <Badge bg={STATUS_VARIANT[lista.status]}>{lista.status}</Badge>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.actionButtons}>
                        <Link href={`/admin/listas-rapidas/${lista.id}`} passHref>
                          <Button size="sm" variant="outline-secondary" title="Ver detalhes">
                            <FaEye />
                          </Button>
                        </Link>
                        {lista.status === 'PENDENTE' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline-success"
                              title="Aprovar"
                              onClick={() => handleAprovar(lista.id)}
                              disabled={actionLoading === lista.id}
                            >
                              {actionLoading === lista.id ? (
                                <Spinner animation="border" size="sm" />
                              ) : (
                                <FaCheck />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              title="Rejeitar"
                              onClick={() => handleRejeitar(lista.id)}
                              disabled={actionLoading === lista.id}
                            >
                              <FaTimes />
                            </Button>
                          </>
                        )}
                        {(lista.status === 'APROVADO' || lista.status === 'REJEITADO') && (
                          <Button
                            size="sm"
                            variant="outline-warning"
                            title="Arquivar"
                            onClick={() => handleArquivar(lista.id)}
                            disabled={actionLoading === lista.id}
                          >
                            {actionLoading === lista.id ? (
                              <Spinner animation="border" size="sm" />
                            ) : (
                              <FaArchive />
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
