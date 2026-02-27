import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuilding,
  faUsers,
  faUserClock,
  faClipboardList,
  faBox,
  faShoppingCart,
  faFileInvoiceDollar,
  faCheckCircle
} from '@fortawesome/free-solid-svg-icons';
import { DashboardSummary } from '../types';
import styles from '../GlobalDashboard.module.css';

interface SummaryCardsProps {
  summary: DashboardSummary;
}

interface CardConfig {
  key: keyof DashboardSummary | 'users_detail';
  title: string;
  icon: any;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange' | 'cyan' | 'gray';
  getValue: (summary: DashboardSummary) => number | string;
  getSubtext?: (summary: DashboardSummary) => string;
}

const cards: CardConfig[] = [
  {
    key: 'total_restaurantes',
    title: 'Restaurantes',
    icon: faBuilding,
    color: 'blue',
    getValue: (s) => s.total_restaurantes,
    getSubtext: () => 'Ativos no sistema'
  },
  {
    key: 'total_users',
    title: 'Usuários',
    icon: faUsers,
    color: 'green',
    getValue: (s) => s.total_users,
    getSubtext: (s) => `${s.users_by_role.admin} admins, ${s.users_by_role.collaborator} colab.`
  },
  {
    key: 'pending_approvals',
    title: 'Aguardando',
    icon: faUserClock,
    color: 'orange',
    getValue: (s) => s.pending_approvals,
    getSubtext: () => 'Pendentes de aprovação'
  },
  {
    key: 'total_listas',
    title: 'Listas',
    icon: faClipboardList,
    color: 'cyan',
    getValue: (s) => s.total_listas,
    getSubtext: () => 'Total ativas'
  },
  {
    key: 'total_itens',
    title: 'Itens',
    icon: faBox,
    color: 'purple',
    getValue: (s) => s.total_itens,
    getSubtext: () => 'No catálogo global'
  },
  {
    key: 'submissoes_hoje',
    title: 'Submissões Hoje',
    icon: faShoppingCart,
    color: 'red',
    getValue: (s) => s.submissoes_hoje,
    getSubtext: (s) => `${s.total_submissoes} total`
  },
  {
    key: 'pending_cotacoes',
    title: 'Cotações Pend.',
    icon: faFileInvoiceDollar,
    color: 'yellow',
    getValue: (s) => s.pending_cotacoes,
    getSubtext: () => 'Aguardando conclusão'
  },
  {
    key: 'completed_cotacoes',
    title: 'Cotações OK',
    icon: faCheckCircle,
    color: 'green',
    getValue: (s) => s.completed_cotacoes,
    getSubtext: () => 'Concluídas'
  }
];

const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
  if (!summary) {
    return null;
  }

  return (
    <div className={styles.summaryGrid}>
      {cards.map((card) => (
        <div key={card.key} className={`${styles.statCard} ${styles[card.color]}`}>
          <div className={styles.statCardHeader}>
            <span className={styles.statCardTitle}>{card.title}</span>
            <div className={`${styles.statCardIcon} ${styles[card.color]}`}>
              <FontAwesomeIcon icon={card.icon} />
            </div>
          </div>
          <div className={styles.statCardValue}>{card.getValue(summary)}</div>
          {card.getSubtext && (
            <div className={styles.statCardSubtext}>{card.getSubtext(summary)}</div>
          )}
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;
