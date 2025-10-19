
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faListCheck, faHourglassHalf, faCheckDouble } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';

interface UserStatsData {
  pending_submissions: number;
  completed_lists: number;
}

const UserStats: React.FC = () => {
  const [stats, setStats] = useState<UserStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        // const response = await api.get('/api/v1/users/stats');
        // setStats(response.data);
        // Mock data for now
        setStats({ pending_submissions: 3, completed_lists: 12 });
      } catch (error) {
        console.error('Failed to fetch user stats', error);
      }
      setLoading(false);
    };

    fetchUserStats();
  }, []);

  if (loading) {
    return <div>Loading stats...</div>;
  }

  return (
    <div className="row">
      <div className="col-md-6 mb-4">
        <div className="card border-left-warning shadow h-100 py-2">
          <div className="card-body">
            <div className="row no-gutters align-items-center">
              <div className="col mr-2">
                <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">Submissões Pendentes</div>
                <div className="h5 mb-0 font-weight-bold text-gray-800">{stats?.pending_submissions}</div>
              </div>
              <div className="col-auto">
                <FontAwesomeIcon icon={faHourglassHalf} className="fa-2x text-gray-300" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="col-md-6 mb-4">
        <div className="card border-left-success shadow h-100 py-2">
          <div className="card-body">
            <div className="row no-gutters align-items-center">
              <div className="col mr-2">
                <div className="text-xs font-weight-bold text-success text-uppercase mb-1">Listas Concluídas</div>
                <div className="h5 mb-0 font-weight-bold text-gray-800">{stats?.completed_lists}</div>
              </div>
              <div className="col-auto">
                <FontAwesomeIcon icon={faCheckDouble} className="fa-2x text-gray-300" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserStats;
