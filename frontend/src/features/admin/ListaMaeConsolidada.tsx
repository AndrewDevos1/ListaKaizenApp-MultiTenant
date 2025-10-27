/**
 * Lista Mãe Consolidada - Visão do Administrador
 *
 * Exibe todos os itens de uma lista com:
 * - Última quantidade reportada
 * - Estoque mínimo
 * - Pedido calculado automaticamente
 * - Informações de quem submeteu e quando
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Button, Table, Alert, Row, Col, Badge, Spinner, Modal, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft,
    faDownload,
    faFileExport,
    faExclamationTriangle,
    faCheckCircle,
    faClipboardList,
    faChevronRight,
    faPlus,
    faEdit,
    faTrash
} from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import styles from './ListaMaeConsolidada.module.css';

// Interfaces
interface ItemConsolidado {
    estoque_id: number;
    item_id: number;
    item_nome: string;
    item_unidade: string;
    fornecedor_id: number;
    fornecedor_nome: string;
    quantidade_minima: number;
    quantidade_atual: number;
    pedido: number;
    data_ultima_submissao: string | null;
    usuario_ultima_submissao: {
        id: number;
        nome: string;
    } | null;
}

interface ListaMae {
    lista_id: number;
    lista_nome: string;
    lista_descricao: string;
    data_criacao: string;
    itens: ItemConsolidado[];
    total_itens: number;
    total_em_falta: number;
    total_pedido: number;
}

const ListaMaeConsolidada: React.FC = () => {
    const { listaId } = useParams<{ listaId: string }>();
    const navigate = useNavigate();

    const [listaMae, setListaMae] = useState<ListaMae | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterByPedido, setFilterByPedido] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ItemConsolidado | null>(null);
    const [editQuantidade, setEditQuantidade] = useState('');
    const [itens, setItens] = useState<any[]>([]);
    const [itemSelecionado, setItemSelecionado] = useState<number | null>(null);
    const [quantidadeMinima, setQuantidadeMinima] = useState('');

    useEffect(() => {
        if (listaId) {
            fetchListaMae();
            fetchItens();
        }
    }, [listaId]);

    const fetchListaMae = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get<ListaMae>(`/admin/listas/${listaId}/lista-mae`);
            setListaMae(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao carregar lista mãe consolidada');
            console.error('Erro:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchItens = async () => {
        try {
            const response = await api.get(`/api/v1/items`);
            setItens(response.data);
        } catch (err) {
            console.error('Erro ao carregar itens:', err);
        }
    };

    const handleAdicionarItem = async () => {
        if (!itemSelecionado || !quantidadeMinima || !listaId) {
            setError('Selecione um item e defina a quantidade mínima');
            return;
        }

        try {
            await api.post(`/admin/listas/${listaId}/itens`, {
                itens: [{ item_id: itemSelecionado, quantidade_minima: parseFloat(quantidadeMinima) }]
            });
            setShowAddModal(false);
            setItemSelecionado(null);
            setQuantidadeMinima('');
            fetchListaMae();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao adicionar item');
        }
    };

    const handleEditarQuantidade = async () => {
        if (!selectedItem || !editQuantidade || !listaId) return;

        try {
            await api.put(`/api/v1/estoque/${selectedItem.estoque_id}`, {
                quantidade_atual: parseFloat(editQuantidade)
            });
            setShowEditModal(false);
            setSelectedItem(null);
            setEditQuantidade('');
            fetchListaMae();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao editar item');
        }
    };

    const handleDeletarItem = async (listaIdParam: number, itemId: number) => {
        if (!window.confirm('Tem certeza que deseja remover este item?')) return;

        try {
            await api.delete(`/admin/listas/${listaIdParam}/itens/${itemId}`);
            fetchListaMae();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao remover item');
        }
    };

    // Filtrar itens
    const filteredItems = useMemo(() => {
        if (!listaMae) return [];

        let filtered = listaMae.itens.filter(item =>
            item.item_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.fornecedor_nome.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (filterByPedido) {
            filtered = filtered.filter(item => item.pedido > 0);
        }

        return filtered;
    }, [listaMae, searchTerm, filterByPedido]);

    // Formatar data
    const formatarData = (data: string | null): string => {
        if (!data) return '-';
        try {
            return new Date(data).toLocaleString('pt-BR');
        } catch {
            return '-';
        }
    };

    // Exportar para texto (para copiar ao WhatsApp, etc)
    const handleExport = () => {
        if (!listaMae) return;

        const itemsParaExportar = filterByPedido
            ? filteredItems.filter(item => item.pedido > 0)
            : filteredItems;

        let texto = `LISTA: ${listaMae.lista_nome}\n`;
        texto += `Data: ${new Date().toLocaleString('pt-BR')}\n`;
        texto += `\nITENS PARA PEDIR:\n`;
        texto += `${'='.repeat(50)}\n\n`;

        // Agrupar por fornecedor
        const porFornecedor = itemsParaExportar.reduce((acc, item) => {
            const fornecedor = item.fornecedor_nome || 'Sem fornecedor';
            if (!acc[fornecedor]) {
                acc[fornecedor] = [];
            }
            acc[fornecedor].push(item);
            return acc;
        }, {} as Record<string, ItemConsolidado[]>);

        Object.entries(porFornecedor).forEach(([fornecedor, itens]) => {
            texto += `[FORNECEDOR] ${fornecedor}:\n`;
            itens.forEach(item => {
                texto += `  • ${item.item_nome} - ${item.pedido.toFixed(2)} ${item.item_unidade}\n`;
            });
            texto += `\n`;
        });

        // Copiar para clipboard
        navigator.clipboard.writeText(texto).then(() => {
            alert('[OK] Conteudo copiado para a area de transferencia!');
        });
    };

    if (loading) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Carregando...</span>
                </Spinner>
            </Container>
        );
    }

    if (!listaMae) {
        return (
            <Container className={`py-4 ${styles.container}`}>
                <Alert variant="danger">
                    <FontAwesomeIcon icon={faExclamationTriangle} /> Lista não encontrada
                </Alert>
                <Button onClick={() => navigate('/admin/listas-compras')} variant="outline-secondary">
                    <FontAwesomeIcon icon={faArrowLeft} /> Voltar
                </Button>
            </Container>
        );
    }

    return (
        <Container fluid className={`py-4 ${styles.container}`}>
            {/* Header */}
            <div className={styles.header}>
                <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => navigate('/admin/listas-compras')}
                    className="mb-3"
                >
                    <FontAwesomeIcon icon={faArrowLeft} /> Voltar
                </Button>

                <h1 className={styles.title}>
                    <FontAwesomeIcon icon={faClipboardList} /> Lista Mãe Consolidada
                </h1>
                <h2 className={styles.subtitle}>{listaMae.lista_nome}</h2>
                {listaMae.lista_descricao && (
                    <p className="text-muted">{listaMae.lista_descricao}</p>
                )}
            </div>

            {/* Alertas */}
            {error && (
                <Alert variant="danger" onClose={() => setError(null)} dismissible>
                    <FontAwesomeIcon icon={faExclamationTriangle} /> {error}
                </Alert>
            )}

            {/* Resumo */}
            <Row className="mb-4 g-3">
                <Col md={3}>
                    <Card className={styles.statsCard}>
                        <Card.Body className="text-center">
                            <h3 className={styles.statValue}>{listaMae.total_itens}</h3>
                            <p className={styles.statLabel}>Total de Itens</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className={`${styles.statsCard} ${styles.alertCard}`}>
                        <Card.Body className="text-center">
                            <h3 className={styles.statValue}>{listaMae.total_em_falta}</h3>
                            <p className={styles.statLabel}>Itens em Falta</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className={`${styles.statsCard} ${styles.dangerCard}`}>
                        <Card.Body className="text-center">
                            <h3 className={styles.statValue}>{listaMae.total_pedido.toFixed(0)}</h3>
                            <p className={styles.statLabel}>Total de Pedido</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className={styles.statsCard}>
                        <Card.Body className="text-center">
                            <small className="text-muted">Criada em</small>
                            <p className={styles.statDate}>
                                {new Date(listaMae.data_criacao).toLocaleDateString('pt-BR')}
                            </p>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Controles */}
            <Row className="mb-4 g-2">
                <Col md={6}>
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Buscar por item ou fornecedor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </Col>
                <Col md={6} className={styles.buttonGroup}>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setShowAddModal(true)}
                    >
                        <FontAwesomeIcon icon={faPlus} /> Adicionar Item
                    </Button>
                    <Button
                        variant={filterByPedido ? 'danger' : 'outline-danger'}
                        size="sm"
                        onClick={() => setFilterByPedido(!filterByPedido)}
                    >
                        {filterByPedido ? 'Apenas Pedidos' : 'Ver Tudo'}
                    </Button>
                    <Button
                        variant="success"
                        size="sm"
                        onClick={handleExport}
                        disabled={filteredItems.filter(i => i.pedido > 0).length === 0}
                    >
                        <FontAwesomeIcon icon={faDownload} /> Exportar
                    </Button>
                </Col>
            </Row>

            {/* Tabela */}
            <div className={styles.tableWrapper}>
                <Table striped bordered hover responsive className={styles.table}>
                    <thead>
                        <tr className={styles.tableHeader}>
                            <th>Item</th>
                            <th className="text-center">Unidade</th>
                            <th className="text-center">Qtd. Mín.</th>
                            <th className="text-center">Qtd. Atual</th>
                            <th className="text-center">Pedido</th>
                            <th>Fornecedor</th>
                            <th>Última Submissão</th>
                            <th className="text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredItems.length > 0 ? filteredItems.map(item => (
                            <tr key={item.estoque_id} className={item.pedido > 0 ? styles.warningRow : ''}>
                                <td className={styles.itemCell}>
                                    <strong>{item.item_nome}</strong>
                                </td>
                                <td className="text-center">
                                    <Badge bg="light" text="dark">{item.item_unidade}</Badge>
                                </td>
                                <td className="text-center">
                                    <Badge bg="secondary">{item.quantidade_minima.toFixed(2)}</Badge>
                                </td>
                                <td className="text-center">
                                    {item.quantidade_atual.toFixed(2)}
                                </td>
                                <td className="text-center">
                                    {item.pedido > 0 ? (
                                        <Badge bg="danger" className={styles.pedidoBadge}>
                                            {item.pedido.toFixed(2)}
                                        </Badge>
                                    ) : (
                                        <Badge bg="success">0</Badge>
                                    )}
                                </td>
                                <td>
                                    <small>{item.fornecedor_nome || '-'}</small>
                                </td>
                                <td className={styles.submissaoCell}>
                                    {item.usuario_ultima_submissao ? (
                                        <small>
                                            <strong>{item.usuario_ultima_submissao.nome}</strong>
                                            <br />
                                            <span className="text-muted">
                                                {formatarData(item.data_ultima_submissao)}
                                            </span>
                                        </small>
                                    ) : (
                                        <small className="text-muted">-</small>
                                    )}
                                </td>
                                <td className="text-center">
                                    <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={() => {
                                            setSelectedItem(item);
                                            setEditQuantidade(item.quantidade_atual.toString());
                                            setShowEditModal(true);
                                        }}
                                        className="me-2"
                                    >
                                        <FontAwesomeIcon icon={faEdit} />
                                    </Button>
                                    <Button
                                        variant="outline-danger"
                                        size="sm"
                                        onClick={() => handleDeletarItem(parseInt(listaId || '0'), item.item_id)}
                                    >
                                        <FontAwesomeIcon icon={faTrash} />
                                    </Button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={8} className="text-center text-muted py-5">
                                    Nenhum item encontrado
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </div>

            {/* Ações finais */}
            <div className={styles.actions}>
                <Button variant="outline-secondary" onClick={() => navigate('/admin/listas-compras')}>
                    <FontAwesomeIcon icon={faArrowLeft} /> Voltar para Listas
                </Button>
            </div>

            {/* Modal Adicionar Item */}
            <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Adicionar Item na Lista</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Item</Form.Label>
                            <Form.Select
                                value={itemSelecionado || ''}
                                onChange={(e) => setItemSelecionado(parseInt(e.target.value))}
                            >
                                <option value="">Selecione um item</option>
                                {itens.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.nome}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Quantidade Mínima</Form.Label>
                            <Form.Control
                                type="number"
                                step="0.01"
                                value={quantidadeMinima}
                                onChange={(e) => setQuantidadeMinima(e.target.value)}
                                placeholder="0.00"
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                        Cancelar
                    </Button>
                    <Button variant="primary" onClick={handleAdicionarItem}>
                        Adicionar
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal Editar Quantidade Atual */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Editar Quantidade Atual</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedItem && (
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label>Item: <strong>{selectedItem.item_nome}</strong></Form.Label>
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Quantidade Atual</Form.Label>
                                <Form.Control
                                    type="number"
                                    step="0.01"
                                    value={editQuantidade}
                                    onChange={(e) => setEditQuantidade(e.target.value)}
                                    placeholder="0.00"
                                />
                            </Form.Group>
                        </Form>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                        Cancelar
                    </Button>
                    <Button variant="primary" onClick={handleEditarQuantidade}>
                        Salvar
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default ListaMaeConsolidada;
