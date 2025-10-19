import React, { useState, useEffect } from 'react';
import { Row, Col } from 'react-bootstrap';
import { faHourglassHalf, faCheckDouble } from '@fortawesome/free-solid-svg-icons';
import Widget from '../../components/Widget';
import WorkAreasList from './WorkAreasList';
import RecentUserSubmissions from './RecentUserSubmissions';
import api from '../../services/api';
import Spinner from '../../components/Spinner';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    pending_submissions: 0,
    completed_lists: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        const response = await api.get('/v1/users/stats');
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch user stats', error);
      }
      setLoading(false);
    };

    fetchUserStats();
  }, []);

  return (
    <div>
      <h1 className="h3 mb-4 text-gray-800">Meu Dashboard</h1>

      {loading ? (
        <Spinner />
      ) : (
        <Row className="mb-4">
          <Col sm={6} lg={3}>
            <Widget 
              title="Submissões Pendentes" 
              value={String(stats.pending_submissions)} 
              icon={faHourglassHalf} 
              color="warning" 
            />
          </Col>
          <Col sm={6} lg={3}>
            <Widget 
              title="Listas Concluídas" 
              value={String(stats.completed_lists)} 
              icon={faCheckDouble} 
              color="success" 
            />
          </Col>
        </Row>
      )}

      <hr className="my-4" />

      <WorkAreasList />

      <hr className="my-4" />

      <RecentUserSubmissions />
    </div>
  );
};

export default Dashboard;