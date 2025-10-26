/**
 * Estoque - Preenchimento de Lista de Compras
 *
 * Componente para colaboradores preencherem as quantidades atuais de itens
 * de uma lista específica, com cálculo automático de pedidos
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Table, Button, Form, Spinner, Alert, Row, Col, Card, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft,
    faCheckCircle,
    faExclamationTriangle,
    faSave,
    faPaperPlane,
    faShoppingCart
} from '@fortawesome/free-solid-svg-icons';
import CustomSpinner from '../../components/Spinner';
import api from '../../services/api';
import styles from './EstoqueListaCompras.module.css';

// Interfaces TypeScript
interface EstoqueItem {
    id: number;
    item_id: number;
    lista_id: number;
    quantidade_atual: number;
    quantidade_minima: number;
    pedido: number;
    item: {
        id: number;
        nome: string;
        unidade_medida: string;
    };
    changed?: boolean;
}

interface SubmitResponse {
    message: string;
    estoques_atualizados: number;
    pedidos_criados: number;
}

const EstoqueListaCompras: React.FC = () => {
    const { listaId } = useParams<{ listaId: string }>();
    const navigate = useNavigate();

    const [estoque, setEstoque] = useState<EstoqueItem[]>([]);
    const [originalEstoque, setOriginalEstoque] = useState<EstoqueItem[]>([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [listaName, setListaName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Carregar estoque da lista
    useEffect(() => {
        if (listaId) {
            const fetchEstoque = async () => {
                setIsLoading(true);
                try {
                    const response = await api.get(`/v1/listas/${listaId}/estoque`);
                    const estoqueComStatus = response.data.map((item: EstoqueItem) => ({
                        ...item,
                        changed: false
                    }));
                    setEstoque(estoqueComStatus);
                    setOriginalEstoque(JSON.parse(JSON.stringify(estoqueComStatus))); // Deep copy

                    // Se há itens, pega o nome da lista do primeiro item (ou você pode fazer outro request)
                    if (estoqueComStatus.length > 0) {
                        setListaName(`Lista #${listaId}`);
                    }
                } catch (err: any) {
                    setError(err.response?.data?.error || 'Não foi possível carregar os itens de estoque.');
                    console.error('Erro:', err);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchEstoque();
        }
    }, [listaId]);

    // Handle mudança de quantidade
    const handleQuantityChange = (estoqueId: number, novaQuantidade: string) => {
        const updatedEstoque = estoque.map(item => {
            if (item.id === estoqueId) {
                const originalItem = originalEstoque.find(oi => oi.id === estoqueId);
                const isChanged = originalItem?.quantidade_atual !== parseFloat(novaQuantidade);
                return {
                    ...item,
                    quantidade_atual: parseFloat(novaQuantidade) || 0,
                    changed: isChanged
                };
            }
            return item;
        });
        setEstoque(updatedEstoque);
    };

    // Salvar rascunho
    const handleSaveDraft = async () => {
        setIsLoading(true);
        setError('');
        setSuccess('');
        try {
            // Salva um item por vez para confirmar que tem acesso
            const itemsParaSalvar = estoque
                .filter(item => item.changed)
                .map(item => ({
                    estoque_id: item.id,
                    quantidade_atual: item.quantidade_atual
                }));

            if (itemsParaSalvar.length === 0) {
                setError('Nenhum item foi alterado.');
                setIsLoading(false);
                return;
            }

            // Faz um request para cada item (pode otimizar depois com batch)
            for (const item of itemsParaSalvar) {
                await api.put(`/v1/estoque/${item.estoque_id}`, {
                    quantidade_atual: item.quantidade_atual
                });
            }

            setSuccess('Rascunho salvo com sucesso!');
            const estoqueComStatus = estoque.map(item => ({ ...item, changed: false }));
            setEstoque(estoqueComStatus);
            setOriginalEstoque(JSON.parse(JSON.stringify(estoqueComStatus)));
        } catch (err: any) {
            setError(err.response?.data?.error || 'Falha ao salvar o rascunho.');
        } finally {
            setIsLoading(false);
        }
    };

    // Submeter lista
    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError('');
        setSuccess('');
        try {
            // Prepara os dados para submit
            const itemsParaSubmeter = estoque.map(item => ({
                estoque_id: item.id,
                quantidade_atual: item.quantidade_atual
            }));

            const response = await api.post<SubmitResponse>(
                `/v1/listas/${listaId}/estoque/submit`,
                { items: itemsParaSubmeter }
            );

            setSuccess(
                `[OK] Lista submetida com sucesso! ${response.data.pedidos_criados} pedido(s) criado(s).`
            );

            // Recarrega os dados
            setTimeout(() => {
                navigate('/collaborator/listas');
            }, 2000);
        } catch (err: any) {
            setError(
                err.response?.data?.error || 'Erro ao submeter a lista.'
            );
            console.error('Erro ao submeter:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter e summary
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
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => navigate('/collaborator/listas')}
                    className="mb-3"
                >
                    <FontAwesomeIcon icon={faArrowLeft} /> Voltar
                </Button>

                <h2 className={`fs-2 mb-2 ${styles.title}`}>
                    <FontAwesomeIcon icon={faShoppingCart} /> Preenchimento: {listaName}
                </h2>
                <p className="text-muted">
                    Atualize as quantidades atuais de cada item e clique em "Submeter Lista"
                </p>
            </div>

            {/* Alertas */}
            {error && (
                <Alert variant="danger" onClose={() => setError('')} dismissible>
                    <FontAwesomeIcon icon={faExclamationTriangle} /> {error}
                </Alert>
            )}
            {success && (
                <Alert variant="success" onClose={() => setSuccess('')} dismissible>
                    <FontAwesomeIcon icon={faCheckCircle} /> {success}
                </Alert>
            )}

            {/* Search e Summary */}
            <Row className="mb-4 g-3">
                <Col md={8}>
                    <Form.Group>
                        <Form.Control
                            type="text"
                            placeholder="[BUSCA] Buscar item..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className={styles.searchInput}
                        />
                    </Form.Group>
                </Col>
                <Col md={4}>
                    <Card className={styles.summaryCard}>
                        <Card.Body className="p-3">
                            <div className={styles.summaryRow}>
                                <div className={styles.summaryItem}>
                                    <Badge bg="danger" className="me-2">
                                        {summary.itemsToRequest}
                                    </Badge>
                                    <small>Em Falta</small>
                                </div>
                                <div className={styles.summaryItem}>
                                    <Badge bg="warning" className="me-2">
                                        {summary.changedItems}
                                    </Badge>
                                    <small>Alterados</small>
                                </div>
                                <div className={styles.summaryItem}>
                                    <Badge bg="info" className="me-2">
                                        {summary.totalItems}
                                    </Badge>
                                    <small>Total</small>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Tabela de Estoque */}
            <Form onSubmit={(e) => { e.preventDefault(); }}>
                <div className={styles.tableWrapper}>
                    <Table striped bordered hover responsive className={styles.table}>
                        <thead>
                            <tr className={styles.tableHeader}>
                                <th>Item</th>
                                <th className="text-center" style={{width: '120px'}}>Unidade</th>
                                <th className="text-center" style={{width: '120px'}}>Qtd. Mín.</th>
                                <th className="text-center" style={{width: '120px'}}>Qtd. Atual</th>
                                <th className="text-center" style={{width: '100px'}}>Pedido</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading && !filteredEstoque.length ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-5">
                                        <CustomSpinner />
                                    </td>
                                </tr>
                            ) : filteredEstoque.length > 0 ? filteredEstoque.map(item => (
                                <tr key={item.id} className={item.changed ? styles.changedRow : ''}>
                                    <td className={styles.itemNameCell}>
                                        <strong>{item.item?.nome || 'Nome não encontrado'}</strong>
                                    </td>
                                    <td className="text-center">
                                        {item.item?.unidade_medida}
                                    </td>
                                    <td className="text-center">
                                        <Badge bg="secondary">{item.quantidade_minima}</Badge>
                                    </td>
                                    <td className={styles.quantityCell}>
                                        <Form.Control
                                            type="number"
                                            value={item.quantidade_atual}
                                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                            step="0.01"
                                            className={styles.quantityInput}
                                        />
                                    </td>
                                    <td className="text-center">
                                        {item.quantidade_atual < item.quantidade_minima ? (
                                            <Badge bg="danger">{item.pedido.toFixed(2)}</Badge>
                                        ) : (
                                            <Badge bg="success">0</Badge>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="text-center text-muted py-4">
                                        Nenhum item encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </div>

                {/* Botões de Ação */}
                <div className={styles.actionButtons}>
                    <Button
                        variant="outline-secondary"
                        onClick={handleSaveDraft}
                        disabled={isLoading || summary.changedItems === 0}
                        className={styles.buttonSave}
                    >
                        {isLoading ? (
                            <>
                                <Spinner as="span" animation="border" size="sm" className="me-2" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faSave} className="me-2" />
                                Salvar Rascunho
                            </>
                        )}
                    </Button>

                    <Button
                        variant="success"
                        onClick={handleSubmit}
                        disabled={isSubmitting || isLoading}
                        className={styles.buttonSubmit}
                    >
                        {isSubmitting ? (
                            <>
                                <Spinner as="span" animation="border" size="sm" className="me-2" />
                                Submetendo...
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faPaperPlane} className="me-2" />
                                Submeter Lista
                            </>
                        )}
                    </Button>
                </div>
            </Form>
        </div>
    );
};

export default EstoqueListaCompras;
