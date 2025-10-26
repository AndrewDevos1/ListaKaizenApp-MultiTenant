
import React, { useState, useEffect } from 'react';
import { faClipboardList, faComments, faUsers, faChartLine } from '@fortawesome/free-solid-svg-icons';
import StatsCard from './StatsCard';
import RecentSubmissions from './RecentSubmissions';
import api from '../../services/api';
import Spinner from '../../components/Spinner';
import './Dashboard.css';

const GlobalDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    total_lists: '0',
    total_users: '0',
    pending_cotacoes: '0',
    completed_cotacoes: '0',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/stats/dashboard');
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats', error);
      }
      setLoading(false);
    };

    fetchStats();
  }, []);

  return (
    <div>
      <div className="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800">Dashboard Global</h1>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="row">
          <div className="col-xl-3 col-md-6 mb-4">
            <StatsCard title="Total de Listas" value={stats.total_lists} icon={faClipboardList} color="#4e73df" />
          </div>
          <div className="col-xl-3 col-md-6 mb-4">
            <StatsCard title="Total de Usuários" value={stats.total_users} icon={faUsers} color="#1cc88a" />
          </div>
          <div className="col-xl-3 col-md-6 mb-4">
            <StatsCard title="Cotações Pendentes" value={stats.pending_cotacoes} icon={faComments} color="#f6c23e" />
          </div>
          <div className="col-xl-3 col-md-6 mb-4">
            <StatsCard title="Cotações Concluídas" value={stats.completed_cotacoes} icon={faChartLine} color="#36b9cc" />
          </div>
        </div>
      )}

      <div className="row">
        <div className="col-lg-12">
          <RecentSubmissions />
        </div>
      </div>
    </div>
  );
};

export default GlobalDashboard;
