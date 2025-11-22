/**
 * Fornecedor Detalhes - Gestão de itens e estoques por fornecedor
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Card, Table, Button, Modal, Form, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faEdit, faBox, faPhone, faPencil, faCheckCircle, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import styles from './FornecedorDetalhes.module.css';

interface Fornecedor {
    id: number;
    nome: string;
    contato: string;
    meio_envio: string;
    responsavel?: string;
    observacao?: string;
    listas?: {
        id: number;
        nome: string;
    }[];
}

interface Item {
    id: number;
    nome: string;
    unidade_medida: string;
    fornecedor_id: number;
}

interface Estoque {
    id: number;
    item_id: number;
    quantidade_atual: number;
    quantidade_minima: number;
    pedido: number;
    area_id: number;
    area?: {
        id: number;
        nome: string;
    };
    item?: Item;
}

const FornecedorDetalhes: React.FC = () => {
    const { fornecedorId } = useParams();
    const [fornecedor, setFornecedor] = useState<Fornecedor | null>(null);
    const [itens, setItens] = useState<Item[]>([]);
    const [estoques, setEstoques] = useState<{ [key: number]: Estoque[] }>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Estados para modal de editar estoque mínimo
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingEstoque, setEditingEstoque] = useState<Estoque | null>(null);
    const [novoMinimo, setNovoMinimo] = useState('');
    const [editingLoading, setEditingLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, [fornecedorId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Buscar fornecedor
            const fornRes = await api.get(`/v1/fornecedores/${fornecedorId}`);
            setFornecedor(fornRes.data);

            // Buscar todos os itens
            const itensRes = await api.get('/v1/items');
            const itensFornecedor = itensRes.data.filter(
                (item: Item) => item.fornecedor_id === Number(fornecedorId)
            );
            setItens(itensFornecedor);

            // Para cada item, buscar estoques
            const estoquesMap: { [key: number]: Estoque[] } = {};
            for (const item of itensFornecedor) {
                try {
                    const estRes = await api.get('/v1/estoques', {
                        params: { item_id: item.id }
                    });
                    estoquesMap[item.id] = estRes.data || [];
                } catch (err) {
                    estoquesMap[item.id] = [];
                }
            }
            setEstoques(estoquesMap);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao carregar dados do fornecedor');
            console.error('Erro ao carregar dados:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEditarMinimo = (estoque: Estoque) => {
        setEditingEstoque(estoque);
        setNovoMinimo(estoque.quantidade_minima.toString());
        setShowEditModal(true);
    };

    const handleSalvarMinimo = async () => {
        if (!editingEstoque || !novoMinimo) return;

        try {
            setEditingLoading(true);
            await api.put(`/v1/estoques/${editingEstoque.id}`, {
                quantidade_minima: parseFloat(novoMinimo)
            });
            setSuccessMessage('Estoque mínimo atualizado com sucesso!');
            setShowEditModal(false);
            await fetchData();

            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao atualizar estoque mínimo');
            console.error('Erro ao salvar:', err);
        } finally {
            setEditingLoading(false);
        }
    };

    if (loading) {
        return (
            <Container className={styles.container}>
                <div className={styles.loadingSpinner}>
                    <Spinner animation="border" role="status">
                        <span className="visually-hidden">Carregando...</span>
                    </Spinner>
                    <p>Carregando dados do fornecedor...</p>
                </div>
            </Container>
        );
    }

    if (!fornecedor) {
        return (
            <Container className={styles.container}>
                <Alert variant="danger">
                    <FontAwesomeIcon icon={faExclamationCircle} style={{ marginRight: '0.5rem' }} />
                    Fornecedor não encontrado
                </Alert>
                <Link to="/admin/fornecedores">← Voltar para Fornecedores</Link>
            </Container>
        );
    }

    return (
        <Container className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <Link to="/admin/fornecedores" className={styles.backLink}>
                    <FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: '0.5rem' }} />
                    Voltar para Fornecedores
                </Link>
            </div>

            {/* Alertas */}
            {error && (
                <Alert variant="danger" dismissible onClose={() => setError(null)} className="mt-3">
                    <FontAwesomeIcon icon={faExclamationCircle} style={{ marginRight: '0.5rem' }} />
                    {error}
                </Alert>
            )}

            {successMessage && (
                <Alert variant="success" dismissible onClose={() => setSuccessMessage(null)} className="mt-3">
                    <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: '0.5rem' }} />
                    {successMessage}
                </Alert>
            )}

            {/* Card do Fornecedor */}
            <Card className={`${styles.fornecedorCard} mt-4 mb-4`}>
                <Card.Header className={styles.cardHeader}>
                    <div>
                        <h2 className={styles.fornecedorNome}>
                            <FontAwesomeIcon icon={faBox} style={{ marginRight: '0.75rem', color: '#f9b115' }} />
                            {fornecedor.nome}
                        </h2>
                    </div>
                </Card.Header>
                <Card.Body>
                    <Row>
                        <Col md={6}>
                            <p className={styles.fornecedorInfo}>
                                <strong>Contato:</strong> {fornecedor.contato || 'Não informado'}
                            </p>
                        </Col>
                        <Col md={6}>
                            <p className={styles.fornecedorInfo}>
                                <strong>Meio de Envio:</strong> {fornecedor.meio_envio || 'Não informado'}
                            </p>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={6}>
                            <p className={styles.fornecedorInfo}>
                                <strong>Responsável:</strong> {fornecedor.responsavel || 'Não informado'}
                            </p>
                        </Col>
                        <Col md={6}>
                            <p className={styles.fornecedorInfo}>
                                <strong>Listas Atribuídas:</strong> {fornecedor.listas && fornecedor.listas.length > 0 ? fornecedor.listas.map(l => l.nome).join(', ') : 'Nenhuma'}
                            </p>
                        </Col>
                    </Row>
                    {fornecedor.observacao && (
                        <Row>
                            <Col md={12}>
                                <p className={styles.fornecedorInfo}>
                                    <strong>Observações:</strong>
                                </p>
                                <p className={styles.observacaoText}>{fornecedor.observacao}</p>
                            </Col>
                        </Row>
                    )}
                </Card.Body>
            </Card>

            {/* Tabela de Itens */}
            <div className={styles.itensSection}>
                <h4 className={styles.sectionTitle}>
                    <FontAwesomeIcon icon={faBox} style={{ marginRight: '0.5rem' }} />
                    Itens deste Fornecedor ({itens.length})
                </h4>

                {itens.length === 0 ? (
                    <Alert variant="info">
                        <p className="mb-0">Nenhum item cadastrado para este fornecedor.</p>
                    </Alert>
                ) : (
                    <div className={styles.tableWrapper}>
                        <Table striped bordered hover responsive className={styles.estoquesTable}>
                            <thead className={styles.tableHead}>
                                <tr>
                                    <th>Nome do Item</th>
                                    <th>Unidade</th>
                                    <th>Área</th>
                                    <th className={styles.thNumero}>Estoque Atual</th>
                                    <th className={styles.thNumero}>Estoque Mínimo</th>
                                    <th className={styles.thNumero}>Pedido</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {itens.map(item => {
                                    const itemEstoques = estoques[item.id] || [];

                                    if (itemEstoques.length === 0) {
                                        return (
                                            <tr key={item.id} className={styles.rowSemEstoque}>
                                                <td><strong>{item.nome}</strong></td>
                                                <td>{item.unidade_medida}</td>
                                                <td colSpan={5} className="text-muted">
                                                    Sem estoque cadastrado
                                                </td>
                                            </tr>
                                        );
                                    }

                                    return itemEstoques.map((estoque, idx) => (
                                        <tr key={`${item.id}-${estoque.id}`} className={styles.rowEstoque}>
                                            {idx === 0 && (
                                                <>
                                                    <td rowSpan={itemEstoques.length} className={styles.tdItemNome}>
                                                        <strong>{item.nome}</strong>
                                                    </td>
                                                    <td rowSpan={itemEstoques.length}>{item.unidade_medida}</td>
                                                </>
                                            )}
                                            <td>{estoque.area?.nome || 'Sem área'}</td>
                                            <td className={`${styles.tdNumero} ${styles.tdAtual}`}>
                                                {estoque.quantidade_atual}
                                            </td>
                                            <td className={`${styles.tdNumero} ${styles.tdMinimo}`}>
                                                {estoque.quantidade_minima}
                                            </td>
                                            <td
                                                className={`${styles.tdNumero} ${
                                                    estoque.pedido > 0 ? styles.tdPedidoAtivo : styles.tdPedidoZero
                                                }`}
                                            >
                                                <strong>{estoque.pedido}</strong>
                                            </td>
                                            <td className={styles.tdAcoes}>
                                                <Button
                                                    size="sm"
                                                    variant="warning"
                                                    onClick={() => handleEditarMinimo(estoque)}
                                                    title="Editar estoque mínimo"
                                                >
                                                    <FontAwesomeIcon icon={faPencil} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ));
                                })}
                            </tbody>
                        </Table>
                    </div>
                )}
            </div>

            {/* Modal Editar Estoque Mínimo */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FontAwesomeIcon icon={faEdit} style={{ marginRight: '0.5rem' }} />
                        Editar Estoque Mínimo
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>
                                <strong>Item:</strong> {editingEstoque?.item?.nome}
                            </Form.Label>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>
                                <strong>Estoque Atual:</strong> {editingEstoque?.quantidade_atual}
                            </Form.Label>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Quantidade Mínima *</Form.Label>
                            <Form.Control
                                type="number"
                                step="0.01"
                                value={novoMinimo}
                                onChange={(e) => setNovoMinimo(e.target.value)}
                                placeholder="Digite a quantidade mínima"
                                required
                            />
                        </Form.Group>
                        {editingEstoque && (
                            <Form.Group className="mb-3">
                                <Form.Label className={styles.pedidoPreview}>
                                    <strong>Pedido (calculado automaticamente):</strong>{' '}
                                    {Math.max(parseFloat(novoMinimo || '0') - editingEstoque.quantidade_atual, 0)}
                                </Form.Label>
                            </Form.Group>
                        )}
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={editingLoading}>
                        Cancelar
                    </Button>
                    <Button variant="primary" onClick={handleSalvarMinimo} disabled={editingLoading || !novoMinimo}>
                        {editingLoading ? 'Salvando...' : 'Salvar'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default FornecedorDetalhes;
