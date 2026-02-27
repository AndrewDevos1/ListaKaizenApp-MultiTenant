import React from 'react';
import { RecentActivity } from '../types';
import { formatarDataHoraBrasilia, parseISODate } from '../../../utils/dateFormatter';
import styles from '../GlobalDashboard.module.css';

interface ActivityTimelineProps {
  activities: RecentActivity[];
}

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ activities }) => {
  const formatTimestamp = (timestamp: string) => {
    const date = parseISODate(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} min atrás`;
    } else if (diffHours < 24) {
      return `${diffHours}h atrás`;
    } else if (diffDays < 7) {
      return `${diffDays} dia${diffDays > 1 ? 's' : ''} atrás`;
    } else {
      return formatarDataHoraBrasilia(timestamp);
    }
  };

  const getTypeClass = (type: string) => {
    const typeMap: Record<string, string> = {
      submissao: styles.submissao,
      cotacao: styles.cotacao,
      usuario: styles.usuario,
      checklist: styles.checklist,
      lista_rapida: styles.listaRapida,
      sugestao: styles.sugestao
    };
    return typeMap[type] || '';
  };

  if (activities.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>📭</div>
        <p>Nenhuma atividade recente</p>
      </div>
    );
  }

  return (
    <div className={styles.timeline}>
      {activities.map((activity, index) => (
        <div
          key={`${activity.type}-${activity.id}-${index}`}
          className={`${styles.timelineItem} ${getTypeClass(activity.type)}`}
        >
          <div className={styles.timelineDescription}>{activity.description}</div>
          <div>
            <span className={styles.timelineTime}>
              {activity.timestamp ? formatTimestamp(activity.timestamp) : 'Data não disponível'}
            </span>
            {activity.restaurante && (
              <span className={styles.timelineRestaurante}>{activity.restaurante}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityTimeline;
