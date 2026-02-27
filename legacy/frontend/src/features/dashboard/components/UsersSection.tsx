import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faTrophy, faClock } from '@fortawesome/free-solid-svg-icons';
import { UsersData } from '../types';
import styles from '../GlobalDashboard.module.css';

interface UsersSectionProps {
  data: UsersData;
}

const UsersSection: React.FC<UsersSectionProps> = ({ data }) => {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>
          <FontAwesomeIcon icon={faUsers} className={styles.sectionIcon} />
          Movimentação de Usuários
        </h3>
      </div>

      <div className={styles.twoColumnGrid}>
        {/* Usuários Mais Ativos */}
        <div>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FontAwesomeIcon icon={faTrophy} style={{ color: '#ffc107' }} />
            Top 5 Usuários Ativos
          </h4>

          {data.most_active_users.length > 0 ? (
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nome</th>
                  <th>Submissões</th>
                  <th>Restaurante</th>
                </tr>
              </thead>
              <tbody>
                {data.most_active_users.map((user, index) => (
                  <tr key={user.id}>
                    <td>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                    </td>
                    <td>{user.nome}</td>
                    <td>
                      <strong>{user.submissoes}</strong>
                    </td>
                    <td>{user.restaurante}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={styles.emptyState}>
              <p>Nenhum usuário com submissões</p>
            </div>
          )}
        </div>

        {/* Métricas de Tempo */}
        <div>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FontAwesomeIcon icon={faClock} style={{ color: '#6f42c1' }} />
            Tempo de Resposta dos Admins
          </h4>

          <div className={styles.metricCard}>
            {data.admin_avg_response_time_hours !== null ? (
              <>
                <div className={styles.metricValue} style={{ color: '#6f42c1' }}>
                  {data.admin_avg_response_time_hours}h
                </div>
                <div className={styles.metricLabel}>
                  Tempo Médio para Responder Sugestões
                </div>
              </>
            ) : (
              <>
                <div className={styles.metricValue} style={{ color: '#95a5a6' }}>
                  --
                </div>
                <div className={styles.metricLabel}>
                  Sem dados suficientes
                </div>
              </>
            )}
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <h5 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              Dica: Quanto menor o tempo, melhor a experiência do colaborador.
            </h5>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersSection;
