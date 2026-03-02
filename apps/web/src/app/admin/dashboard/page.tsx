'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { Area, Item, Lista } from 'shared';
import styles from './Dashboard.module.css';
import {
  FaBoxes, FaMapMarkerAlt, FaList, FaUsers,
  FaClipboardCheck, FaShoppingCart, FaBolt, FaLightbulb, FaTasks,
  FaEye, FaArrowRight,
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
  checklists: number;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [itemsRes, areasRes, listasRes, listasRapidasRes, usuariosRes, submissoesRes, checklistsRes] = await Promise.all([
          api.get<Item[]>('/v1/items'),
          api.get<Area[]>('/v1/areas'),
          api.get<Lista[]>('/v1/listas'),
          api.get<any[]>('/v1/admin/listas-rapidas'),
          api.get<any[]>('/v1/admin/usuarios'),
          api.get<any[]>('/v1/admin/submissoes'),
          api.get<any[]>('/v1/admin/checklists'),
        ]);
        setData({
          items: itemsRes.data.length,
          areas: areasRes.data.length,
          listas: listasRes.data,
          listasRapidas: listasRapidasRes.data.length,
          usuarios: usuariosRes.data.length,
          submissoes: submissoesRes.data.length,
          checklists: checklistsRes.data.length,
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
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>Bem-vindo, {user?.nome}!</p>
        </div>
        <div className={styles.headerActions}>
          <PushNotificationButton />
          <InstallAppButton />
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingBox}>
          <Spinner animation="border" size="sm" />
          Carregando...
        </div>
      ) : error ? (
        <div className={styles.errorBox}>{error}</div>
      ) : data ? (
        <div className={styles.layout}>
          <aside className={styles.leftCol}>
            <QuickAccessCard />
            <MiniCounters data={data} />
          </aside>

          <main className={styles.centerCol}>
            <RecentListsCard listas={data.listas} />
          </main>

          <aside className={styles.rightCol}>
            <SummaryCard data={data} />
          </aside>
        </div>
      ) : null}
    </div>
  );
}

// ─── Quick Access ──────────────────────────────────────────────────────────────

const MODULES = [
  { href: '/admin/listas',         icon: FaShoppingCart,   label: 'Listas de Compras',    desc: 'Gerenciar listas' },
  { href: '/admin/listas-rapidas', icon: FaBolt,           label: 'Listas Rápidas',       desc: 'Acesso direto' },
  { href: '/admin/submissoes',     icon: FaClipboardCheck, label: 'Submissões',           desc: 'Revisar envios' },
  { href: '/admin/checklists',     icon: FaTasks,          label: 'Checklist de Compras', desc: 'Acompanhar checklists' },
  { href: '/admin/sugestoes',      icon: FaLightbulb,      label: 'Sugestões',            desc: 'Ver sugestões' },
];

function QuickAccessCard() {
  return (
    <div className={styles.quickCard}>
      <h3 className={styles.cardSectionLabel}>Acesso Rápido</h3>
      <div className={styles.quickList}>
        {MODULES.map((m) => {
          const Icon = m.icon;
          return (
            <Link key={m.href} href={m.href} className={styles.quickItem}>
              <div className={styles.quickItemIcon}>
                <Icon />
              </div>
              <div className={styles.quickItemText}>
                <span className={styles.quickItemLabel}>{m.label}</span>
                <span className={styles.quickItemDesc}>{m.desc}</span>
              </div>
              <FaArrowRight className={styles.quickItemArrow} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Mini Counters ─────────────────────────────────────────────────────────────

function MiniCounters({ data }: { data: DashboardData }) {
  const rows = [
    { label: 'Itens cadastrados', value: data.items,    href: '/admin/items',              icon: FaBoxes },
    { label: 'Áreas',             value: data.areas,    href: '/admin/areas',              icon: FaMapMarkerAlt },
    { label: 'Usuários',          value: data.usuarios, href: '/admin/gerenciar-usuarios', icon: FaUsers },
    { label: 'Listas ativas',     value: data.listas.length, href: '/admin/listas',        icon: FaList },
  ];

  return (
    <div className={styles.countersCard}>
      {rows.map((row) => {
        const Icon = row.icon;
        return (
          <Link key={row.href} href={row.href} className={styles.counterRow}>
            <div className={styles.counterIcon}><Icon /></div>
            <span className={styles.counterLabel}>{row.label}</span>
            <span className={styles.counterValue}>{row.value}</span>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Recent Lists ──────────────────────────────────────────────────────────────

function RecentListsCard({ listas }: { listas: Lista[] }) {
  const recentes = useMemo(() => listas.slice().reverse().slice(0, 10), [listas]);

  return (
    <div className={styles.mainCard}>
      <div className={styles.mainCardHeader}>
        <div className={styles.mainCardTitle}>
          <FaList />
          <span>Listas Recentes</span>
          <span className={styles.mainCardBadge}>{listas.length} total</span>
        </div>
        <Link href="/admin/listas" className={styles.mainCardLink}>
          Ver todas <FaArrowRight />
        </Link>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {recentes.map((lista) => (
              <tr key={lista.id}>
                <td className={styles.tdId}>#{lista.id}</td>
                <td>
                  <Link href={`/admin/listas/${lista.id}`} className={styles.tableLink}>
                    {lista.nome}
                  </Link>
                </td>
                <td className={styles.tdActions}>
                  <Link href={`/admin/listas/${lista.id}`} className={styles.actionBtn} title="Ver detalhes">
                    <FaEye />
                  </Link>
                </td>
              </tr>
            ))}
            {recentes.length === 0 && (
              <tr>
                <td colSpan={3} className={styles.emptyCell}>
                  Nenhuma lista criada ainda
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Summary ───────────────────────────────────────────────────────────────────

function SummaryCard({ data }: { data: DashboardData }) {
  const stats = [
    { label: 'Listas de Compras', value: data.listas.length, href: '/admin/listas',         color: 'blue' },
    { label: 'Listas Rápidas',    value: data.listasRapidas, href: '/admin/listas-rapidas',  color: 'purple' },
    { label: 'Submissões',        value: data.submissoes,    href: '/admin/submissoes',       color: 'orange' },
    { label: 'Checklists',        value: data.checklists,    href: '/admin/checklists',       color: 'teal' },
  ];

  return (
    <div className={styles.summaryCard}>
      <h3 className={styles.cardSectionLabel}>Resumo</h3>
      <div className={styles.summaryList}>
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className={`${styles.summaryRow} ${styles[`summaryRow_${s.color}`]}`}>
            <span className={styles.summaryLabel}>{s.label}</span>
            <span className={styles.summaryValue}>{s.value}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
