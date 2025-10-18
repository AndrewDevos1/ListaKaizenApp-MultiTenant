import React, { useState, useEffect } from 'react';
import { Table, Alert, Spinner } from 'react-bootstrap';
import api from '../../services/api';
import Layout from '../../components/Layout';

interface Pedido {
    id: number;
    data_pedido: string;
    quantidade_solicitada: number;
    item: {
        nome: string;
        unidade_medida: string;
    };
    fornecedor: {
        nome: string;
    };
}

const MinhasSubmissoes: React.FC = () => {
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchPedidos = async () => {
            setIsLoading(true);
            try {
                const response = await api.get('/v1/pedidos/me');
                setPedidos(response.data);
            } catch (err) {
                setError('Não foi possível carregar o histórico de pedidos.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchPedidos();
    }, []);

    return (
        <Layout title="Minhas Submissões (Pedidos Gerados)">
            {error && <Alert variant="danger">{error}</Alert>}

            <Table striped bordered hover responsive>
                <thead className="table-dark">
                    <tr>
                        <th>Data</th>
                        <th>Item</th>
                        <th className="text-center">Quantidade</th>
                        <th>Fornecedor</th>
                    </tr>
                </thead>
                <tbody>
                    {isLoading ? (
                        <tr>
                            <td colSpan={4} className="text-center"><Spinner animation="border" /></td>
                        </tr>
                    ) : pedidos.length > 0 ? (
                        pedidos.map(p => (
                            <tr key={p.id}>
                                <td>{new Date(p.data_pedido).toLocaleDateString()}</td>
                                <td>{p.item.nome}</td>
                                <td className="text-center">{`${p.quantidade_solicitada} ${p.item.unidade_medida}`}</td>
                                <td>{p.fornecedor.nome}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={4} className="text-center">Você ainda não gerou nenhum pedido.</td>
                        </tr>
                    )}
                </tbody>
            </Table>
        </Layout>
    );
};

export default MinhasSubmissoes;
