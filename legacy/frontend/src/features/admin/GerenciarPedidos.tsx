import React, { useState, useEffect } from 'react';
import { Container, Button, Table, Alert, Badge, Form, ButtonGroup, Modal } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { formatarDataBrasilia } from '../../utils/dateFormatter';
import {
    faCheck,
    faTimes,
    faBox,
    faArrowLeft,
    faCheckCircle,
    faTimesCircle,
    faClock,
    faEye,
    faEdit,
} from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import styles from './GerenciarPedidos.module.css';

interface Pedido {
    id: number;
    item: {
        id: number;
        nome: string;
        unidade_medida: string;
    };
    fornecedor: {
        id: number;
        nome: string;
    };
    quantidade_solicitada: number;
    status: 'PENDENTE' | 'APROVADO' | 'REJEITADO';
    usuario: {
        id: number;
        nome: string;
    };
    data_pedido: string;
}

type StatusFilter = 'TODOS' | 'PENDENTE' | 'APROVADO' | 'REJEITADO';

const GerenciarPedidos: React.FC = () => {
    const [pedidos, setPedidos] = useState<Pedido[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [statusFilter, setStatusFilter] = useLocalStorage<StatusFilter>('admin:pedidos:statusFilter', 'PENDENTE');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [actionLoading, setActionLoading] = useState(false);

    // Estados para modais
    const [showViewModal, setShowViewModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
    const [editQuantidade, setEditQuantidade] = useState(0);

    useEffect(() => {
        fetchPedidos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter]);

    const fetchPedidos = async () => {
        try {
            setLoading(true);
            setError('');

            const url = statusFilter === 'TODOS'
                ? '/admin/pedidos'
                : `/admin/pedidos?status=${statusFilter}`;

            const response = await api.get(url);
            setPedidos(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao carregar pedidos');
        } finally {
            setLoading(false);
        }
    };

    const handleAprovar = async (pedidoId: number) => {
        try {
            setActionLoading(true);
            await api.post(`/admin/pedidos/${pedidoId}/aprovar`);
            setSuccessMessage('Pedido aprovado com sucesso!');
            fetchPedidos();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao aprovar pedido');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRejeitar = async (pedidoId: number) => {
        if (!window.confirm('Tem certeza que deseja rejeitar este pedido?')) {
            return;
        }

        try {
            setActionLoading(true);
            await api.post(`/admin/pedidos/${pedidoId}/rejeitar`);
            setSuccessMessage('Pedido rejeitado com sucesso!');
            fetchPedidos();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao rejeitar pedido');
        } finally {
            setActionLoading(false);
        }
    };

    const handleAprovarLote = async () => {
        if (selectedIds.length === 0) {
            setError('Selecione pelo menos um pedido');
            return;
        }

        try {
            setActionLoading(true);
            await api.post('/admin/pedidos/aprovar-lote', {
                pedido_ids: selectedIds
            });
            setSuccessMessage(`${selectedIds.length} pedido(s) aprovado(s) com sucesso!`);
            setSelectedIds([]);
            fetchPedidos();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao aprovar pedidos');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRejeitarLote = async () => {
        if (selectedIds.length === 0) {
            setError('Selecione pelo menos um pedido');
            return;
        }

        if (!window.confirm(`Tem certeza que deseja rejeitar ${selectedIds.length} pedido(s)?`)) {
            return;
        }

        try {
            setActionLoading(false);
            await api.post('/admin/pedidos/rejeitar-lote', {
                pedido_ids: selectedIds
            });
            setSuccessMessage(`${selectedIds.length} pedido(s) rejeitado(s) com sucesso!`);
            setSelectedIds([]);
            fetchPedidos();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao rejeitar pedidos');
        } finally {
            setActionLoading(false);
        }
    };

    const handleToggleSelection = (pedidoId: number) => {
        setSelectedIds(prev => {
            if (prev.includes(pedidoId)) {
                return prev.filter(id => id !== pedidoId);
            } else {
                return [...prev, pedidoId];
            }
        });
    };

    const handleSelectAll = () => {
        if (selectedIds.length === pedidos.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(pedidos.map(p => p.id));
        }
    };

    const handleViewPedido = (pedido: Pedido) => {
        setSelectedPedido(pedido);
        setShowViewModal(true);
    };

    const handleOpenEditModal = (pedido: Pedido) => {
        setSelectedPedido(pedido);
        setEditQuantidade(pedido.quantidade_solicitada);
        setShowEditModal(true);
    };

    const handleCloseViewModal = () => {
        setShowViewModal(false);
        setSelectedPedido(null);
    };

    const handleCloseEditModal = () => {
        setShowEditModal(false);
        setSelectedPedido(null);
        setEditQuantidade(0);
    };

    const handleSaveEdit = async () => {
        if (!selectedPedido) return;

        if (editQuantidade <= 0) {
            setError('Quantidade deve ser maior que zero');
            return;
        }

        try {
            setActionLoading(true);
            await api.put(`/admin/pedidos/${selectedPedido.id}/editar`, {
                quantidade_solicitada: editQuantidade
            });

            setSuccessMessage('Pedido editado com sucesso!');
            handleCloseEditModal();
            fetchPedidos();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao editar pedido');
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDENTE':
                return <Badge bg="warning" text="dark">Pendente</Badge>;
            case 'APROVADO':
                return <Badge bg="success">Aprovado</Badge>;
            case 'REJEITADO':
                return <Badge bg="danger">Rejeitado</Badge>;
            default:
                return <Badge bg="secondary">{status}</Badge>;
        }
    };

    const pedidosPendentes = pedidos.filter(p => p.status === 'PENDENTE');

    return (
        <div className={styles.pageWrapper}>
            <Container fluid>
                {/* Header */}
                <div className={styles.pageHeader}>
                    <div>
                        <Link to="/admin" className={styles.backButton}>
                            <FontAwesomeIcon icon={faArrowLeft} />
                            Voltar ao Dashboard
                        </Link>
                        <h1 className={styles.pageTitle}>
                            <FontAwesomeIcon icon={faBox} style={{ marginRight: '1rem', color: '#3498db' }} />
                            Gerenciar Pedidos
                        </h1>
                        <p className={styles.pageSubtitle}>
                            Aprovar ou rejeitar pedidos de reposição de estoque
                        </p>
                    </div>
                </div>

                {/* Mensagens */}
                {error && (
                    <Alert variant="danger" onClose={() => setError('')} dismissible>
                        {error}
                    </Alert>
                )}
                {successMessage && (
                    <Alert variant="success" onClose={() => setSuccessMessage('')} dismissible>
                        <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: '0.5rem' }} />
                        {successMessage}
                    </Alert>
                )}

                {/* Filtros de Status */}
                <div className={styles.filterBar}>
                    <ButtonGroup>
                        <Button
                            variant={statusFilter === 'PENDENTE' ? 'warning' : 'outline-warning'}
                            onClick={() => setStatusFilter('PENDENTE')}
                        >
                            <FontAwesomeIcon icon={faClock} style={{ marginRight: '0.5rem' }} />
                            Pendentes
                        </Button>
                        <Button
                            variant={statusFilter === 'TODOS' ? 'primary' : 'outline-primary'}
                            onClick={() => setStatusFilter('TODOS')}
                        >
                            Todos
                        </Button>
                        <Button
                            variant={statusFilter === 'APROVADO' ? 'success' : 'outline-success'}
                            onClick={() => setStatusFilter('APROVADO')}
                        >
                            <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: '0.5rem' }} />
                            Aprovados
                        </Button>
                        <Button
                            variant={statusFilter === 'REJEITADO' ? 'danger' : 'outline-danger'}
                            onClick={() => setStatusFilter('REJEITADO')}
                        >
                            <FontAwesomeIcon icon={faTimesCircle} style={{ marginRight: '0.5rem' }} />
                            Rejeitados
                        </Button>
                    </ButtonGroup>
                </div>

                {/* Ações em Lote */}
                {statusFilter === 'PENDENTE' && pedidosPendentes.length > 0 && (
                    <div className={styles.batchActions}>
                        <Form.Check
                            type="checkbox"
                            label={<strong>Selecionar Todos</strong>}
                            checked={selectedIds.length === pedidos.length && pedidos.length > 0}
                            onChange={handleSelectAll}
                        />
                        {selectedIds.length > 0 && (
                            <div style={{ display: 'flex', gap: '1rem', marginLeft: '1rem' }}>
                                <Button
                                    variant="success"
                                    size="sm"
                                    onClick={handleAprovarLote}
                                    disabled={actionLoading}
                                >
                                    <FontAwesomeIcon icon={faCheck} style={{ marginRight: '0.5rem' }} />
                                    Aprovar Selecionados ({selectedIds.length})
                                </Button>
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={handleRejeitarLote}
                                    disabled={actionLoading}
                                >
                                    <FontAwesomeIcon icon={faTimes} style={{ marginRight: '0.5rem' }} />
                                    Rejeitar Selecionados ({selectedIds.length})
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Tabela de Pedidos */}
                <div className={styles.tableContainer}>
                    {loading ? (
                        <div className="text-center p-5">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Carregando...</span>
                            </div>
                        </div>
                    ) : pedidos.length === 0 ? (
                        <Alert variant="info">
                            Nenhum pedido encontrado com o filtro selecionado.
                        </Alert>
                    ) : (
                        <Table striped bordered hover responsive>
                            <thead>
                                <tr>
                                    {statusFilter === 'PENDENTE' && <th style={{ width: '50px' }}></th>}
                                    <th>Item</th>
                                    <th>Fornecedor</th>
                                    <th>Quantidade</th>
                                    <th>Solicitante</th>
                                    <th>Data do Pedido</th>
                                    <th>Status</th>
                                    <th className="text-center" style={{ width: '150px' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pedidos.map((pedido) => (
                                    <tr key={pedido.id}>
                                        {statusFilter === 'PENDENTE' && (
                                            <td>
                                                <Form.Check
                                                    type="checkbox"
                                                    checked={selectedIds.includes(pedido.id)}
                                                    onChange={() => handleToggleSelection(pedido.id)}
                                                />
                                            </td>
                                        )}
                                        <td><strong>{pedido.item?.nome || 'N/A'}</strong></td>
                                        <td>{pedido.fornecedor?.nome || 'N/A'}</td>
                                        <td>{pedido.quantidade_solicitada} {pedido.item?.unidade_medida || ''}</td>
                                        <td>{pedido.usuario?.nome || 'N/A'}</td>
                                        <td>{formatarDataBrasilia(pedido.data_pedido)}</td>
                                        <td>{getStatusBadge(pedido.status)}</td>
                                        <td className="text-center">
                                            <Button
                                                variant="info"
                                                size="sm"
                                                onClick={() => handleViewPedido(pedido)}
                                                style={{ marginRight: '0.5rem' }}
                                                title="Visualizar detalhes"
                                            >
                                                <FontAwesomeIcon icon={faEye} />
                                            </Button>
                                            {pedido.status === 'PENDENTE' && (
                                                <>
                                                    <Button
                                                        variant="warning"
                                                        size="sm"
                                                        onClick={() => handleOpenEditModal(pedido)}
                                                        disabled={actionLoading}
                                                        style={{ marginRight: '0.5rem' }}
                                                        title="Editar quantidade"
                                                    >
                                                        <FontAwesomeIcon icon={faEdit} />
                                                    </Button>
                                                    <Button
                                                        variant="success"
                                                        size="sm"
                                                        onClick={() => handleAprovar(pedido.id)}
                                                        disabled={actionLoading}
                                                        style={{ marginRight: '0.5rem' }}
                                                        title="Aprovar pedido"
                                                    >
                                                        <FontAwesomeIcon icon={faCheck} />
                                                    </Button>
                                                    <Button
                                                        variant="danger"
                                                        size="sm"
                                                        onClick={() => handleRejeitar(pedido.id)}
                                                        disabled={actionLoading}
                                                        title="Rejeitar pedido"
                                                    >
                                                        <FontAwesomeIcon icon={faTimes} />
                                                    </Button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </div>

                {/* Modal de Visualização */}
                <Modal show={showViewModal} onHide={handleCloseViewModal} centered>
                    <Modal.Header closeButton>
                        <Modal.Title>
                            <FontAwesomeIcon icon={faEye} style={{ marginRight: '0.5rem', color: '#17a2b8' }} />
                            Detalhes do Pedido
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {selectedPedido && (
                            <div>
                                <p><strong>Item:</strong> {selectedPedido.item?.nome || 'N/A'}</p>
                                <p><strong>Fornecedor:</strong> {selectedPedido.fornecedor?.nome || 'N/A'}</p>
                                <p><strong>Quantidade Solicitada:</strong> {selectedPedido.quantidade_solicitada} {selectedPedido.item?.unidade_medida || ''}</p>
                                <p><strong>Solicitado por:</strong> {selectedPedido.usuario?.nome || 'N/A'}</p>
                                <p><strong>Data do Pedido:</strong> {formatarDataBrasilia(selectedPedido.data_pedido)}</p>
                                <p><strong>Status:</strong> {getStatusBadge(selectedPedido.status)}</p>
                            </div>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseViewModal}>
                            Fechar
                        </Button>
                    </Modal.Footer>
                </Modal>

                {/* Modal de Edição */}
                <Modal show={showEditModal} onHide={handleCloseEditModal} centered>
                    <Modal.Header closeButton>
                        <Modal.Title>
                            <FontAwesomeIcon icon={faEdit} style={{ marginRight: '0.5rem', color: '#ffc107' }} />
                            Editar Pedido
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {selectedPedido && (
                            <div>
                                <Alert variant="info">
                                    <strong>Item:</strong> {selectedPedido.item?.nome || 'N/A'}<br />
                                    <strong>Fornecedor:</strong> {selectedPedido.fornecedor?.nome || 'N/A'}
                                </Alert>

                                <Form.Group>
                                    <Form.Label><strong>Quantidade Solicitada ({selectedPedido.item?.unidade_medida || ''})</strong></Form.Label>
                                    <Form.Control
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={editQuantidade}
                                        onChange={(e) => setEditQuantidade(parseFloat(e.target.value))}
                                        autoFocus
                                    />
                                    <Form.Text className="text-muted">
                                        Quantidade original: {selectedPedido.quantidade_solicitada}
                                    </Form.Text>
                                </Form.Group>
                            </div>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseEditModal} disabled={actionLoading}>
                            Cancelar
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleSaveEdit}
                            disabled={actionLoading}
                        >
                            {actionLoading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm" style={{ marginRight: '0.5rem' }} />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faCheck} style={{ marginRight: '0.5rem' }} />
                                    Salvar Alterações
                                </>
                            )}
                        </Button>
                    </Modal.Footer>
                </Modal>
            </Container>
        </div>
    );
};

export default GerenciarPedidos;
