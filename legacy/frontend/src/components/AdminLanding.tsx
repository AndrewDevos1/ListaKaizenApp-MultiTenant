import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from '../features/admin/AdminDashboard';

const AdminLanding: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (user?.role === 'SUPER_ADMIN') {
    return <Navigate to="/admin/global" replace />;
  }

  return <AdminDashboard />;
};

export default AdminLanding;
