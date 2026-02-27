'use client';

import { useState, useEffect } from 'react';
import { Table, Alert, Spinner, Badge, Button, Tabs, Tab } from 'react-bootstrap';
import Link from 'next/link';
import api from '@/lib/api';
import styles from '@/app/admin/listas/[id]/ListaDetail.module.css';
import { FaClipboardCheck } from 'react-icons/fa';

type StatusSubmissao = 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'PARCIAL' | 'ARQUIVADO';

interface SubmissaoSummary {
  id: number;
  status: StatusSubmissao;
  criadoEm: string;
  arquivada: boolean;
  lista: { id: number; nome: string };
  colaborador: { id: number; usuario: { nome: string } };
  _count: { pedidos: number };
}

const STATUS_VARIANT: Record<StatusSubmissao, string> = {
  PENDENTE: 'warning',
  APROVADO: 'success',
  REJEITADO: 'danger',
  PARCIAL: 'info',
  ARQUIVADO: 'secondary',
};

const TABS: { key: StatusSubmissao | 'ARQUIVADO'; label: string }[] = [
  { key: 'PENDENTE', label: 'Pendente' },
  { key: 'APROVADO', label: 'Aprovado' },
  { key: 'REJEITADO', label: 'Rejeitado' },
  { key: 'PARCIAL', label: 'Parcial' },
  { key: 'ARQUIVADO', label: 'Arquivado' },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminSubmissoesPage() {
  const [submissoes, setSubmissoes] = useState<SubmissaoSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<string>('PENDENTE');
  const [arquivando, setArquivando] = useState<number | null>(null);

  const fetchSubmissoes = async (status: string) => {
    setLoading(true);
    setError('');
    try {
      const arquivada = status === 'ARQUIVADO' ? 'true' : 'false';
      const params: Record<string, string> = { arquivada };
      if (status !== 'ARQUIVADO') {
        params.status = status;
      }
      const { data } = await api.get('/v1/admin/submissoes', { params });
      setSubmissoes(data);
    } catch {
      setError('Erro ao carregar submissões');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissoes(activeTab);
  }, [activeTab]);

  const handleArquivar = async (id: number) => {
    if (!confirm('Arquivar esta submissão?')) return;
    setArquivando(id);
    try {
      await api.put(`/v1/admin/submissoes/${id}/arquivar`);
      fetchSubmissoes(activeTab);
    } catch {
      setError('Erro ao arquivar submissão');
    } finally {
      setArquivando(null);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 className={styles.listTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FaClipboardCheck /> Submissões
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Gerencie as submissões de estoque dos colaboradores
          </p>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <div className={styles.tableSection}>
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => k && setActiveTab(k)}
            className="mb-3"
          >
            {TABS.map((tab) => (
              <Tab key={tab.key} eventKey={tab.key} title={tab.label}>
                {/* Conteúdo renderizado abaixo */}
              </Tab>
            ))}
          </Tabs>

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <Table striped bordered hover responsive className={styles.table}>
                <thead>
                  <tr className={styles.tableHeader}>
                    <th className={styles.tableHeaderCell}>#</th>
                    <th className={styles.tableHeaderCell}>Lista</th>
                    <th className={styles.tableHeaderCell}>Colaborador</th>
                    <th className={styles.tableHeaderCell}>Data</th>
                    <th className={styles.tableHeaderCell}>Nº Pedidos</th>
                    <th className={styles.tableHeaderCell}>Status</th>
                    <th className={styles.tableHeaderCell}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {submissoes.map((s) => (
                    <tr key={s.id} className={styles.tableRow}>
                      <td className={styles.tableCell}>{s.id}</td>
                      <td className={`${styles.tableCell} ${styles.cellBold}`}>{s.lista.nome}</td>
                      <td className={styles.tableCell}>{s.colaborador.usuario.nome}</td>
                      <td className={styles.tableCell}>{formatDate(s.criadoEm)}</td>
                      <td className={styles.tableCell}>{s._count.pedidos}</td>
                      <td className={styles.tableCell}>
                        <Badge bg={STATUS_VARIANT[s.status as StatusSubmissao] ?? 'secondary'}>
                          {s.status}
                        </Badge>
                      </td>
                      <td className={styles.tableCell}>
                        <div className={styles.actionButtons}>
                          <Link href={`/admin/submissoes/${s.id}`}>
                            <Button size="sm" variant="outline-primary">
                              Ver
                            </Button>
                          </Link>
                          {!s.arquivada && (
                            <Button
                              size="sm"
                              variant="outline-secondary"
                              onClick={() => handleArquivar(s.id)}
                              disabled={arquivando === s.id}
                            >
                              {arquivando === s.id ? <Spinner animation="border" size="sm" /> : 'Arquivar'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {submissoes.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-4">
                        Nenhuma submissão encontrada
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
