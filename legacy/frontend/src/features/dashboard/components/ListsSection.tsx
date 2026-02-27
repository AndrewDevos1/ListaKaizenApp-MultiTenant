import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboardList, faBolt } from '@fortawesome/free-solid-svg-icons';
import { ListsData } from '../types';
import { formatarDataHoraBrasilia } from '../../../utils/dateFormatter';
import styles from '../GlobalDashboard.module.css';

interface ListsSectionProps {
  data: ListsData;
}

const ListsSection: React.FC<ListsSectionProps> = ({ data }) => {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca';
    return formatarDataHoraBrasilia(dateStr);
  };

  return (
    <div className={styles.twoColumnGrid}>
      {/* Listas Semanais */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            <FontAwesomeIcon icon={faClipboardList} className={styles.sectionIcon} />
            Listas Semanais
          </h3>
        </div>

        {data.weekly_status.length > 0 ? (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Lista</th>
                <th>Submissões (7d)</th>
                <th>Última Submissão</th>
              </tr>
            </thead>
            <tbody>
              {data.weekly_status.map((list) => (
                <tr key={list.id}>
                  <td>{list.nome}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles.ativo}`}>
                      {list.submissoes_semana}
                    </span>
                  </td>
                  <td>{formatDate(list.ultima_submissao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={styles.emptyState}>
            <p>Nenhuma lista encontrada</p>
          </div>
        )}
      </div>

      {/* Listas Rápidas */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            <FontAwesomeIcon icon={faBolt} className={styles.sectionIcon} />
            Listas Rápidas
          </h3>
          <span className={`${styles.statusBadge} ${styles.pendente}`}>
            {data.quick_lists_pending} pendentes
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
          <div className={styles.metricCard}>
            <div className={styles.metricValue} style={{ color: '#2eb85c' }}>
              {data.quick_lists_by_priority.prevencao}
            </div>
            <div className={styles.metricLabel}>Prevenção</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricValue} style={{ color: '#ffc107' }}>
              {data.quick_lists_by_priority.precisa_comprar}
            </div>
            <div className={styles.metricLabel}>Precisa Comprar</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricValue} style={{ color: '#e55353' }}>
              {data.quick_lists_by_priority.urgente}
            </div>
            <div className={styles.metricLabel}>Urgente</div>
          </div>
        </div>

        <div className={styles.progressContainer}>
          <div className={styles.progressLabel}>
            <span>Taxa de Aprovação</span>
            <span>{data.approval_rate}%</span>
          </div>
          <div className={styles.progressBar}>
            <div
              className={`${styles.progressFill} ${styles.green}`}
              style={{ width: `${data.approval_rate}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListsSection;
