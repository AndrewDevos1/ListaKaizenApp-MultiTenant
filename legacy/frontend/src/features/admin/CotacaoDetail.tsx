import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Table, Button, Form, Spinner, Alert, Card, Col, Row } from 'react-bootstrap';
import api from '../../services/api';

interface CotacaoItem {
    id: number;
    quantidade: number;
    preco_unitario: number;
    item: {
        nome: string;
        unidade_medida: string;
    };
}

interface Cotacao {
    id: number;
    data_cotacao: string;
    fornecedor: {
        nome: string;
    };
    itens: CotacaoItem[];
}

const CotacaoDetail: React.FC = () => {
    const { cotacaoId } = useParams<{ cotacaoId: string }>();
    const [cotacao, setCotacao] = useState<Cotacao | null>(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const fetchCotacao = useCallback(async () => {
        if (cotacaoId) {
            setIsLoading(true);
            setError('');
            try {
                const response = await api.get(`/v1/cotacoes/${cotacaoId}`);
                setCotacao(response.data);
            } catch (err) {
                setError('Não foi possível carregar a cotação.');
            } finally {
                setIsLoading(false);
            }
        }
    }, [cotacaoId]);

    useEffect(() => {
        fetchCotacao();
    }, [fetchCotacao]);

    const handlePriceChange = (itemId: number, price: string) => {
        if (!cotacao) return;
        const updatedItens = cotacao.itens.map(item => 
            item.id === itemId ? { ...item, preco_unitario: parseFloat(price) || 0 } : item
        );
        setCotacao({ ...cotacao, itens: updatedItens });
    };

    const handleSavePrices = async () => {
        if (!cotacao) return;
        setIsLoading(true);
        setError('');
        setSuccess('');
        try {
            // Esta lógica pode precisar de um endpoint de lote no backend para eficiência
            for (const item of cotacao.itens) {
                await api.put(`/v1/cotacao-items/${item.id}`, { preco_unitario: item.preco_unitario });
            }
            setSuccess('Preços salvos com sucesso!');
        } catch (err) {
            setError('Erro ao salvar os preços.');
        } finally {
            setIsLoading(false);
        }
    };

    const calculateTotal = () => {
        return cotacao?.itens.reduce((acc, item) => acc + (item.quantidade * item.preco_unitario), 0).toFixed(2);
    };

    if (isLoading && !cotacao) {
        return <div><h2>Carregando...</h2><div className="text-center"><Spinner animation="border" /></div></div>;
    }

    if (error) {
        return <div><h2>Erro</h2><Alert variant="danger">{error}</Alert></div>;
    }

    if (!cotacao) {
        return <div><h2>Cotação não encontrada</h2><Alert variant="warning">Cotação não encontrada.</Alert></div>;
    }

    return (
        <div>
            <h2>Detalhes da Cotação #{cotacao.id}</h2>
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}
            <Card className="mb-4">
                <Card.Header as="h4">Informações da Cotação</Card.Header>
                <Card.Body>
                    <Row>
                        <Col md={6}><strong>Fornecedor:</strong> {cotacao.fornecedor.nome}</Col>
                        <Col md={6}><strong>Data:</strong> {new Date(cotacao.data_cotacao).toLocaleDateString()}</Col>
                    </Row>
                </Card.Body>
            </Card>

            <Form onSubmit={(e) => { e.preventDefault(); handleSavePrices(); }}>
                <Table striped bordered hover responsive>
                    <thead className="table-dark">
                        <tr>
                            <th>Item</th>
                            <th className="text-center">Quantidade</th>
                            <th style={{ width: '200px' }} className="text-center">Preço Unitário (R$)</th>
                            <th className="text-end">Subtotal (R$)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cotacao.itens.map(item => (
                            <tr key={item.id}>
                                <td>{item.item.nome}</td>
                                <td className="text-center">{`${item.quantidade} ${item.item.unidade_medida}`}</td>
                                <td>
                                    <Form.Control 
                                        type="number"
                                        value={item.preco_unitario}
                                        onChange={e => handlePriceChange(item.id, e.target.value)}
                                        step="0.01"
                                        className="text-center"
                                    />
                                </td>
                                <td className="text-end">{(item.quantidade * item.preco_unitario).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="table-light">
                            <td colSpan={3} className="text-end"><strong>Total:</strong></td>
                            <td className="text-end"><strong>R$ {calculateTotal()}</strong></td>
                        </tr>
                    </tfoot>
                </Table>
                <div className="d-flex justify-content-end">
                    <Button type="submit" variant="primary" disabled={isLoading}>
                        {isLoading ? <Spinner as="span" animation="border" size="sm" /> : 'Salvar Preços'}
                    </Button>
                </div>
            </Form>
        </div>
    );
};

export default CotacaoDetail;
