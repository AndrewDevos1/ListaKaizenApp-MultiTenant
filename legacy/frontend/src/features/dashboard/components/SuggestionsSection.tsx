import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLightbulb, faCheck, faTimes, faClock } from '@fortawesome/free-solid-svg-icons';
import { SuggestionsData } from '../types';
import styles from '../GlobalDashboard.module.css';

interface SuggestionsSectionProps {
  data: SuggestionsData;
}

const SuggestionsSection: React.FC<SuggestionsSectionProps> = ({ data }) => {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>
          <FontAwesomeIcon icon={faLightbulb} className={styles.sectionIcon} />
          Sugestões de Itens
        </h3>
        {data.pending_count > 0 && (
          <span className={`${styles.statusBadge} ${styles.pendente}`}>
            {data.pending_count} pendentes
          </span>
        )}
      </div>

      <div className={styles.twoColumnGrid}>
        {/* Métricas */}
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
            <div className={styles.metricCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                <FontAwesomeIcon icon={faClock} style={{ color: '#ffc107', fontSize: '0.9rem' }} />
                <span className={styles.metricValue} style={{ color: '#ffc107' }}>
                  {data.pending_count}
                </span>
              </div>
              <div className={styles.metricLabel}>Pendentes</div>
            </div>
            <div className={styles.metricCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                <FontAwesomeIcon icon={faCheck} style={{ color: '#2eb85c', fontSize: '0.9rem' }} />
                <span className={styles.metricValue} style={{ color: '#2eb85c' }}>
                  {data.approved_count}
                </span>
              </div>
              <div className={styles.metricLabel}>Aprovadas</div>
            </div>
            <div className={styles.metricCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                <FontAwesomeIcon icon={faTimes} style={{ color: '#e55353', fontSize: '0.9rem' }} />
                <span className={styles.metricValue} style={{ color: '#e55353' }}>
                  {data.rejected_count}
                </span>
              </div>
              <div className={styles.metricLabel}>Rejeitadas</div>
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

        {/* Itens Mais Sugeridos */}
        <div>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
            Itens Mais Sugeridos
          </h4>

          {data.most_suggested_items.length > 0 ? (
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Sugestões</th>
                </tr>
              </thead>
              <tbody>
                {data.most_suggested_items.map((item, index) => (
                  <tr key={index}>
                    <td>{item.nome}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles.ativo}`}>
                        {item.count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={styles.emptyState}>
              <p>Nenhuma sugestão registrada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuggestionsSection;
