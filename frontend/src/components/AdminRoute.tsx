import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminRoute: React.FC = () => {
    const { isAuthenticated, user } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (user?.role !== 'ADMIN') {
        return <Navigate to="/" replace />; // Redireciona para o dashboard se não for admin
    }

    return <Outlet />;
};

export default AdminRoute;
