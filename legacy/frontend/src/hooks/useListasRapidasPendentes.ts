import { useEffect, useState } from 'react';
import api from '../services/api';

export const useListasRapidasPendentes = (userRole: string | undefined) => {
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') return;

        const fetchCount = async () => {
            setLoading(true);
            try {
                const response = await api.get('/admin/listas-rapidas/pendentes/count');
                setCount(response.data.count || 0);
            } catch (error) {
                console.error('[useListasRapidasPendentes] Erro:', error);
                setCount(0);
            } finally {
                setLoading(false);
            }
        };

        fetchCount();

        const interval = setInterval(fetchCount, 30000);
        return () => clearInterval(interval);
    }, [userRole]);

    return { count, loading };
};
