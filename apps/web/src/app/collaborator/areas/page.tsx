'use client';

import { useState, useEffect } from 'react';
import { Alert, Spinner } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import styles from './Areas.module.css';
import { FaMapMarkerAlt, FaChevronRight } from 'react-icons/fa';

interface AreaStatus {
  id: number;
  nome: string;
  criadoEm: string;
  _count: { listas: number };
  has_pending_items: boolean;
}

export default function MinhasAreasPage() {
  const router = useRouter();
  const [areas, setAreas] = useState<AreaStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get('/v1/collaborator/minhas-areas-status');
        setAreas(data);
      } catch {
        setError('Erro ao carregar áreas');
      } finally {
        setLoading(false);
      }
    };
    fetch();
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
          <h2 className={styles.pageTitle}>Minhas Áreas</h2>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {areas.length === 0 ? (
          <div className={styles.emptyState}>
            <FaMapMarkerAlt className={styles.emptyIcon} />
            <h3 className={styles.emptyTitle}>Nenhuma área atribuída</h3>
            <p className={styles.emptyText}>
              Aguarde o administrador vincular você a uma área.
            </p>
          </div>
        ) : (
          <div className={styles.areasGrid}>
            {areas.map((area) => (
              <div
                key={area.id}
                className={`${styles.areaCard} ${area.has_pending_items ? styles.cardPendente : styles.cardOk}`}
                onClick={() => router.push(`/collaborator/areas/${area.id}`)}
              >
                <div className={styles.cardIcon}>
                  <FaMapMarkerAlt />
                </div>
                <div className={styles.cardContent}>
                  <h3 className={styles.cardNome}>{area.nome}</h3>
                  <p className={styles.cardMeta}>
                    {area._count.listas} lista{area._count.listas !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className={styles.cardStatus}>
                  <span
                    className={`${styles.statusBadge} ${
                      area.has_pending_items ? styles.statusPendente : styles.statusOk
                    }`}
                  >
                    {area.has_pending_items ? 'Pendente' : 'Ok'}
                  </span>
                  <FaChevronRight className={styles.chevron} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
