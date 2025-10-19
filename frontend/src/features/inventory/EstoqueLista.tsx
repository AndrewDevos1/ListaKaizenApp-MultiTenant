import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Table, Button, Form, Spinner, Alert, Row, Col, Card } from 'react-bootstrap';
import api from '../../services/api';

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
    changed?: boolean;
}

const EstoqueLista: React.FC = () => {
    const { areaId } = useParams<{ areaId: string }>();
    const [estoque, setEstoque] = useState<EstoqueItem[]>([]);
    const [originalEstoque, setOriginalEstoque] = useState<EstoqueItem[]>([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [areaName, setAreaName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (areaId) {
            const fetchEstoque = async () => {
                setIsLoading(true);
                try {
                    const [estoqueRes, areaRes] = await Promise.all([
                        api.get(`/v1/areas/${areaId}/estoque`),
                        api.get(`/v1/areas/${areaId}`)
                    ]);
                    const estoqueComStatus = estoqueRes.data.map(item => ({ ...item, changed: false }));
                    setEstoque(estoqueComStatus);
                    setOriginalEstoque(JSON.parse(JSON.stringify(estoqueComStatus))); // Deep copy
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
        const updatedEstoque = estoque.map(item => {
            if (item.id === estoqueId) {
                const originalItem = originalEstoque.find(oi => oi.id === estoqueId);
                const isChanged = originalItem?.quantidade_atual !== parseFloat(novaQuantidade);
                return { ...item, quantidade_atual: parseFloat(novaQuantidade) || 0, changed: isChanged };
            }
            return item;
        });
        setEstoque(updatedEstoque);
    };

    const handleSaveDraft = async () => {
        setIsLoading(true);
        setError('');
        setSuccess('');
        try {
            await api.post(`/v1/estoque/draft`, { area_id: areaId, items: estoque });
            setSuccess('Rascunho salvo com sucesso!');
            const estoqueComStatus = estoque.map(item => ({ ...item, changed: false }));
            setEstoque(estoqueComStatus);
            setOriginalEstoque(JSON.parse(JSON.stringify(estoqueComStatus)));
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

    const filteredEstoque = useMemo(() => {
        return estoque.filter(item => 
            item.item.nome.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [estoque, searchTerm]);

    const summary = useMemo(() => {
        const totalItems = estoque.length;
        const itemsToRequest = estoque.filter(item => item.quantidade_atual < item.quantidade_minima).length;
        const changedItems = estoque.filter(item => item.changed).length;
        return { totalItems, itemsToRequest, changedItems };
    }, [estoque]);

    return (
        <div>
            <h2 className="fs-2 mb-4">Preenchimento de Estoque: {areaName}</h2>
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            <Row className="mb-3">
                <Col md={8}>
                    <Form.Control 
                        type="text" 
                        placeholder="Buscar item..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                    />
                </Col>
                <Col md={4}>
                    <Card>
                        <Card.Body className="p-2 text-center">
                            <small className="text-muted">Itens a Pedir: </small><span className="fw-bold">{summary.itemsToRequest}</span> | 
                            <small className="text-muted"> Alterados: </small><span className="fw-bold">{summary.changedItems}</span> | 
                            <small className="text-muted"> Total: </small><span className="fw-bold">{summary.totalItems}</span>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

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
                        {isLoading && !filteredEstoque.length ? (
                            <tr>
                                <td colSpan={3} className="text-center"><Spinner animation="border" /></td>
                            </tr>
                        ) : filteredEstoque.length > 0 ? filteredEstoque.map(item => (
                            <tr key={item.id} className={item.changed ? 'table-warning' : ''}>
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
                                <td colSpan={3} className="text-center">Nenhum item encontrado.</td>
                            </tr>
                        )}
                    </tbody>
                </Table>
                <div className="d-flex justify-content-end gap-2 mt-3">
                    <Button variant="outline-secondary" onClick={handleSaveDraft} disabled={isLoading || summary.changedItems === 0}>
                        {isLoading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true"/> : 'Salvar Rascunho'}
                    </Button>
                    <Button variant="primary" onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true"/> : 'Submeter Lista'}
                    </Button>
                </div>
            </Form>
        </div>
    );
};

export default EstoqueLista;