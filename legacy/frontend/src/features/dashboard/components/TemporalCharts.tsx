import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { TemporalData } from '../types';
import styles from '../GlobalDashboard.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TemporalChartsProps {
  temporal: TemporalData;
}

const TemporalCharts: React.FC<TemporalChartsProps> = ({ temporal }) => {
  // Opções comuns
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    }
  };

  // Submissões por Dia (Line Chart)
  const submissionsPerDayData = {
    labels: temporal.submissions_per_day.labels,
    datasets: [
      {
        label: 'Submissões',
        data: temporal.submissions_per_day.data,
        fill: true,
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderColor: '#667eea',
        borderWidth: 2,
        tension: 0.4,
        pointBackgroundColor: '#667eea',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 3
      }
    ]
  };

  // Submissões por Semana (Bar Chart)
  const submissionsData = {
    labels: temporal.submissions_per_week.labels,
    datasets: [
      {
        label: 'Submissões',
        data: temporal.submissions_per_week.data,
        backgroundColor: 'rgba(46, 184, 92, 0.8)',
        borderColor: '#2eb85c',
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  };

  // Usuários por Mês (Line Chart)
  const usersData = {
    labels: temporal.users_created_per_month.labels,
    datasets: [
      {
        label: 'Novos Usuários',
        data: temporal.users_created_per_month.data,
        fill: true,
        backgroundColor: 'rgba(111, 66, 193, 0.1)',
        borderColor: '#6f42c1',
        borderWidth: 2,
        tension: 0.4,
        pointBackgroundColor: '#6f42c1',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 3
      },
      {
        label: 'Usuários Ativos',
        data: temporal.users_active_per_month.data,
        fill: true,
        backgroundColor: 'rgba(46, 184, 92, 0.1)',
        borderColor: '#2eb85c',
        borderWidth: 2,
        tension: 0.4,
        pointBackgroundColor: '#2eb85c',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 3
      }
    ]
  };

  // Status de Submissões (Doughnut Chart)
  const statusData = {
    labels: temporal.submission_status_distribution.labels,
    datasets: [
      {
        data: temporal.submission_status_distribution.data,
        backgroundColor: [
          'rgba(255, 193, 7, 0.8)',
          'rgba(13, 110, 253, 0.8)',
          'rgba(46, 184, 92, 0.8)',
          'rgba(229, 83, 83, 0.8)'
        ],
        borderColor: ['#ffc107', '#0d6efd', '#2eb85c', '#e55353'],
        borderWidth: 2
      }
    ]
  };

  const doughnutOptions = {
    ...commonOptions,
    plugins: {
      ...commonOptions.plugins,
      legend: {
        display: true,
        position: 'bottom' as const
      }
    },
    cutout: '60%'
  };

  return (
    <div className={styles.chartsGrid}>
      <div className={styles.chartContainer}>
        <h4 className={styles.chartTitle}>Submissões por Dia</h4>
        <div className={styles.chartWrapper}>
          <Line data={submissionsPerDayData} options={commonOptions} />
        </div>
      </div>

      <div className={styles.chartContainer}>
        <h4 className={styles.chartTitle}>Submissões por Semana</h4>
        <div className={styles.chartWrapper}>
          <Bar data={submissionsData} options={commonOptions} />
        </div>
      </div>

      <div className={styles.chartContainer}>
        <h4 className={styles.chartTitle}>Usuários por Mês</h4>
        <div className={styles.chartWrapper}>
          <Line data={usersData} options={{ ...commonOptions, plugins: { legend: { display: true } } }} />
        </div>
      </div>

      <div className={styles.chartContainer}>
        <h4 className={styles.chartTitle}>Status das Submissões</h4>
        <div className={styles.chartWrapper}>
          <Doughnut data={statusData} options={doughnutOptions} />
        </div>
      </div>
    </div>
  );
};

export default TemporalCharts;
