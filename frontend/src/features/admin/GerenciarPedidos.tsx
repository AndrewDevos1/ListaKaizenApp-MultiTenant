import React, { useState, useEffect } from 'react';
import { Container, Button, Table, Alert, Badge, Form, ButtonGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCheck,
    faTimes,
    faBox,
    faArrowLeft,
    faCheckCircle,
    faTimesCircle,
    faClock,
} from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import api from '../../services/api';
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
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDENTE');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchPedidos();
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
                                    {statusFilter === 'PENDENTE' && <th className="text-center">Ações</th>}
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
                                        <td>{new Date(pedido.data_pedido).toLocaleString('pt-BR')}</td>
                                        <td>{getStatusBadge(pedido.status)}</td>
                                        {statusFilter === 'PENDENTE' && (
                                            <td className="text-center">
                                                <Button
                                                    variant="success"
                                                    size="sm"
                                                    onClick={() => handleAprovar(pedido.id)}
                                                    disabled={actionLoading}
                                                    style={{ marginRight: '0.5rem' }}
                                                >
                                                    <FontAwesomeIcon icon={faCheck} />
                                                </Button>
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() => handleRejeitar(pedido.id)}
                                                    disabled={actionLoading}
                                                >
                                                    <FontAwesomeIcon icon={faTimes} />
                                                </Button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </div>
            </Container>
        </div>
    );
};

export default GerenciarPedidos;
