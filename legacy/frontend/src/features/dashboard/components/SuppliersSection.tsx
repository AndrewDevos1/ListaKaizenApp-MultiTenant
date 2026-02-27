import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTruck, faFileInvoiceDollar } from '@fortawesome/free-solid-svg-icons';
import { SuppliersData } from '../types';
import styles from '../GlobalDashboard.module.css';

interface SuppliersSectionProps {
  data: SuppliersData;
}

const SuppliersSection: React.FC<SuppliersSectionProps> = ({ data }) => {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>
          <FontAwesomeIcon icon={faTruck} className={styles.sectionIcon} />
          Fornecedores e Cotações
        </h3>
      </div>

      <div className={styles.twoColumnGrid}>
        {/* Fornecedores por Restaurante */}
        <div>
          <div className={styles.metricCard} style={{ marginBottom: '1rem' }}>
            <div className={styles.metricValue} style={{ color: '#667eea' }}>
              {data.total_fornecedores}
            </div>
            <div className={styles.metricLabel}>Total de Fornecedores</div>
          </div>

          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
            Por Restaurante
          </h4>

          {data.by_restaurant.length > 0 ? (
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Restaurante</th>
                  <th>Fornecedores</th>
                </tr>
              </thead>
              <tbody>
                {data.by_restaurant.map((item) => (
                  <tr key={item.restaurante_id}>
                    <td>{item.restaurante}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles.ativo}`}>
                        {item.total_fornecedores}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={styles.emptyState}>
              <p>Nenhum fornecedor cadastrado</p>
            </div>
          )}
        </div>

        {/* Cotações */}
        <div>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FontAwesomeIcon icon={faFileInvoiceDollar} style={{ color: '#6f42c1' }} />
            Status de Cotações
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
            <div className={styles.metricCard}>
              <div className={styles.metricValue} style={{ color: '#ffc107' }}>
                {data.quotation_status.pendente}
              </div>
              <div className={styles.metricLabel}>Pendentes</div>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricValue} style={{ color: '#2eb85c' }}>
                {data.quotation_status.concluida}
              </div>
              <div className={styles.metricLabel}>Concluídas</div>
            </div>
          </div>

          {data.avg_quotation_value !== null && (
            <div className={styles.metricCard}>
              <div className={styles.metricValue} style={{ color: '#6f42c1' }}>
                R$ {data.avg_quotation_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className={styles.metricLabel}>Valor Médio por Item</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuppliersSection;
