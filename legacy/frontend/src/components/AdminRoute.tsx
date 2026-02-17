import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminRoute: React.FC = () => {
    const { isAuthenticated, user, loading } = useAuth();

    // DIAGNOSTICO: Verificar autenticacao
    console.log('[ADMIN_ROUTE] Check:', {
        isAuthenticated,
        user,
        userRole: user?.role,
        loading
    });

    // Espera o loading terminar antes de redirecionar
    if (loading) {
        console.log('[ADMIN_ROUTE] Verificando autenticacao admin...');
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh'
            }}>
                <div>Carregando...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        console.log('[ADMIN_ROUTE] Nao autenticado - redirecionando para /login');
        return <Navigate to="/login" replace />;
    }

    if (user?.role !== 'ADMIN') {
        console.log('[ADMIN_ROUTE] Usuario nao e ADMIN - redirecionando para /login');
        return <Navigate to="/login" replace />; // Redireciona para login se não for admin
    }

    console.log('[ADMIN_ROUTE] Usuario ADMIN autenticado - renderizando Outlet');
    return <Outlet />;
};

export default AdminRoute;
