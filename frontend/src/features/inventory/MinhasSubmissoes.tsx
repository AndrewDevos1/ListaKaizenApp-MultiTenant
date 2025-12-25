import React, { useState, useEffect, useMemo } from 'react';
import { Table, Alert, Form, Badge } from 'react-bootstrap';
import api from '../../services/api';
import CustomSpinner from '../../components/Spinner';
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
    status: string;
}

const MinhasSubmissoes: React.FC = () => {
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('TODOS');

    useEffect(() => {
        const fetchPedidos = async () => {
            setIsLoading(true);
            try {
                const response = await api.get('/pedidos/me');
                setPedidos(response.data);
            } catch (err) {
                setError('Não foi possível carregar o histórico de pedidos.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchPedidos();
    }, []);

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'PENDENTE': return 'warning';
            case 'APROVADO': return 'success';
            case 'REJEITADO': return 'danger';
            default: return 'secondary';
        }
    };

    const filteredPedidos = useMemo(() => {
        if (filterStatus === 'TODOS') {
            return pedidos;
        }
        return pedidos.filter(pedido => pedido.status === filterStatus);
    }, [pedidos, filterStatus]);

    return (
        <Layout title="Minhas Submissões (Pedidos Gerados)">
            {error && <Alert variant="danger">{error}</Alert>}

            <Form.Group className="mb-3">
                <Form.Label>Filtrar por Status:</Form.Label>
                <Form.Select 
                    value={filterStatus} 
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{ maxWidth: '200px' }}
                >
                    <option value="TODOS">Todos</option>
                    <option value="PENDENTE">Pendente</option>
                    <option value="APROVADO">Aprovado</option>
                    <option value="REJEITADO">Rejeitado</option>
                </Form.Select>
            </Form.Group>

            <Table striped bordered hover responsive>
                <thead className="table-dark">
                    <tr>
                        <th>Data</th>
                        <th>Item</th>
                        <th className="text-center">Quantidade</th>
                        <th>Fornecedor</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {isLoading ? (
                        <tr>
                            <td colSpan={5} className="text-center"><CustomSpinner /></td>
                        </tr>
                    ) : filteredPedidos.length > 0 ? (
                        filteredPedidos.map(p => (
                            <tr key={p.id}>
                                <td>{new Date(p.data_pedido).toLocaleDateString()}</td>
                                <td>{p.item.nome}</td>
                                <td className="text-center">{`${p.quantidade_solicitada} ${p.item.unidade_medida}`}</td>
                                <td>{p.fornecedor.nome}</td>
                                <td>
                                    <Badge bg={getStatusVariant(p.status)}>{p.status}</Badge>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={5} className="text-center">Você ainda não gerou nenhum pedido ou não há pedidos com o status selecionado.</td>
                        </tr>
                    )}
                </tbody>
            </Table>
        </Layout>
    );
};

export default MinhasSubmissoes;
