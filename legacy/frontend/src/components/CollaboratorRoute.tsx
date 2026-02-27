import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const CollaboratorRoute: React.FC = () => {
    const { isAuthenticated, user, loading } = useAuth();

    // DIAGNOSTICO: Verificar autenticacao
    console.log('[COLLAB_ROUTE] Check:', {
        isAuthenticated,
        user,
        userRole: user?.role,
        loading
    });

    // Espera o loading terminar antes de redirecionar
    if (loading) {
        console.log('[COLLAB_ROUTE] Verificando autenticacao colaborador...');
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
        console.log('[COLLAB_ROUTE] Nao autenticado - redirecionando para /login');
        return <Navigate to="/login" replace />;
    }

    if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
        console.log('[COLLAB_ROUTE] Usuario e ADMIN/SUPER_ADMIN - liberando acesso colaborador');
        return <Outlet />;
    }

    if (user?.role !== 'COLLABORATOR') {
        console.log('[COLLAB_ROUTE] Usuario nao e COLLABORATOR - redirecionando para /login');
        return <Navigate to="/login" replace />;
    }

    console.log('[COLLAB_ROUTE] Usuario COLLABORATOR autenticado - renderizando Outlet');
    return <Outlet />;
};

export default CollaboratorRoute;
