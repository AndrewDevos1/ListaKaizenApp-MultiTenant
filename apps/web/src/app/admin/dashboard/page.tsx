'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Dashboard.module.css';
import { FaBoxes, FaMapMarkerAlt, FaList, FaChartBar, FaUsers, FaCog } from 'react-icons/fa';

export default function AdminDashboard() {
  const { user } = useAuth();

  const widgets = [
    {
      id: 1,
      title: 'Total de Itens',
      value: '1,245',
      icon: FaBoxes,
      color: 'widgetBlue',
      change: '+12%',
      positive: true,
    },
    {
      id: 2,
      title: 'Áreas Ativas',
      value: '8',
      icon: FaMapMarkerAlt,
      color: 'widgetGreen',
      change: '+2',
      positive: true,
    },
    {
      id: 3,
      title: 'Listas Criadas',
      value: '42',
      icon: FaList,
      color: 'widgetYellow',
      change: '+8',
      positive: true,
    },
    {
      id: 4,
      title: 'Utilizadores',
      value: '23',
      icon: FaUsers,
      color: 'widgetRed',
      change: '+3',
      positive: true,
    },
  ];

  return (
    <div className={styles.dashboardWrapper}>
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Dashboard Admin</h1>
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

                <div className={styles.widgetFooter}>
                  <span className={`${styles.widgetChange} ${widget.positive ? styles.positive : styles.negative}`}>
                    {widget.positive ? '↑' : '↓'} {widget.change}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.quickActionsSection}>
          <h2 className={styles.sectionTitle}>Ações Rápidas</h2>
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
            <button className={styles.actionButton}>Configurações</button>
          </div>
        </div>
      </div>
    </div>
  );
}
