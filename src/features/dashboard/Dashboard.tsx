import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

interface Area {
    id: number;
    nome: string;
}

const Dashboard: React.FC = () => {
    const [areas, setAreas] = useState<Area[]>([]);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAreas = async () => {
            try {
                const response = await api.get('/v1/areas');
                setAreas(response.data);
            } catch (err) {
                setError('Não foi possível carregar as áreas.');
            }
        };

        fetchAreas();
    }, []);

    return (
        <div>
            <h2>Dashboard do Colaborador</h2>
            <h3>Listas Disponíveis (Áreas)</h3>
            <Link to="/me/submissions">Ver Minhas Submissões</Link>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <ul>
                {areas.length > 0 ? (
                    areas.map(area => (
                        <li key={area.id}>
                            <Link to={`/area/${area.id}/estoque`}>{area.nome}</Link>
                        </li>
                    ))
                ) : (
                    <p>Nenhuma área encontrada.</p>
                )}
            </ul>
        </div>
    );
};

export default Dashboard;
