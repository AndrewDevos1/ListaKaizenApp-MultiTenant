import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PublicRoute: React.FC = () => {
    const { isAuthenticated, user, loading, logout } = useAuth();
    const [checkedExpiry, setCheckedExpiry] = React.useState(false);

    React.useEffect(() => {
        if (loading) return;

        const sessionExpiry = localStorage.getItem('sessionExpiry');
        if (sessionExpiry) {
            const expiryTime = parseInt(sessionExpiry, 10);
            if (Date.now() > expiryTime) {
                logout();
                setCheckedExpiry(true);
                return;
            }
        }

        setCheckedExpiry(true);
    }, [loading, logout]);

    if (loading || !checkedExpiry) {
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

    if (isAuthenticated && user) {
        if (user.role === 'SUPER_ADMIN') {
            return <Navigate to="/admin/global" replace />;
        }
        if (user.role === 'ADMIN') {
            return <Navigate to="/admin" replace />;
        }
        if (user.role === 'COLLABORATOR') {
            return <Navigate to="/collaborator" replace />;
        }
        if (user.role === 'SUPPLIER') {
            return <Navigate to="/supplier" replace />;
        }
    }

    return <Outlet />;
};

export default PublicRoute;
