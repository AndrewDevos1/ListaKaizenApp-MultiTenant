'use client';

import { useState, useEffect } from 'react';
import { Table, Alert, Spinner, Badge, Button } from 'react-bootstrap';
import Link from 'next/link';
import api from '@/lib/api';
import styles from '@/app/admin/listas/[id]/ListaDetail.module.css';
import { FaClipboardList, FaEye } from 'react-icons/fa';

interface ChecklistSummary {
  id: number;
  status: 'ABERTO' | 'FINALIZADO';
  criadoEm: string;
  submissao: { id: number };
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

export default function ChecklistsPage() {
  const [checklists, setChecklists] = useState<ChecklistSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchChecklists = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/v1/admin/checklists');
      setChecklists(data);
    } catch {
      setError('Erro ao carregar checklists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklists();
  }, []);

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 className={styles.listTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FaClipboardList /> Checklists de Compras
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Acompanhe e execute os checklists gerados a partir das submissões
          </p>
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
                    <th className={styles.tableHeaderCell}>ID Submissão</th>
                    <th className={styles.tableHeaderCell}>Data</th>
                    <th className={styles.tableHeaderCell}>Nº Itens</th>
                    <th className={styles.tableHeaderCell}>Status</th>
                    <th className={styles.tableHeaderCell}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {checklists.map((cl) => (
                    <tr key={cl.id} className={styles.tableRow}>
                      <td className={`${styles.tableCell} ${styles.cellBold}`}>
                        <Link href={`/admin/submissoes/${cl.submissao.id}`} style={{ color: 'var(--color-primary)' }}>
                          #{cl.submissao.id}
                        </Link>
                      </td>
                      <td className={styles.tableCell}>{formatDate(cl.criadoEm)}</td>
                      <td className={styles.tableCell}>{cl._count.itens}</td>
                      <td className={styles.tableCell}>
                        <Badge bg={cl.status === 'ABERTO' ? 'primary' : 'success'}>
                          {cl.status}
                        </Badge>
                      </td>
                      <td className={styles.tableCell}>
                        <Link href={`/admin/checklists/${cl.id}`}>
                          <Button size="sm" variant="outline-primary">
                            <FaEye style={{ marginRight: '0.3rem' }} />
                            Ver
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {checklists.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-4">
                        Nenhum checklist encontrado
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
