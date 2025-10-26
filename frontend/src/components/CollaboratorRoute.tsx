import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const CollaboratorRoute: React.FC = () => {
    const { isAuthenticated, user, loading } = useAuth();

    // DIAGNÓSTICO: Verificar autenticação
    console.log('🔐 CollaboratorRoute Check:', {
        isAuthenticated,
        user,
        userRole: user?.role,
        loading
    });

    // Espera o loading terminar antes de redirecionar
    if (loading) {
        console.log('⏳ Verificando autenticação colaborador...');
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

    if (user?.role === 'ADMIN') {
        console.log('🔀 Usuário é ADMIN - redirecionando para /admin');
        return <Navigate to="/admin" replace />; // Admin vai para seu dashboard
    }

    if (user?.role !== 'COLLABORATOR') {
        console.log('❌ Usuário não é COLLABORATOR - redirecionando para /login');
        return <Navigate to="/login" replace />;
    }

    console.log('✅ Usuário COLLABORATOR autenticado - renderizando Outlet');
    return <Outlet />;
};

export default CollaboratorRoute;
