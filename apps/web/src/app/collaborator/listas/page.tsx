'use client';

import { useState, useEffect } from 'react';
import { Spinner, Alert } from 'react-bootstrap';
import Link from 'next/link';
import api from '@/lib/api';
import styles from './Listas.module.css';
import { FaClipboardList } from 'react-icons/fa';

interface MinhaLista {
  id: number;
  nome: string;
  _count: { itensRef: number };
}

export default function MinhasListasPage() {
  const [listas, setListas] = useState<MinhaLista[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMinhasListas = async () => {
      try {
        const { data } = await api.get('/v1/collaborator/minhas-listas');
        setListas(data);
      } catch {
        setError('Erro ao carregar suas listas');
      } finally {
        setLoading(false);
      }
    };
    fetchMinhasListas();
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
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Minhas Listas</h1>
          <p className={styles.pageSubtitle}>Listas atribuídas para você</p>
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        {listas.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <FaClipboardList />
            </div>
            <h3 className={styles.emptyTitle}>Nenhuma lista atribuída</h3>
            <p className={styles.emptyText}>
              Você ainda não foi atribuído a nenhuma lista. Aguarde que um administrador faça a atribuição.
            </p>
          </div>
        ) : (
          <div className={styles.listsGrid}>
            {listas.map((lista) => (
              <Link
                key={lista.id}
                href={`/collaborator/listas/${lista.id}`}
                className={styles.listCard}
              >
                <div className={styles.listHeader}>
                  <div className={styles.listIcon}>
                    <FaClipboardList />
                  </div>
                </div>

                <h3 className={styles.listName}>{lista.nome}</h3>

                <div className={styles.listMeta}>
                  <div className={styles.metaItem}>
                    <div className={styles.metaLabel}>Itens</div>
                    <div className={styles.metaValue}>{lista._count.itensRef}</div>
                  </div>
                  <div className={styles.metaItem}>
                    <div className={styles.metaLabel}>Status</div>
                    <div className={styles.metaValue} style={{ fontSize: '0.9rem' }}>Ativo</div>
                  </div>
                </div>

                <div className={styles.listActions}>
                  <button className={styles.actionButton} onClick={(e) => e.preventDefault()}>
                    Abrir
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
