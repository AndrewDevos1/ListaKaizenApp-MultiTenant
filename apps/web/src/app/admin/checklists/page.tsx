'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Alert, Spinner, Badge, Button, Tabs, Tab } from 'react-bootstrap';
import Link from 'next/link';
import api from '@/lib/api';
import styles from './Checklists.module.css';
import { FaTasks, FaEye } from 'react-icons/fa';

type StatusChecklist = 'ABERTO' | 'FINALIZADO';
type TabKey = 'TODOS' | StatusChecklist;

interface ChecklistSummary {
  id: number;
  status: StatusChecklist;
  criadoEm: string;
  submissao: {
    id: number;
    lista: { nome: string } | null;
  } | null;
  itens: { marcado: boolean }[];
  _count: { itens: number };
}

const STATUS_VARIANT: Record<StatusChecklist, string> = {
  ABERTO: 'primary',
  FINALIZADO: 'success',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function checklistNome(c: ChecklistSummary) {
  return c.submissao?.lista?.nome ?? `Checklist #${c.id}`;
}

export default function AdminChecklistsPage() {
  const [checklists, setChecklists] = useState<ChecklistSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('TODOS');

  const fetchChecklists = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<ChecklistSummary[]>('/v1/admin/checklists');
      setChecklists(data);
    } catch {
      setError('Erro ao carregar checklists');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChecklists();
  }, [fetchChecklists]);

  const filtered = useMemo(
    () =>
      activeTab === 'TODOS'
        ? checklists
        : checklists.filter((c) => c.status === activeTab),
    [checklists, activeTab],
  );

  const cntAberto = checklists.filter((c) => c.status === 'ABERTO').length;
  const cntFinalizado = checklists.filter((c) => c.status === 'FINALIZADO').length;

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <h2 className={styles.pageTitle}>
            <FaTasks className="me-2" />
            Checklists de Compras
          </h2>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <div className={styles.tabsWrapper}>
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k as TabKey)}
            className="mb-3"
          >
            <Tab eventKey="TODOS" title={`Todos (${checklists.length})`} />
            <Tab eventKey="ABERTO" title={`Em aberto (${cntAberto})`} />
            <Tab eventKey="FINALIZADO" title={`Finalizados (${cntFinalizado})`} />
          </Tabs>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <FaTasks className={styles.emptyIcon} />
            <h3 className={styles.emptyTitle}>Nenhum checklist encontrado</h3>
            <p className={styles.emptyText}>
              {activeTab === 'TODOS'
                ? 'Converta uma submissão aprovada em checklist para começar.'
                : `Nenhum checklist com status "${activeTab}".`}
            </p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <Table striped bordered hover responsive className={styles.table}>
              <thead>
                <tr className={styles.tableHeader}>
                  <th className={styles.tableHeaderCell}>#</th>
                  <th className={styles.tableHeaderCell}>Lista de Origem</th>
                  <th className={styles.tableHeaderCell}>Progresso</th>
                  <th className={styles.tableHeaderCell}>Status</th>
                  <th className={styles.tableHeaderCell}>Data</th>
                  <th className={styles.tableHeaderCell}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const total = c._count.itens;
                  const marcados = c.itens.filter((i) => i.marcado).length;
                  const pct = total > 0 ? Math.round((marcados / total) * 100) : 0;
                  return (
                    <tr key={c.id} className={styles.tableRow}>
                      <td className={styles.tableCell}>{c.id}</td>
                      <td className={`${styles.tableCell} fw-semibold`}>
                        {checklistNome(c)}
                      </td>
                      <td className={styles.tableCell}>
                        <div className={styles.progressWrapper}>
                          <div className={styles.progressBar}>
                            <div
                              className={styles.progressFill}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={styles.progressLabel}>
                            {marcados}/{total} ({pct}%)
                          </span>
                        </div>
                      </td>
                      <td className={styles.tableCell}>
                        <Badge bg={STATUS_VARIANT[c.status]}>{c.status}</Badge>
                      </td>
                      <td className={styles.tableCell}>{formatDate(c.criadoEm)}</td>
                      <td className={styles.tableCell}>
                        <Link href={`/admin/checklists/${c.id}`} passHref>
                          <Button size="sm" variant="outline-secondary" title="Ver detalhes">
                            <FaEye className="me-1" /> Ver
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
