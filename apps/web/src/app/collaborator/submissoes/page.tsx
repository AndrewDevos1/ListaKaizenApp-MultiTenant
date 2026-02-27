'use client';

import { useState, useEffect } from 'react';
import { Table, Alert, Spinner, Badge } from 'react-bootstrap';
import Link from 'next/link';
import api from '@/lib/api';
import styles from '@/app/admin/listas/[id]/ListaDetail.module.css';
import { FaClipboardList } from 'react-icons/fa';

type StatusSubmissao = 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'PARCIAL' | 'ARQUIVADO';

interface MinhaSubmissao {
  id: number;
  status: StatusSubmissao;
  criadoEm: string;
  lista: { id: number; nome: string };
  _count: { pedidos: number };
}

const STATUS_VARIANT: Record<StatusSubmissao, string> = {
  PENDENTE: 'warning',
  APROVADO: 'success',
  REJEITADO: 'danger',
  PARCIAL: 'info',
  ARQUIVADO: 'secondary',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CollaboratorSubmissoesPage() {
  const [submissoes, setSubmissoes] = useState<MinhaSubmissao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSubmissoes = async () => {
      try {
        const { data } = await api.get('/v1/collaborator/submissoes');
        setSubmissoes(data);
      } catch {
        setError('Erro ao carregar suas submissões');
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissoes();
  }, []);

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
        <div style={{ marginBottom: '2rem' }}>
          <h1 className={styles.listTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FaClipboardList /> Minhas Submissões
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Histórico de todas as listas que você submeteu
          </p>
        </div>

        {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

        <div className={styles.tableSection}>
          {submissoes.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <FaClipboardList />
              </div>
              <p className={styles.emptyText}>Você ainda não submeteu nenhuma lista</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <Table striped bordered hover responsive className={styles.table}>
                <thead>
                  <tr className={styles.tableHeader}>
                    <th className={styles.tableHeaderCell}>#</th>
                    <th className={styles.tableHeaderCell}>Lista</th>
                    <th className={styles.tableHeaderCell}>Data</th>
                    <th className={styles.tableHeaderCell}>Nº Pedidos</th>
                    <th className={styles.tableHeaderCell}>Status</th>
                    <th className={styles.tableHeaderCell}>Detalhe</th>
                  </tr>
                </thead>
                <tbody>
                  {submissoes.map((s) => (
                    <tr key={s.id} className={styles.tableRow}>
                      <td className={styles.tableCell}>{s.id}</td>
                      <td className={`${styles.tableCell} ${styles.cellBold}`}>{s.lista.nome}</td>
                      <td className={styles.tableCell}>{formatDate(s.criadoEm)}</td>
                      <td className={styles.tableCell}>{s._count.pedidos}</td>
                      <td className={styles.tableCell}>
                        <Badge bg={STATUS_VARIANT[s.status] ?? 'secondary'}>
                          {s.status}
                        </Badge>
                      </td>
                      <td className={styles.tableCell}>
                        <Link href={`/collaborator/submissoes/${s.id}`} className="btn btn-sm btn-outline-primary">
                          Ver Detalhes
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
