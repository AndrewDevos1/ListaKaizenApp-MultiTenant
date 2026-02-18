'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Alert, Spinner, Table } from 'react-bootstrap';
import api from '@/lib/api';
import { Item } from 'shared';
import styles from '../../admin/listas/[id]/ListaDetail.module.css';

interface ListaDetail {
  id: number;
  nome: string;
  itensRef: Array<{
    id: number;
    quantidadeMinima: number;
    quantidadeAtual: number;
    item: Item;
  }>;
}

export default function CollaboratorListaDetailPage() {
  const params = useParams();
  const listaId = params.id as string;

  const [lista, setLista] = useState<ListaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLista = async () => {
      try {
        const { data } = await api.get(`/v1/listas/${listaId}`);
        setLista(data);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Erro ao carregar lista');
      } finally {
        setLoading(false);
      }
    };
    fetchLista();
  }, [listaId]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  if (!lista) {
    return <Alert variant="danger">Lista não encontrada</Alert>;
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <Link href="/collaborator/listas" className={styles.backButton}>
          ← Voltar para Minhas Listas
        </Link>

        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <h1 className={styles.listTitle}>{lista.nome}</h1>
            <div className={styles.listMeta}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Itens:</span>
                {lista.itensRef.length}
              </div>
            </div>
          </div>
        </div>

        {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

        <div className={styles.tableSection}>
          <h2 className={styles.sectionTitle}>Itens da Lista</h2>
          <div className={styles.tableWrapper}>
            <Table striped bordered hover responsive className={styles.table}>
              <thead>
                <tr className={styles.tableHeader}>
                  <th className={styles.tableHeaderCell}>Item</th>
                  <th className={styles.tableHeaderCell}>Unidade</th>
                  <th className={styles.tableHeaderCell}>Qtd Min</th>
                  <th className={styles.tableHeaderCell}>Qtd Atual</th>
                </tr>
              </thead>
              <tbody>
                {lista.itensRef.map((ir) => (
                  <tr key={ir.id} className={styles.tableRow}>
                    <td className={styles.tableCell}>{ir.item.nome}</td>
                    <td className={styles.tableCell}>{ir.item.unidadeMedida}</td>
                    <td className={styles.tableCell}>{ir.quantidadeMinima}</td>
                    <td className={styles.tableCell}>{ir.quantidadeAtual}</td>
                  </tr>
                ))}
                {lista.itensRef.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-muted">
                      Nenhum item na lista
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
