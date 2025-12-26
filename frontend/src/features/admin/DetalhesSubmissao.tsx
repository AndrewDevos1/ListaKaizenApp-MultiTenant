import React, { useState, useEffect } from 'react';
import { Container, Button, Table, Alert, Badge, Card, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft,
    faCheckCircle,
    faTimesCircle,
    faClock,
    faBox,
    faUser,
    faCalendar,
    faCheck,
    faTimes,
    faEdit,
    faSave,
} from '@fortawesome/free-solid-svg-icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import styles from './DetalhesSubmissao.module.css';

interface Pedido {
    id: number;
    item_nome: string;
    quantidade_solicitada: number;
    unidade: string;
    status: 'PENDENTE' | 'APROVADO' | 'REJEITADO';
}

interface Submissao {
    id: number;
    lista_id: number;
    lista_nome: string;
    usuario_id: number;
    usuario_nome: string;
    data_submissao: string;
    status: 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'PARCIALMENTE_APROVADO';
    total_pedidos: number;
    pedidos: Pedido[];
}

const DetalhesSubmissao: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [submissao, setSubmissao] = useState<Submissao | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [modoEdicao, setModoEdicao] = useState(false);
    const [quantidadesEditadas, setQuantidadesEditadas] = useState<{ [key: number]: number }>({});

    useEffect(() => {
        fetchSubmissao();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchSubmissao = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await api.get(`/admin/submissoes`);
            const sub = response.data.find((s: Submissao) => s.id === Number(id));
            
            if (!sub) {
                setError('Submissão não encontrada');
                return;
            }
            
            setSubmissao(sub);
            
            // Inicializa quantidades editadas com valores atuais
            const qtds: { [key: number]: number } = {};
            sub.pedidos.forEach((p: Pedido) => {
                qtds[p.id] = p.quantidade_solicitada;
            });
            setQuantidadesEditadas(qtds);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao carregar submissão');
        } finally {
            setLoading(false);
        }
    };

    const handleAprovarTodos = async () => {
        if (!submissao) return;
        
        if (!window.confirm(`Aprovar TODOS os ${submissao.total_pedidos} itens desta submissão?`)) {
            return;
        }

        try {
            setActionLoading(true);
            setError('');
            await api.post(`/admin/submissoes/${submissao.id}/aprovar`);
            setSuccessMessage('✅ Submissão aprovada com sucesso!');
            setTimeout(() => navigate('/admin/submissoes'), 2000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao aprovar submissão');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRejeitarTodos = async () => {
        if (!submissao) return;
        
        if (!window.confirm(`Rejeitar TODOS os ${submissao.total_pedidos} itens desta submissão?`)) {
            return;
        }

        try {
            setActionLoading(true);
            setError('');
            await api.post(`/admin/submissoes/${submissao.id}/rejeitar`);
            setSuccessMessage('Submissão rejeitada.');
            setTimeout(() => navigate('/admin/submissoes'), 2000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao rejeitar submissão');
        } finally {
            setActionLoading(false);
        }
    };

    const handleAprovarSelecionados = async () => {
        if (selectedIds.length === 0) {
            setError('Selecione pelo menos um item');
            return;
        }

        try {
            setActionLoading(true);
            setError('');
            
            // Aprovar cada pedido selecionado
            await Promise.all(
                selectedIds.map(pedidoId => api.post(`/admin/pedidos/${pedidoId}/aprovar`))
            );
            
            setSuccessMessage(`✅ ${selectedIds.length} item(ns) aprovado(s)!`);
            setSelectedIds([]);
            setTimeout(() => fetchSubmissao(), 1000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao aprovar itens');
        } finally {
            setActionLoading(false);
        }
    };

    const toggleSelect = (pedidoId: number) => {
        if (selectedIds.includes(pedidoId)) {
            setSelectedIds(selectedIds.filter(id => id !== pedidoId));
        } else {
            setSelectedIds([...selectedIds, pedidoId]);
        }
    };

    const toggleSelectAll = () => {
        if (!submissao) return;
        
        if (selectedIds.length === submissao.pedidos.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(submissao.pedidos.map(p => p.id));
        }
    };

    const handleAlterarQuantidade = (pedidoId: number, novaQuantidade: number) => {
        setQuantidadesEditadas(prev => ({
            ...prev,
            [pedidoId]: novaQuantidade
        }));
    };

    const handleIniciarEdicao = () => {
        setModoEdicao(true);
        setError('');
        setSuccessMessage('');
    };

    const handleCancelarEdicao = () => {
        setModoEdicao(false);
        // Resetar para valores originais
        if (submissao) {
            const qtds: { [key: number]: number } = {};
            submissao.pedidos.forEach((p: Pedido) => {
                qtds[p.id] = p.quantidade_solicitada;
            });
            setQuantidadesEditadas(qtds);
        }
    };

    const handleSalvarEdicao = async () => {
        if (!submissao) return;

        try {
            setActionLoading(true);
            setError('');
            
            // Preparar payload
            const pedidos = Object.entries(quantidadesEditadas).map(([pedidoId, quantidade]) => ({
                pedido_id: Number(pedidoId),
                quantidade_solicitada: quantidade
            }));

            await api.put(`/admin/submissoes/${submissao.id}/editar`, { pedidos });
            
            setSuccessMessage('✅ Quantidades atualizadas com sucesso!');
            setModoEdicao(false);
            
            // Recarregar dados
            setTimeout(() => {
                fetchSubmissao();
                setSuccessMessage('');
            }, 1500);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao atualizar quantidades');
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDENTE':
                return <Badge bg="warning"><FontAwesomeIcon icon={faClock} /> Pendente</Badge>;
            case 'APROVADO':
                return <Badge bg="success"><FontAwesomeIcon icon={faCheckCircle} /> Aprovado</Badge>;
            case 'REJEITADO':
                return <Badge bg="danger"><FontAwesomeIcon icon={faTimesCircle} /> Rejeitado</Badge>;
            default:
                return <Badge bg="secondary">{status}</Badge>;
        }
    };

    const formatarData = (dataISO: string) => {
        const data = new Date(dataISO);
        return data.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <Container className="mt-4">
                <div className="text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Carregando...</span>
                    </div>
                </div>
            </Container>
        );
    }

    if (!submissao) {
        return (
            <Container className="mt-4">
                <Alert variant="danger">Submissão não encontrada</Alert>
                <Link to="/admin/submissoes">
                    <Button variant="secondary">
                        <FontAwesomeIcon icon={faArrowLeft} /> Voltar
                    </Button>
                </Link>
            </Container>
        );
    }

    return (
        <Container fluid className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h2>
                        <FontAwesomeIcon icon={faBox} className="me-2" />
                        Detalhes da Submissão #{submissao.id}
                    </h2>
                </div>
                <Link to="/admin/submissoes">
                    <Button variant="outline-secondary">
                        <FontAwesomeIcon icon={faArrowLeft} /> Voltar
                    </Button>
                </Link>
            </div>

            {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
            {successMessage && <Alert variant="success" dismissible onClose={() => setSuccessMessage('')}>{successMessage}</Alert>}

            {/* Card de Informações */}
            <Card className={styles.infoCard}>
                <Card.Body>
                    <div className={styles.infoGrid}>
                        <div>
                            <small className="text-muted">Lista</small>
                            <h5>{submissao.lista_nome}</h5>
                        </div>
                        <div>
                            <small className="text-muted">
                                <FontAwesomeIcon icon={faUser} /> Colaborador
                            </small>
                            <h5>{submissao.usuario_nome}</h5>
                        </div>
                        <div>
                            <small className="text-muted">
                                <FontAwesomeIcon icon={faCalendar} /> Data/Hora
                            </small>
                            <h5>{formatarData(submissao.data_submissao)}</h5>
                        </div>
                        <div>
                            <small className="text-muted">Status</small>
                            <h5>{getStatusBadge(submissao.status)}</h5>
                        </div>
                    </div>
                </Card.Body>
            </Card>

            {/* Ações em Massa */}
            {submissao.status === 'PENDENTE' && (
                <div className={styles.actions}>
                    {!modoEdicao ? (
                        <>
                            <Button
                                variant="warning"
                                onClick={handleIniciarEdicao}
                                disabled={actionLoading}
                            >
                                <FontAwesomeIcon icon={faEdit} /> Editar Quantidades
                            </Button>
                            <Button
                                variant="success"
                                onClick={handleAprovarTodos}
                                disabled={actionLoading}
                            >
                                <FontAwesomeIcon icon={faCheck} /> Aprovar Todos ({submissao.total_pedidos})
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleAprovarSelecionados}
                                disabled={actionLoading || selectedIds.length === 0}
                            >
                                <FontAwesomeIcon icon={faCheck} /> Aprovar Selecionados ({selectedIds.length})
                            </Button>
                            <Button
                                variant="danger"
                                onClick={handleRejeitarTodos}
                                disabled={actionLoading}
                            >
                                <FontAwesomeIcon icon={faTimes} /> Rejeitar Todos
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="success"
                                onClick={handleSalvarEdicao}
                                disabled={actionLoading}
                            >
                                <FontAwesomeIcon icon={faSave} /> Salvar Alterações
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={handleCancelarEdicao}
                                disabled={actionLoading}
                            >
                                <FontAwesomeIcon icon={faTimes} /> Cancelar
                            </Button>
                        </>
                    )}
                </div>
            )}

            {/* Tabela de Itens */}
            <Card className={styles.tableCard}>
                <Card.Header>
                    <h5>
                        Itens Solicitados ({submissao.total_pedidos})
                        {modoEdicao && <Badge bg="warning" className="ms-2">Modo Edição</Badge>}
                    </h5>
                </Card.Header>
                <Card.Body className="p-0">
                    <Table striped bordered hover responsive className="mb-0">
                        <thead>
                            <tr>
                                {submissao.status === 'PENDENTE' && !modoEdicao && (
                                    <th className="text-center">
                                        <Form.Check
                                            type="checkbox"
                                            checked={selectedIds.length === submissao.pedidos.length}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                )}
                                <th>#</th>
                                <th>Item</th>
                                <th className="text-center">Quantidade</th>
                                <th className="text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {submissao.pedidos.map((pedido, idx) => (
                                <tr key={pedido.id}>
                                    {submissao.status === 'PENDENTE' && !modoEdicao && (
                                        <td className="text-center">
                                            <Form.Check
                                                type="checkbox"
                                                checked={selectedIds.includes(pedido.id)}
                                                onChange={() => toggleSelect(pedido.id)}
                                                disabled={pedido.status !== 'PENDENTE'}
                                            />
                                        </td>
                                    )}
                                    <td>{idx + 1}</td>
                                    <td><strong>{pedido.item_nome}</strong></td>
                                    <td className="text-center">
                                        {modoEdicao ? (
                                            <Form.Control
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={quantidadesEditadas[pedido.id] || 0}
                                                onChange={(e) => handleAlterarQuantidade(
                                                    pedido.id,
                                                    parseFloat(e.target.value) || 0
                                                )}
                                                style={{ width: '120px', display: 'inline-block' }}
                                            />
                                        ) : (
                                            `${pedido.quantidade_solicitada}`
                                        )}
                                        {' '}{pedido.unidade}
                                    </td>
                                    <td className="text-center">
                                        {getStatusBadge(pedido.status)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default DetalhesSubmissao;
