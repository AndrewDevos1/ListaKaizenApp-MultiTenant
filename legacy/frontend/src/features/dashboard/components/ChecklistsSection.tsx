import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboardCheck, faClock } from '@fortawesome/free-solid-svg-icons';
import { ChecklistsData } from '../types';
import styles from '../GlobalDashboard.module.css';

interface ChecklistsSectionProps {
  data: ChecklistsData;
}

const ChecklistsSection: React.FC<ChecklistsSectionProps> = ({ data }) => {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>
          <FontAwesomeIcon icon={faClipboardCheck} className={styles.sectionIcon} />
          Checklists de Compras
        </h3>
      </div>

      <div className={styles.twoColumnGrid}>
        {/* Métricas */}
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
            <div className={styles.metricCard}>
              <div className={styles.metricValue} style={{ color: '#36b9cc' }}>
                {data.active_count}
              </div>
              <div className={styles.metricLabel}>Ativos</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricValue} style={{ color: '#2eb85c' }}>
                {data.completed_count}
              </div>
              <div className={styles.metricLabel}>Finalizados</div>
            </div>
          </div>

          <div className={styles.progressContainer}>
            <div className={styles.progressLabel}>
              <span>Taxa de Conclusão de Itens</span>
              <span>{data.completion_rate}%</span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={`${styles.progressFill} ${styles.blue}`}
                style={{ width: `${data.completion_rate}%` }}
              />
            </div>
          </div>

          {data.avg_completion_time_hours !== null && (
            <div className={styles.metricCard} style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <FontAwesomeIcon icon={faClock} style={{ color: '#6f42c1' }} />
                <span className={styles.metricValue} style={{ fontSize: '1.25rem' }}>
                  {data.avg_completion_time_hours}h
                </span>
              </div>
              <div className={styles.metricLabel}>Tempo Médio p/ Finalizar</div>
            </div>
          )}
        </div>

        {/* Últimos Checklists */}
        <div>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
            Últimos Checklists
          </h4>
          {data.recent_checklists.length > 0 ? (
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Status</th>
                  <th>Progresso</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_checklists.map((checklist) => (
                  <tr key={checklist.id}>
                    <td>{checklist.nome}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${checklist.status === 'ATIVO' ? styles.ativo : styles.finalizado}`}>
                        {checklist.status}
                      </span>
                    </td>
                    <td>
                      {checklist.itens_marcados}/{checklist.total_itens}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={styles.emptyState}>
              <p>Nenhum checklist encontrado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChecklistsSection;
