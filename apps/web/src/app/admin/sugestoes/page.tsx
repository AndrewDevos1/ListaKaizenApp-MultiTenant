'use client';

import { useState, useEffect, useCallback } from 'react';
import { Table, Alert, Spinner, Badge, Button, Tabs, Tab } from 'react-bootstrap';
import api from '@/lib/api';
import styles from './Sugestoes.module.css';
import { FaLightbulb, FaCheck, FaTimes } from 'react-icons/fa';

type Status = 'PENDENTE' | 'APROVADO' | 'REJEITADO';

interface Sugestao {
  id: number;
  nome: string;
  unidadeMedida: string;
  status: Status;
  criadoEm: string;
  usuario: { id: number; nome: string };
}

const STATUS_VARIANT: Record<Status, string> = {
  PENDENTE: 'warning',
  APROVADO: 'success',
  REJEITADO: 'danger',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

export default function AdminSugestoesPage() {
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<Status>('PENDENTE');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchSugestoes = useCallback(async (status: Status) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/v1/admin/sugestoes', { params: { status } });
      setSugestoes(data);
    } catch {
      setError('Erro ao carregar sugestoes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSugestoes(activeTab);
  }, [activeTab, fetchSugestoes]);

  const handleAprovar = async (sugestao: Sugestao) => {
    if (!confirm(`Aprovar a sugestao "${sugestao.nome}"? O item sera adicionado ao catalogo.`)) return;
    setActionLoading(sugestao.id);
    setError('');
    try {
      await api.put(`/v1/admin/sugestoes/${sugestao.id}/aprovar`);
      setSuccess(
        `Sugestao "${sugestao.nome}" aprovada! O item foi adicionado ao catalogo do restaurante.`,
      );
      fetchSugestoes(activeTab);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao aprovar sugestao');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejeitar = async (sugestao: Sugestao) => {
    if (!confirm(`Rejeitar a sugestao "${sugestao.nome}"?`)) return;
    setActionLoading(sugestao.id);
    setError('');
    try {
      await api.put(`/v1/admin/sugestoes/${sugestao.id}/rejeitar`);
      setSuccess(`Sugestao "${sugestao.nome}" rejeitada.`);
      fetchSugestoes(activeTab);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao rejeitar sugestao');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <h2 className={styles.pageTitle}>
            <FaLightbulb className="me-2" />
            Sugestoes de Itens
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
          </Tabs>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
          </div>
        ) : sugestoes.length === 0 ? (
          <div className={styles.emptyState}>
            <FaLightbulb className={styles.emptyIcon} />
            <h3 className={styles.emptyTitle}>Nenhuma sugestao encontrada</h3>
            <p className={styles.emptyText}>
              Nenhuma sugestao com status &ldquo;{activeTab}&rdquo; no momento.
            </p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <Table striped bordered hover responsive className={styles.table}>
              <thead>
                <tr className={styles.tableHeader}>
                  <th className={styles.tableHeaderCell}>#</th>
                  <th className={styles.tableHeaderCell}>Nome Sugerido</th>
                  <th className={styles.tableHeaderCell}>Unidade</th>
                  <th className={styles.tableHeaderCell}>Colaborador</th>
                  <th className={styles.tableHeaderCell}>Data</th>
                  <th className={styles.tableHeaderCell}>Status</th>
                  {activeTab === 'PENDENTE' && (
                    <th className={styles.tableHeaderCell} style={{ width: 160 }}>
                      Acoes
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {sugestoes.map((s) => (
                  <tr key={s.id} className={styles.tableRow}>
                    <td className={styles.tableCell}>{s.id}</td>
                    <td className={`${styles.tableCell} fw-semibold`}>{s.nome}</td>
                    <td className={styles.tableCell}>{s.unidadeMedida}</td>
                    <td className={styles.tableCell}>{s.usuario.nome}</td>
                    <td className={styles.tableCell}>{formatDate(s.criadoEm)}</td>
                    <td className={styles.tableCell}>
                      <Badge bg={STATUS_VARIANT[s.status]}>{s.status}</Badge>
                    </td>
                    {activeTab === 'PENDENTE' && (
                      <td className={styles.tableCell}>
                        <div className={styles.actionButtons}>
                          <Button
                            size="sm"
                            variant="outline-success"
                            title="Aprovar"
                            onClick={() => handleAprovar(s)}
                            disabled={actionLoading === s.id}
                          >
                            {actionLoading === s.id ? (
                              <Spinner animation="border" size="sm" />
                            ) : (
                              <FaCheck />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            title="Rejeitar"
                            onClick={() => handleRejeitar(s)}
                            disabled={actionLoading === s.id}
                          >
                            <FaTimes />
                          </Button>
                        </div>
                      </td>
                    )}
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
