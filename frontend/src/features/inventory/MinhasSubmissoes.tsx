import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface Pedido {
    id: number;
    data_pedido: string;
    quantidade_solicitada: number;
    item: {
        nome: string;
    };
    fornecedor: {
        nome: string;
    };
}

const MinhasSubmissoes: React.FC = () => {
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchPedidos = async () => {
            try {
                const response = await api.get('/v1/pedidos/me');
                setPedidos(response.data);
            } catch (err) {
                setError('Não foi possível carregar o histórico de pedidos.');
            }
        };
        fetchPedidos();
    }, []);

    return (
        <div>
            <h3>Minhas Submissões (Pedidos Gerados)</h3>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {pedidos.length > 0 ? (
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Item</th>
                            <th>Quantidade</th>
                            <th>Fornecedor</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pedidos.map(p => (
                            <tr key={p.id}>
                                <td>{new Date(p.data_pedido).toLocaleDateString()}</td>
                                <td>{p.item.nome}</td>
                                <td>{p.quantidade_solicitada}</td>
                                <td>{p.fornecedor.nome}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p>Você ainda não gerou nenhum pedido.</p>
            )}
        </div>
    );
};

export default MinhasSubmissoes;
