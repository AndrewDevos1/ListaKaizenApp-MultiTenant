import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute: React.FC = () => {
    const { isAuthenticated, user, loading } = useAuth();

    console.log('🔐 ProtectedRoute check:', { isAuthenticated, user, loading });

    // Espera o loading terminar antes de redirecionar
    if (loading) {
        console.log('⏳ Verificando autenticação...');
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
        console.log('❌ Não autenticado - redirecionando para /login');
        return <Navigate to="/login" replace />;
    }

    console.log('✅ Autenticado - permitindo acesso');
    return <Outlet />;
};

export default ProtectedRoute;
