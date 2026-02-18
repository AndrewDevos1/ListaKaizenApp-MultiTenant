'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import styles from './Dashboard.module.css';
import { FaClipboardList, FaCheckCircle, FaClock, FaExclamationTriangle } from 'react-icons/fa';

export default function CollaboratorDashboard() {
  const { user } = useAuth();

  const widgets = [
    {
      id: 1,
      title: 'Listas Atribuídas',
      value: '5',
      icon: FaClipboardList,
      color: 'widgetBlue',
    },
    {
      id: 2,
      title: 'Concluídas',
      value: '3',
      icon: FaCheckCircle,
      color: 'widgetGreen',
    },
    {
      id: 3,
      title: 'Em Progresso',
      value: '2',
      icon: FaClock,
      color: 'widgetYellow',
    },
    {
      id: 4,
      title: 'Atenção',
      value: '1',
      icon: FaExclamationTriangle,
      color: 'widgetCyan',
    },
  ];

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
          <div className={styles.listsList}>
            <Link href="/collaborator/listas/1" className={styles.listCard}>
              <h3 className={styles.listCardTitle}>Lista de Bebidas</h3>
              <p className={styles.listCardMeta}>3 itens • Atualizado hoje</p>
            </Link>
            <Link href="/collaborator/listas/2" className={styles.listCard}>
              <h3 className={styles.listCardTitle}>Suprimentos de Cozinha</h3>
              <p className={styles.listCardMeta}>7 itens • Atualizado ontem</p>
            </Link>
            <Link href="/collaborator/listas/3" className={styles.listCard}>
              <h3 className={styles.listCardTitle}>Limpeza e Manutenção</h3>
              <p className={styles.listCardMeta}>5 itens • Atualizado há 2 dias</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
