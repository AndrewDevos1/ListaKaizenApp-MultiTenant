
import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface Submission {
  id: number;
  list_name: string;
  user_name: string;
  created_at: string;
  status: string;
}

const RecentSubmissions: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const response = await api.get('/submissions/recent');
        setSubmissions(response.data);
      } catch (err) {
        setError('Failed to fetch recent submissions.');
      }
      setLoading(false);
    };

    fetchSubmissions();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className="card shadow mb-4">
      <div className="card-header py-3">
        <h6 className="m-0 font-weight-bold text-primary">Submissões Recentes</h6>
      </div>
      <div className="card-body">
        <div className="table-responsive">
          <table className="table table-bordered" id="dataTable" width="100%" cellSpacing="0">
            <thead>
              <tr>
                <th>#</th>
                <th>Lista</th>
                <th>Colaborador</th>
                <th>Data</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => (
                <tr key={sub.id}>
                  <td>{sub.id}</td>
                  <td>{sub.list_name}</td>
                  <td>{sub.user_name}</td>
                  <td>{new Date(sub.created_at).toLocaleDateString()}</td>
                  <td>{sub.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RecentSubmissions;
