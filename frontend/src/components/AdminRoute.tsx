import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminRoute: React.FC = () => {
    const { isAuthenticated, user } = useAuth();

    // DIAGNÓSTICO: Verificar autenticação
    console.log('🔐 AdminRoute Check:', {
        isAuthenticated,
        user,
        userRole: user?.role
    });

    if (!isAuthenticated) {
        console.log('❌ Não autenticado - redirecionando para /login');
        return <Navigate to="/login" replace />;
    }

    if (user?.role !== 'ADMIN') {
        console.log('❌ Usuário não é ADMIN - redirecionando para /dashboard');
        return <Navigate to="/dashboard" replace />; // Redireciona para o dashboard de colaborador se não for admin
    }

    console.log('✅ Usuário ADMIN autenticado - renderizando Outlet');
    return <Outlet />;
};

export default AdminRoute;
