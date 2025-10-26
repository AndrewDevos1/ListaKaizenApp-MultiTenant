import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute: React.FC = () => {
    const { isAuthenticated, user, loading } = useAuth();

    console.log('[PROTECTED_ROUTE] check:', { isAuthenticated, user, loading });

    // Espera o loading terminar antes de redirecionar
    if (loading) {
        console.log('[PROTECTED_ROUTE] Verificando autenticacao...');
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
        console.log('[PROTECTED_ROUTE] Nao autenticado - redirecionando para /login');
        return <Navigate to="/login" replace />;
    }

    console.log('[PROTECTED_ROUTE] Autenticado - permitindo acesso');
    return <Outlet />;
};

export default ProtectedRoute;
