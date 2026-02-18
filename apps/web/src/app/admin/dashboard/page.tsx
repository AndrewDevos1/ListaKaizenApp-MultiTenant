'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { Area, Item, Lista } from 'shared';
import styles from './Dashboard.module.css';
import { FaBoxes, FaMapMarkerAlt, FaList, FaChartBar, FaUsers, FaCog } from 'react-icons/fa';
import { Spinner } from 'react-bootstrap';

export default function AdminDashboard() {
  const { user } = useAuth();

  return (
    <div className={styles.dashboardWrapper}>
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Dashboard Admin</h1>
            <p className={styles.pageSubtitle}>Bem-vindo, {user?.nome}!</p>
          </div>
        </div>

        {/* Widgets */}
        <WidgetsPanel />

        <ListsPanel />
      </div>
    </div>
  );
}

function WidgetsPanel() {
  const [items, setItems] = useState<Item[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [listas, setListas] = useState<Lista[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [itemsRes, areasRes, listasRes] = await Promise.all([
          api.get<Item[]>('/v1/items'),
          api.get<Area[]>('/v1/areas'),
          api.get<Lista[]>('/v1/listas'),
        ]);
        setItems(itemsRes.data);
        setAreas(areasRes.data);
        setListas(listasRes.data);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Erro ao carregar dados do dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const widgets = useMemo(
    () => [
      {
        id: 'items',
        title: 'Itens',
        value: items.length,
        icon: FaBoxes,
        color: 'widgetBlue',
        link: '/admin/items',
      },
      {
        id: 'areas',
        title: 'Áreas',
        value: areas.length,
        icon: FaMapMarkerAlt,
        color: 'widgetGreen',
        link: '/admin/areas',
      },
      {
        id: 'listas',
        title: 'Listas',
        value: listas.length,
        icon: FaList,
        color: 'widgetYellow',
        link: '/admin/listas',
      },
      {
        id: 'usuarios',
        title: 'Usuários',
        value: '—',
        icon: FaUsers,
        color: 'widgetRed',
        link: '#',
      },
    ],
    [items.length, areas.length, listas.length],
  );

  if (loading) {
    return (
      <div className={styles.loadingBox}>
        <Spinner animation="border" size="sm" className="me-2" />
        Carregando...
      </div>
    );
  }

  return (
    <>
      {error && <div className={styles.errorBox}>{error}</div>}
      <div className={styles.widgetsGrid}>
        {widgets.map((widget) => {
          const Icon = widget.icon;
          return (
            <Link href={widget.link} key={widget.id} className={styles.widgetLinkCard}>
              <div className={`${styles.widgetCard} ${styles[widget.color]}`}>
                <div className={styles.widgetHeader}>
                  <div className={styles.widgetIcon}>
                    <Icon />
                  </div>
                  <div>
                    <div className={styles.widgetLabel}>{widget.title}</div>
                    <div className={styles.widgetValue}>{widget.value}</div>
                  </div>
                </div>
                <div className={styles.widgetFooter}>
                  <span>Ver detalhes</span>
                  <FaChartBar />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className={styles.quickActionsSection}>
        <h2 className={styles.sectionTitle}>Ações rápidas</h2>
        <div className={styles.actionsGrid}>
          <Link href="/admin/items" className={styles.actionButton}>
            Gerenciar Itens
          </Link>
          <Link href="/admin/areas" className={styles.actionButton}>
            Gerenciar Áreas
          </Link>
          <Link href="/admin/listas" className={styles.actionButton}>
            Ver Listas
          </Link>
          <button className={styles.actionButton} type="button" disabled>
            Configurações (em breve)
          </button>
        </div>
      </div>
    </>
  );
}

function ListsPanel() {
  const [listas, setListas] = useState<Lista[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data } = await api.get<Lista[]>('/v1/listas');
        setListas(data.slice().reverse().slice(0, 5));
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Erro ao carregar listas recentes');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className={styles.cardBox}>
        <div className={styles.cardHeader}>
          <h2 className={styles.sectionTitle}>Listas recentes</h2>
        </div>
        <div className={styles.cardBodyCentered}>
          <Spinner animation="border" size="sm" className="me-2" />
          Carregando...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.cardBox}>
      <div className={styles.cardHeader}>
        <h2 className={styles.sectionTitle}>Listas recentes</h2>
        <Link href="/admin/listas" className={styles.cardLink}>
          Ver todas
        </Link>
      </div>
      {error && <div className={styles.errorBox}>{error}</div>}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nome</th>
              <th>ID</th>
            </tr>
          </thead>
          <tbody>
            {listas.map((lista) => (
              <tr key={lista.id}>
                <td>{lista.nome}</td>
                <td>#{lista.id}</td>
              </tr>
            ))}
            {listas.length === 0 && (
              <tr>
                <td colSpan={2} className={styles.emptyCell}>
                  Nenhuma lista criada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
