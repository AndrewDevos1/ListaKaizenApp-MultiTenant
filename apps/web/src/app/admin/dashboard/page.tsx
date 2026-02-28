'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { Area, Item, Lista } from 'shared';
import styles from './Dashboard.module.css';
import {
  FaBoxes, FaMapMarkerAlt, FaList, FaChartBar, FaUsers,
  FaClipboardCheck, FaShoppingCart, FaUsersCog, FaBolt, FaLightbulb,
} from 'react-icons/fa';
import { Spinner } from 'react-bootstrap';
import InstallAppButton from '@/components/InstallAppButton';
import PushNotificationButton from '@/components/PushNotificationButton';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface DashboardData {
  items: number;
  areas: number;
  listas: Lista[];
  listasRapidas: number;
  usuarios: number;
  submissoes: number;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Uma única chamada paralela para todos os dados — sem duplicatas
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [itemsRes, areasRes, listasRes, listasRapidasRes, usuariosRes, submissoesRes] = await Promise.all([
          api.get<Item[]>('/v1/items'),
          api.get<Area[]>('/v1/areas'),
          api.get<Lista[]>('/v1/listas'),
          api.get<any[]>('/v1/admin/listas-rapidas'),
          api.get<any[]>('/v1/admin/usuarios'),
          api.get<any[]>('/v1/admin/submissoes'),
        ]);
        setData({
          items: itemsRes.data.length,
          areas: areasRes.data.length,
          listas: listasRes.data,
          listasRapidas: listasRapidasRes.data.length,
          usuarios: usuariosRes.data.length,
          submissoes: submissoesRes.data.length,
        });
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Erro ao carregar dados do dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className={styles.dashboardWrapper}>
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Dashboard Admin</h1>
            <p className={styles.pageSubtitle}>Bem-vindo, {user?.nome}!</p>
          </div>
          <div className="d-flex align-items-center gap-2">
            <PushNotificationButton />
            <InstallAppButton />
          </div>
        </div>

        {loading ? (
          <div className={styles.loadingBox}>
            <Spinner animation="border" size="sm" className="me-2" />
            Carregando...
          </div>
        ) : error ? (
          <div className={styles.errorBox}>{error}</div>
        ) : data ? (
          <>
            <WidgetsPanel data={data} />
            <QuickActions />
            <ListsPanel listas={data.listas} />
          </>
        ) : null}
      </div>
    </div>
  );
}

// ─── Widgets ──────────────────────────────────────────────────────────────────

function WidgetsPanel({ data }: { data: DashboardData }) {
  const widgets = useMemo(
    () => [
      { id: 'itens',         title: 'Itens',          value: data.items,            icon: FaBoxes,          color: 'widgetBlue',   link: '/admin/items' },
      { id: 'areas',         title: 'Áreas',           value: data.areas,            icon: FaMapMarkerAlt,   color: 'widgetGreen',  link: '/admin/areas' },
      { id: 'listas',        title: 'Listas',          value: data.listas.length,    icon: FaList,           color: 'widgetYellow', link: '/admin/listas' },
      { id: 'listas-rapidas', title: 'Listas Rápidas', value: data.listasRapidas,    icon: FaBolt,           color: 'widgetPurple', link: '/admin/listas-rapidas' },
      { id: 'submissoes',    title: 'Submissões',      value: data.submissoes,       icon: FaClipboardCheck, color: 'widgetOrange', link: '/admin/submissoes' },
      { id: 'usuarios',      title: 'Usuários',        value: data.usuarios,         icon: FaUsers,          color: 'widgetRed',    link: '/admin/gerenciar-usuarios' },
    ],
    [data],
  );

  return (
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
  );
}

// ─── Quick Actions ────────────────────────────────────────────────────────────

function QuickActions() {
  return (
    <div className={styles.quickActionsSection}>
      <h2 className={styles.sectionTitle}>Ações rápidas</h2>
      <div className={styles.actionsGrid}>
        <Link href="/admin/listas" className={styles.actionButton}>
          <FaShoppingCart className={styles.actionIcon} /> Listas de Compras
        </Link>
        <Link href="/admin/listas-rapidas" className={styles.actionButton}>
          <FaBolt className={styles.actionIcon} /> Listas Rápidas
        </Link>
        <Link href="/admin/submissoes" className={styles.actionButton}>
          <FaClipboardCheck className={styles.actionIcon} /> Submissões
        </Link>
        <Link href="/admin/areas" className={styles.actionButton}>
          <FaMapMarkerAlt className={styles.actionIcon} /> Áreas
        </Link>
        <Link href="/admin/items" className={styles.actionButton}>
          <FaBoxes className={styles.actionIcon} /> Itens
        </Link>
        <Link href="/admin/gerenciar-usuarios" className={styles.actionButton}>
          <FaUsersCog className={styles.actionIcon} /> Usuários
        </Link>
        <Link href="/admin/sugestoes" className={styles.actionButton}>
          <FaLightbulb className={styles.actionIcon} /> Sugestões
        </Link>
      </div>
    </div>
  );
}

// ─── Lists Panel ──────────────────────────────────────────────────────────────

function ListsPanel({ listas }: { listas: Lista[] }) {
  // Reutiliza os dados já carregados — sem segunda chamada de API
  const recentes = useMemo(
    () => listas.slice().reverse().slice(0, 5),
    [listas],
  );

  return (
    <div className={styles.cardBox}>
      <div className={styles.cardHeader}>
        <h2 className={styles.sectionTitle}>Listas recentes</h2>
        <Link href="/admin/listas" className={styles.cardLink}>
          Ver todas
        </Link>
      </div>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nome</th>
              <th>ID</th>
            </tr>
          </thead>
          <tbody>
            {recentes.map((lista) => (
              <tr key={lista.id}>
                <td>
                  <Link href={`/admin/listas/${lista.id}`} className={styles.tableLink}>
                    {lista.nome}
                  </Link>
                </td>
                <td>#{lista.id}</td>
              </tr>
            ))}
            {recentes.length === 0 && (
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
