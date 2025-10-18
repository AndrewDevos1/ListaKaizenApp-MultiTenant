import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Table, Button, Form, Spinner, Alert } from 'react-bootstrap';
import api from '../../services/api';
import Layout from '../../components/Layout';

interface EstoqueItem {
    id: number;
    item_id: number;
    area_id: number;
    quantidade_atual: number;
    quantidade_minima: number;
    item: {
        id: number;
        nome: string;
        unidade_medida: string;
    };
}

const EstoqueLista: React.FC = () => {
    const { areaId } = useParams<{ areaId: string }>();
    const [estoque, setEstoque] = useState<EstoqueItem[]>([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [areaName, setAreaName] = useState('');

    useEffect(() => {
        if (areaId) {
            const fetchEstoque = async () => {
                setIsLoading(true);
                try {
                    const [estoqueRes, areaRes] = await Promise.all([
                        api.get(`/v1/areas/${areaId}/estoque`),
                        api.get(`/v1/areas/${areaId}`)
                    ]);
                    setEstoque(estoqueRes.data);
                    setAreaName(areaRes.data.nome);
                } catch (err) {
                    setError('Não foi possível carregar os itens de estoque.');
                } finally {
                    setIsLoading(false);
                }
            };
            fetchEstoque();
        }
    }, [areaId]);

    const handleQuantityChange = (estoqueId: number, novaQuantidade: string) => {
        const updatedEstoque = estoque.map(item => 
            item.id === estoqueId ? { ...item, quantidade_atual: parseFloat(novaQuantidade) || 0 } : item
        );
        setEstoque(updatedEstoque);
    };

    const handleSaveDraft = async () => {
        setIsLoading(true);
        setError('');
        setSuccess('');
        try {
            await api.post(`/v1/estoque/draft`, { area_id: areaId, items: estoque });
            setSuccess('Rascunho salvo com sucesso!');
        } catch (err) {
            setError('Falha ao salvar o rascunho.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        setError('');
        setSuccess('');
        try {
            await handleSaveDraft(); // Save latest changes first
            const response = await api.post('/v1/pedidos/submit', { area_id: areaId });
            setSuccess(response.data.message);
        } catch (err) {
            setError('Erro ao submeter a lista.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Layout title={`Preenchimento de Estoque: ${areaName}`}>
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            <Form onSubmit={(e) => { e.preventDefault(); }}>
                <Table striped bordered hover responsive>
                    <thead className="table-dark">
                        <tr>
                            <th>Item</th>
                            <th className="text-center">Qtd. Mínima</th>
                            <th style={{ width: '150px' }} className="text-center">Qtd. Atual</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && !estoque.length ? (
                            <tr>
                                <td colSpan={3} className="text-center"><Spinner animation="border" /></td>
                            </tr>
                        ) : estoque.length > 0 ? estoque.map(item => (
                            <tr key={item.id}>
                                <td>{item.item?.nome || 'Nome não encontrado'} ({item.item?.unidade_medida})</td>
                                <td className="text-center">{item.quantidade_minima}</td>
                                <td>
                                    <Form.Control 
                                        type="number" 
                                        value={item.quantidade_atual}
                                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                        step="0.01"
                                        className="text-center"
                                    />
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={3} className="text-center">Nenhum item de estoque para esta área.</td>
                            </tr>
                        )}
                    </tbody>
                </Table>
                <div className="d-flex justify-content-end gap-2 mt-3">
                    <Button variant="outline-secondary" onClick={handleSaveDraft} disabled={isLoading}>
                        {isLoading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true"/> : 'Salvar Rascunho'}
                    </Button>
                    <Button variant="primary" onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true"/> : 'Submeter Lista'}
                    </Button>
                </div>
            </Form>
        </Layout>
    );
};

export default EstoqueLista;
