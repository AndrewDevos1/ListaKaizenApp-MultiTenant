import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

interface Cotacao {
    id: number;
    data_cotacao: string;
    fornecedor: {
        nome: string;
    };
}

const CotacaoList: React.FC = () => {
    const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);

    useEffect(() => {
        const fetchCotacoes = async () => {
            const response = await api.get('/v1/cotacoes');
            setCotacoes(response.data);
        };
        fetchCotacoes();
    }, []);

    return (
        <div>
            <h3>Cotações Geradas</h3>
            <ul>
                {cotacoes.map(c => (
                    <li key={c.id}>
                        <Link to={`/admin/cotacoes/${c.id}`}>
                            Cotação #{c.id} - {c.fornecedor.nome} - {new Date(c.data_cotacao).toLocaleDateString()}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default CotacaoList;
