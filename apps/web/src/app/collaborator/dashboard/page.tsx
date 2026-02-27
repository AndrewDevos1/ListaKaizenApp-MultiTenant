'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Dashboard.module.css';
import { FaClipboardList, FaCheckCircle, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { Lista } from 'shared';
import { Spinner } from 'react-bootstrap';

export default function CollaboratorDashboard() {
  const { user } = useAuth();
  const [listas, setListas] = useState<Lista[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await api.get<Lista[]>('/v1/listas');
        setListas(data.slice().reverse());
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Erro ao carregar listas');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const widgets = useMemo(
    () => [
      {
        id: 1,
        title: 'Listas Disponíveis',
        value: listas.length.toString(),
        icon: FaClipboardList,
        color: 'widgetBlue',
      },
      {
        id: 2,
        title: 'Concluídas',
        value: '—',
        icon: FaCheckCircle,
        color: 'widgetGreen',
      },
      {
        id: 3,
        title: 'Em Progresso',
        value: '—',
        icon: FaClock,
        color: 'widgetYellow',
      },
      {
        id: 4,
        title: 'Atenção',
        value: '—',
        icon: FaExclamationTriangle,
        color: 'widgetCyan',
      },
    ],
    [listas.length],
  );

  return (
    <div className={styles.dashboardWrapper}>
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Meu Dashboard</h1>
            <p className={styles.pageSubtitle}>Bem-vindo, {user?.nome}!</p>
          </div>
        </div>

        <div className={styles.widgetsGrid}>
          {widgets.map((widget) => {
            const Icon = widget.icon;
            return (
              <div key={widget.id} className={`${styles.widgetCard} ${styles[widget.color]}`}>
                <div className={styles.widgetHeader}>
                  <div className={styles.widgetIcon}>
                    <Icon />
                  </div>
                </div>

                <h3 className={styles.widgetTitle}>{widget.title}</h3>
                <div className={styles.widgetValue}>{widget.value}</div>
              </div>
            );
          })}
        </div>

        <div className={styles.quickLinksSection}>
          <h2 className={styles.sectionTitle}>Links Rápidos</h2>
          <div className={styles.linksGrid}>
            <Link href="/collaborator/listas" className={styles.linkButton}>
              Ver Minhas Listas
            </Link>
            <button className={styles.linkButton}>Minhas Atividades</button>
            <button className={styles.linkButton}>Preferências</button>
          </div>
        </div>

        <div className={styles.listsPreviewSection}>
          <h2 className={styles.sectionTitle}>Listas Recentes</h2>
          {error && <div className={styles.errorBox}>{error}</div>}
          {loading ? (
            <div className={styles.loadingBox}>
              <Spinner animation="border" size="sm" className="me-2" />
              Carregando...
            </div>
          ) : (
            <div className={styles.listsList}>
              {listas.slice(0, 3).map((lista) => (
                <Link key={lista.id} href={`/collaborator/listas/${lista.id}`} className={styles.listCard}>
                  <h3 className={styles.listCardTitle}>{lista.nome}</h3>
                  <p className={styles.listCardMeta}>ID #{lista.id}</p>
                </Link>
              ))}
              {listas.length === 0 && <p className={styles.listCardMeta}>Nenhuma lista disponível</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
