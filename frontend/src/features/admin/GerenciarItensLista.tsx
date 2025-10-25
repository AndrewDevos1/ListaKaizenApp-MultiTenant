/**
 * Gerenciar Itens da Lista
 *
 * Permite ao admin adicionar/remover itens de estoque de uma lista
 * e definir a quantidade mínima para cada item
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Button, Table, Alert, Row, Col, Form, Modal, Badge, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft,
    faTrash,
    faPlus,
    faCheckCircle,
    faExclamationTriangle,
    faListAlt,
    faSave
} from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import styles from './GerenciarItensLista.module.css';

// Interfaces
interface Item {
    id: number;
    nome: string;
    unidade_medida: string;
    fornecedor_id: number;
}

interface EstoqueItem {
    estoque_id: number;
    item_id: number;
    item_nome: string;
    unidade_medida: string;
    quantidade_minima: number;
    quantidade_atual: number;
}

interface ListaInfo {
    id: number;
    nome: string;
    descricao: string;
}

const GerenciarItensLista: React.FC = () => {
    const { listaId } = useParams<{ listaId: string }>();
    const navigate = useNavigate();

    // Estados principais
    const [lista, setLista] = useState<ListaInfo | null>(null);
    const [itensDisponiveis, setItensDisponiveis] = useState<Item[]>([]);
    const [itensAdicionados, setItensAdicionados] = useState<EstoqueItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Map<number, number>>(new Map()); // item_id -> qtd_minima
    const [searchTerm, setSearchTerm] = useState('');

    // Carregar dados
    useEffect(() => {
        if (listaId) {
            fetchDados();
        }
    }, [listaId]);

    const fetchDados = async () => {
        try {
            setLoading(true);
            setError(null);

            const [listasRes, itensRes, itensAdicionadosRes] = await Promise.all([
                api.get(`/v1/listas/${listaId}`),
                api.get('/v1/items'),
                api.get(`/admin/listas/${listaId}/itens`)
            ]);

            setLista(listasRes.data);
            setItensDisponiveis(itensRes.data);
            setItensAdicionados(itensAdicionadosRes.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao carregar dados');
            console.error('Erro:', err);
        } finally {
            setLoading(false);
        }
    };

    // Filtrar itens disponíveis que não foram adicionados
    const itensNaoAdicionados = useMemo(() => {
        const idsAdicionados = new Set(itensAdicionados.map(i => i.item_id));
        return itensDisponiveis.filter(item => !idsAdicionados.has(item.id));
    }, [itensDisponiveis, itensAdicionados]);

    const filteredItems = useMemo(() => {
        return itensNaoAdicionados.filter(item =>
            item.nome.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [itensNaoAdicionados, searchTerm]);

    // Toggle seleção de item
    const toggleItemSelection = (itemId: number) => {
        const newSelected = new Map(selectedItems);

        if (newSelected.has(itemId)) {
            newSelected.delete(itemId);
        } else {
            newSelected.set(itemId, 10); // Default 10 como qtd mínima
        }

        setSelectedItems(newSelected);
    };

    // Atualizar quantidade mínima
    const atualizarQuantidadeMinima = (itemId: number, qtd: number) => {
        const newSelected = new Map(selectedItems);
        newSelected.set(itemId, Math.max(0, qtd));
        setSelectedItems(newSelected);
    };

    // Salvar itens selecionados
    const handleSalvar = async () => {
        if (selectedItems.size === 0) {
            setError('Selecione pelo menos um item');
            return;
        }

        try {
            setSaving(true);
            setError(null);

            const itens = Array.from(selectedItems, ([item_id, quantidade_minima]) => ({
                item_id,
                quantidade_minima
            }));

            const response = await api.post(`/admin/listas/${listaId}/itens`, {
                itens
            });

            setSuccess(response.data.message);
            setShowModal(false);
            setSelectedItems(new Map());

            // Recarrega itens
            const itensRes = await api.get(`/admin/listas/${listaId}/itens`);
            setItensAdicionados(itensRes.data);

            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao salvar itens');
            console.error('Erro:', err);
        } finally {
            setSaving(false);
        }
    };

    // Remover item
    const handleRemover = async (itemId: number) => {
        if (window.confirm('Tem certeza que deseja remover este item?')) {
            try {
                setError(null);
                await api.delete(`/admin/listas/${listaId}/itens/${itemId}`);
                setSuccess('Item removido com sucesso!');

                // Recarrega itens
                const itensRes = await api.get(`/admin/listas/${listaId}/itens`);
                setItensAdicionados(itensRes.data);

                setTimeout(() => setSuccess(null), 3000);
            } catch (err: any) {
                setError(err.response?.data?.error || 'Erro ao remover item');
                console.error('Erro:', err);
            }
        }
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
                    <FontAwesomeIcon icon={faListAlt} /> Gerenciar Itens
                </h1>
                {lista && (
                    <>
                        <h2 className={styles.subtitle}>{lista.nome}</h2>
                        {lista.descricao && <p className="text-muted">{lista.descricao}</p>}
                    </>
                )}
            </div>

            {/* Alertas */}
            {error && (
                <Alert variant="danger" onClose={() => setError(null)} dismissible>
                    <FontAwesomeIcon icon={faExclamationTriangle} /> {error}
                </Alert>
            )}

            {success && (
                <Alert variant="success" onClose={() => setSuccess(null)} dismissible>
                    <FontAwesomeIcon icon={faCheckCircle} /> {success}
                </Alert>
            )}

            {/* Estatísticas */}
            <Row className="mb-4 g-3">
                <Col md={6}>
                    <Card className={styles.statsCard}>
                        <Card.Body className="text-center">
                            <h3 className={styles.statValue}>{itensAdicionados.length}</h3>
                            <p className={styles.statLabel}>Itens na Lista</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={6}>
                    <Button
                        variant="success"
                        className="w-100 py-3"
                        onClick={() => setShowModal(true)}
                    >
                        <FontAwesomeIcon icon={faPlus} /> Adicionar Itens
                    </Button>
                </Col>
            </Row>

            {/* Tabela de Itens Adicionados */}
            <div className={styles.tableWrapper}>
                <h3 className={styles.sectionTitle}>Itens Adicionados</h3>

                {itensAdicionados.length > 0 ? (
                    <Table striped bordered hover responsive className={styles.table}>
                        <thead>
                            <tr className={styles.tableHeader}>
                                <th>Item</th>
                                <th className="text-center">Unidade</th>
                                <th className="text-center">Qtd. Mínima</th>
                                <th className="text-center">Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itensAdicionados.map((item) => (
                                <tr key={item.estoque_id}>
                                    <td className={styles.itemCell}>
                                        <strong>{item.item_nome}</strong>
                                    </td>
                                    <td className="text-center">
                                        <Badge bg="light" text="dark">{item.unidade_medida}</Badge>
                                    </td>
                                    <td className="text-center">
                                        <Badge bg="info">{item.quantidade_minima.toFixed(2)}</Badge>
                                    </td>
                                    <td className="text-center">
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => handleRemover(item.item_id)}
                                        >
                                            <FontAwesomeIcon icon={faTrash} />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                ) : (
                    <p className="text-muted text-center py-4">
                        Nenhum item adicionado. Clique em "Adicionar Itens" para começar.
                    </p>
                )}
            </div>

            {/* Modal de Adicionar Itens */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Adicionar Itens à Lista</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>Buscar Item</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="🔍 Digite o nome do item..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </Form.Group>

                    <div className={styles.itemsListModal}>
                        {filteredItems.length > 0 ? (
                            filteredItems.map((item) => (
                                <Card key={item.id} className={styles.itemCard}>
                                    <Card.Body>
                                        <Row className="align-items-center">
                                            <Col md={2}>
                                                <Form.Check
                                                    type="checkbox"
                                                    checked={selectedItems.has(item.id)}
                                                    onChange={() => toggleItemSelection(item.id)}
                                                    style={{ transform: 'scale(1.3)' }}
                                                />
                                            </Col>
                                            <Col md={6}>
                                                <strong>{item.nome}</strong>
                                                <br />
                                                <small className="text-muted">{item.unidade_medida}</small>
                                            </Col>
                                            <Col md={4}>
                                                {selectedItems.has(item.id) && (
                                                    <Form.Group>
                                                        <Form.Label className="small">Qtd. Mín.</Form.Label>
                                                        <Form.Control
                                                            type="number"
                                                            min="0"
                                                            value={selectedItems.get(item.id) || 0}
                                                            onChange={(e) =>
                                                                atualizarQuantidadeMinima(item.id, parseFloat(e.target.value))
                                                            }
                                                            size="sm"
                                                        />
                                                    </Form.Group>
                                                )}
                                            </Col>
                                        </Row>
                                    </Card.Body>
                                </Card>
                            ))
                        ) : (
                            <p className="text-muted text-center py-5">
                                {itensNaoAdicionados.length === 0
                                    ? 'Todos os itens já foram adicionados!'
                                    : 'Nenhum item encontrado'}
                            </p>
                        )}
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Cancelar
                    </Button>
                    <Button
                        variant="success"
                        onClick={handleSalvar}
                        disabled={saving || selectedItems.size === 0}
                    >
                        {saving ? (
                            <>
                                <Spinner as="span" animation="border" size="sm" className="me-2" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faSave} className="me-2" />
                                Salvar ({selectedItems.size})
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default GerenciarItensLista;
