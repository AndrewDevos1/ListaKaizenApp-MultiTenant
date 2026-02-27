'use client';

import { useState, useEffect, useCallback } from 'react';
import { Table, Alert, Spinner, Badge, Button } from 'react-bootstrap';
import Link from 'next/link';
import api from '@/lib/api';
import styles from '@/app/admin/pop/templates/POPTemplates.module.css';
import { FaClipboardCheck, FaEye } from 'react-icons/fa';

type StatusExecucao = 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';

const STATUS_VARIANT: Record<StatusExecucao, string> = {
  EM_ANDAMENTO: 'primary',
  CONCLUIDO: 'success',
  CANCELADO: 'secondary',
};

interface Execucao {
  id: number;
  status: StatusExecucao;
  criadoEm: string;
  template: { id: number; nome: string; tipo: string };
  usuario: { id: number; nome: string };
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

export default function AdminPOPExecucoesPage() {
  const [execucoes, setExecucoes] = useState<Execucao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchExecucoes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/v1/admin/pop/execucoes');
      setExecucoes(data);
    } catch {
      setError('Erro ao carregar execucoes POP');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExecucoes();
  }, [fetchExecucoes]);

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <h2 className={styles.pageTitle}>
            <FaClipboardCheck className="me-2" />
            Execucoes POP
          </h2>
          <Link href="/admin/pop/templates" passHref>
            <Button variant="outline-secondary" size="sm">
              Ver Templates
            </Button>
          </Link>
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
        ) : execucoes.length === 0 ? (
          <div className={styles.emptyState}>
            <FaClipboardCheck className={styles.emptyIcon} />
            <h3 className={styles.emptyTitle}>Nenhuma execucao registrada</h3>
            <p className={styles.emptyText}>
              As execucoes aparecerao aqui quando os colaboradores iniciarem POPs.
            </p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <Table striped bordered hover responsive className={styles.table}>
              <thead>
                <tr className={styles.tableHeader}>
                  <th className={styles.tableHeaderCell}>#</th>
                  <th className={styles.tableHeaderCell}>Template</th>
                  <th className={styles.tableHeaderCell}>Tipo</th>
                  <th className={styles.tableHeaderCell}>Colaborador</th>
                  <th className={styles.tableHeaderCell}>Data</th>
                  <th className={styles.tableHeaderCell}>Status</th>
                  <th className={styles.tableHeaderCell} style={{ width: 80 }}>
                    Ver
                  </th>
                </tr>
              </thead>
              <tbody>
                {execucoes.map((ex) => (
                  <tr key={ex.id} className={styles.tableRow}>
                    <td className={styles.tableCell}>{ex.id}</td>
                    <td className={`${styles.tableCell} fw-semibold`}>{ex.template.nome}</td>
                    <td className={styles.tableCell}>
                      <Badge bg="secondary">{ex.template.tipo}</Badge>
                    </td>
                    <td className={styles.tableCell}>{ex.usuario.nome}</td>
                    <td className={styles.tableCell}>{formatDate(ex.criadoEm)}</td>
                    <td className={styles.tableCell}>
                      <Badge bg={STATUS_VARIANT[ex.status]}>{ex.status}</Badge>
                    </td>
                    <td className={styles.tableCell}>
                      <Link href={`/collaborator/pop/execucoes/${ex.id}`} passHref>
                        <Button size="sm" variant="outline-secondary" title="Ver execucao">
                          <FaEye />
                        </Button>
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
  );
}
