'use client';

import { useState, useEffect, useCallback } from 'react';
import { Alert, Spinner, Badge, Button } from 'react-bootstrap';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import styles from './POPColaborador.module.css';
import { FaClipboard, FaPlay, FaHistory } from 'react-icons/fa';

type TipoPOP = 'ABERTURA' | 'FECHAMENTO' | 'LIMPEZA' | 'OPERACIONAL' | 'PERSONALIZADO';

const TIPO_VARIANT: Record<TipoPOP, string> = {
  ABERTURA: 'primary',
  FECHAMENTO: 'secondary',
  LIMPEZA: 'info',
  OPERACIONAL: 'warning',
  PERSONALIZADO: 'danger',
};

interface POPTemplate {
  id: number;
  nome: string;
  tipo: TipoPOP;
  descricao: string | null;
  _count?: { execucoes: number };
}

export default function CollaboratorPOPPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<POPTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [iniciandoId, setIniciandoId] = useState<number | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/v1/collaborator/pop/templates');
      setTemplates(data);
    } catch {
      setError('Erro ao carregar templates POP');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleIniciar = async (templateId: number) => {
    setIniciandoId(templateId);
    setError('');
    try {
      const { data } = await api.post('/v1/collaborator/pop/execucoes', { templateId });
      router.push(`/collaborator/pop/execucoes/${data.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao iniciar POP');
      setIniciandoId(null);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <h2 className={styles.pageTitle}>
            <FaClipboard className="me-2" />
            Templates POP
          </h2>
          <Link href="/collaborator/pop/execucoes" passHref>
            <Button variant="outline-secondary">
              <FaHistory className="me-1" /> Minhas Execucoes
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
        ) : templates.length === 0 ? (
          <div className={styles.emptyState}>
            <FaClipboard className={styles.emptyIcon} />
            <h3 className={styles.emptyTitle}>Nenhum template disponivel</h3>
            <p className={styles.emptyText}>
              Os templates POP do seu restaurante aparecerao aqui quando forem criados pelo administrador.
            </p>
          </div>
        ) : (
          <div className={styles.cardsGrid}>
            {templates.map((t) => (
              <div key={t.id} className={styles.templateCard}>
                <h3 className={styles.cardTitle}>{t.nome}</h3>
                <div className={styles.cardMeta}>
                  <Badge bg={TIPO_VARIANT[t.tipo]}>{t.tipo}</Badge>
                  {t._count && (
                    <span className={styles.cardText}>
                      {t._count.execucoes} execuc{t._count.execucoes !== 1 ? 'oes' : 'ao'}
                    </span>
                  )}
                </div>
                {t.descricao && <p className={styles.cardText}>{t.descricao}</p>}
                <div className={styles.cardActions}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleIniciar(t.id)}
                    disabled={iniciandoId === t.id}
                  >
                    {iniciandoId === t.id ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      <>
                        <FaPlay className="me-1" /> Iniciar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
