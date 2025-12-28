import React, { useState, useEffect } from 'react';
import { Container, Button, Table, Alert, Badge, Card, Form, Modal } from 'react-bootstrap';
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
    faUndo,
    faCopy,
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import styles from './DetalhesSubmissao.module.css';

interface Pedido {
    id: number;
    item_id: number;
    item_nome: string;
    quantidade_solicitada: number;
    unidade: string;
    status: 'PENDENTE' | 'APROVADO' | 'REJEITADO';
}

interface ItemEstoque {
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
}

interface Submissao {
    id: number;
    lista_id: number;
    lista_nome: string;
    usuario_id: number;
    usuario_nome: string;
    data_submissao: string;
    criado_em?: string;
    status: 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'PARCIALMENTE_APROVADO';
    total_pedidos: number;
    pedidos: Pedido[];
}

const DetalhesSubmissao: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [submissao, setSubmissao] = useState<Submissao | null>(null);
    const [itensEstoque, setItensEstoque] = useState<ItemEstoque[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [modoEdicao, setModoEdicao] = useState(false);
    const [quantidadesAtuais, setQuantidadesAtuais] = useState<{ [key: number]: number }>({});
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [pedidosCriados, setPedidosCriados] = useState(0);
    const [modalMessage, setModalMessage] = useState('');
    const [modalType, setModalType] = useState<'success' | 'info' | 'warning'>('success');

    useEffect(() => {
        fetchSubmissao();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchSubmissao = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await api.get(`/admin/submissoes/${id}`);
            const submissaoData = response.data;
            setSubmissao(submissaoData);

            // Buscar dados do estoque da lista (para edição)
            try {
                const responseEstoque = await api.get(`/admin/listas/${submissaoData.lista_id}/estoque`);
                setItensEstoque(responseEstoque.data);
                
                // Inicializar quantidades atuais
                const qtds: { [key: number]: number } = {};
                responseEstoque.data.forEach((item: ItemEstoque) => {
                    qtds[item.item_id] = item.quantidade_atual;
                });
                setQuantidadesAtuais(qtds);
            } catch (err) {
                console.warn('Não foi possível carregar estoque para edição:', err);
            }
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
            
            // Mostrar modal de sucesso
            setModalType('success');
            setModalMessage(`${submissao.total_pedidos} pedido(s) aprovado(s)`);
            setPedidosCriados(submissao.total_pedidos);
            setShowSuccessModal(true);
            
            setTimeout(() => {
                setShowSuccessModal(false);
                navigate('/admin/submissoes');
            }, 2000);
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
            
            // Mostrar modal de aviso
            setModalType('warning');
            setModalMessage(`${submissao.total_pedidos} pedido(s) rejeitado(s)`);
            setPedidosCriados(submissao.total_pedidos);
            setShowSuccessModal(true);
            
            setTimeout(() => {
                setShowSuccessModal(false);
                navigate('/admin/submissoes');
            }, 2000);
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
            
            // Mostrar modal de sucesso
            setModalType('success');
            setModalMessage(`${selectedIds.length} item(ns) aprovado(s)`);
            setPedidosCriados(selectedIds.length);
            setShowSuccessModal(true);
            setSelectedIds([]);
            
            setTimeout(() => {
                setShowSuccessModal(false);
                fetchSubmissao();
            }, 2000);
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

    const handleAlterarQuantidade = (itemId: number, novaQuantidade: number) => {
        setQuantidadesAtuais(prev => ({
            ...prev,
            [itemId]: novaQuantidade
        }));
    };

    const calcularPedido = (itemId: number): number => {
        const item = itensEstoque.find(i => i.item_id === itemId);
        if (!item) return 0;
        
        const qtdAtual = quantidadesAtuais[itemId] || 0;
        const qtdMinima = item.quantidade_minima || 0;
        
        return Math.max(0, qtdMinima - qtdAtual);
    };

    const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const nextIndex = currentIndex + 1;
            const nextInput = document.getElementById(`qtd-input-${nextIndex}`);
            if (nextInput) {
                nextInput.focus();
            } else {
                document.getElementById('btn-salvar')?.focus();
            }
        }
    };

    const handleIniciarEdicao = () => {
        setModoEdicao(true);
        setError('');
        setSuccessMessage('');
    };

    const handleCancelarEdicao = () => {
        setModoEdicao(false);
        // Resetar para valores originais
        fetchSubmissao();
    };

    const handleSalvarEdicao = async () => {
        if (!submissao) return;

        try {
            setActionLoading(true);
            setError('');
            
            // Preparar payload (similar ao colaborador)
            const items = itensEstoque.map(item => ({
                item_id: item.item_id,
                quantidade_atual: quantidadesAtuais[item.item_id] || 0
            }));

            console.log('[DetalhesSubmissao] Enviando edição:', { submissao_id: submissao.id, items });
            
            const response = await api.put(`/admin/submissoes/${submissao.id}/editar`, { items });
            
            console.log('[DetalhesSubmissao] Resposta recebida:', response.data);
            
            // Mostrar modal de sucesso
            setModalType('info');
            setModalMessage('Submissão atualizada');
            setPedidosCriados(response.data.pedidos_criados || 0);
            setShowSuccessModal(true);
            setModoEdicao(false);
            
            // Recarregar dados após 2 segundos
            setTimeout(() => {
                fetchSubmissao();
                setShowSuccessModal(false);
            }, 2000);
        } catch (err: any) {
            console.error('[DetalhesSubmissao] Erro ao salvar:', err);
            setError(err.response?.data?.error || 'Erro ao atualizar quantidades');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReverterParaPendente = async () => {
        if (!submissao) return;
        
        if (!window.confirm(`Reverter submissão para PENDENTE? Todos os ${submissao.total_pedidos} pedidos voltarão ao status PENDENTE.`)) {
            return;
        }

        try {
            setActionLoading(true);
            setError('');
            await api.post(`/admin/submissoes/${submissao.id}/reverter`);
            
            // Mostrar modal de info
            setModalType('info');
            setModalMessage(`${submissao.total_pedidos} pedido(s) revertido(s) para PENDENTE`);
            setPedidosCriados(submissao.total_pedidos);
            setShowSuccessModal(true);
            
            setTimeout(() => {
                setShowSuccessModal(false);
                fetchSubmissao();
            }, 2000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao reverter submissão');
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

    // Formatar mensagem para WhatsApp/Copiar
    const formatarMensagem = () => {
        if (!submissao) return '';

        // Filtrar apenas itens com pedido > 0
        const itensFiltrados = itensEstoque.filter(item => item.pedido > 0);

        if (itensFiltrados.length === 0) {
            return 'Nenhum item com pedido para enviar.';
        }

        // Montar mensagem formatada
        let mensagem = `📋 *Solicitação ${submissao.status} - ${submissao.lista_nome}*\n\n`;
        mensagem += `*Lista:* ${submissao.lista_nome}\n`;
        mensagem += `*Status:* ${submissao.status}\n`;
        mensagem += `*Solicitante:* ${submissao.usuario_nome}\n`;
        mensagem += `*Data:* ${formatarData(submissao.criado_em || submissao.data_submissao)}\n\n`;
        mensagem += `*Itens Solicitados:*\n\n`;

        itensFiltrados.forEach(item => {
            mensagem += `• ${item.item.nome} - *Pedido: ${item.pedido} ${item.item.unidade_medida}*\n`;
        });

        mensagem += `\n*Total:* ${itensFiltrados.length} ${itensFiltrados.length === 1 ? 'item' : 'itens'}\n\n`;
        mensagem += `---\n`;
        mensagem += `Sistema Kaizen - Lista de Reposição`;

        return mensagem;
    };

    // Copiar mensagem para clipboard
    const handleCopiar = async () => {
        try {
            const mensagem = formatarMensagem();
            await navigator.clipboard.writeText(mensagem);
            setModalMessage('✅ Texto copiado para a área de transferência!');
            setModalType('success');
            setShowSuccessModal(true);
            setTimeout(() => setShowSuccessModal(false), 2000);
        } catch (err) {
            console.error('Erro ao copiar:', err);
            setModalMessage('❌ Erro ao copiar texto. Tente novamente.');
            setModalType('warning');
            setShowSuccessModal(true);
            setTimeout(() => setShowSuccessModal(false), 2000);
        }
    };

    // Abrir WhatsApp com mensagem
    const handleWhatsApp = () => {
        const mensagem = formatarMensagem();
        const mensagemCodificada = encodeURIComponent(mensagem);
        const urlWhatsApp = `https://wa.me/?text=${mensagemCodificada}`;
        window.open(urlWhatsApp, '_blank');
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

            {/* Modal de Sucesso/Avisos */}
            <Modal show={showSuccessModal} centered backdrop="static" keyboard={false}>
                <Modal.Body className="text-center py-5">
                    <div className="mb-4">
                        <FontAwesomeIcon 
                            icon={modalType === 'warning' ? faTimesCircle : faCheckCircle} 
                            size="4x" 
                            className={modalType === 'warning' ? 'text-danger' : 'text-success'}
                            style={{ animation: 'pulse 0.5s ease-in-out 4' }}
                        />
                    </div>
                    <h3 className={modalType === 'warning' ? 'text-danger mb-3' : 'text-success mb-3'}>
                        {modalType === 'warning' ? 'Submissão Rejeitada' : 
                         modalType === 'info' ? 'Submissão Atualizada!' : 
                         'Submissão Aprovada!'}
                    </h3>
                    <p className="mb-2">
                        <strong>{pedidosCriados} {modalMessage ? '' : 'pedido(s)'}</strong> 
                        {modalMessage || 'gerado(s) com sucesso'}
                    </p>
                    <p className="text-muted small mt-3">
                        {modalType === 'warning' ? 'Redirecionando...' : 'Recarregando dados...'}
                    </p>
                </Modal.Body>
            </Modal>

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
            {submissao.status === 'PENDENTE' ? (
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
                                id="btn-salvar"
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
            ) : (
                // Botões para submissão APROVADA ou REJEITADA
                <div className={styles.actions}>
                    <Button
                        variant="secondary"
                        onClick={handleCopiar}
                        disabled={actionLoading}
                        title="Copiar lista de itens"
                    >
                        <FontAwesomeIcon icon={faCopy} /> Copiar
                    </Button>
                    <Button
                        variant="success"
                        onClick={handleWhatsApp}
                        disabled={actionLoading}
                        title="Enviar lista via WhatsApp"
                        style={{ backgroundColor: '#25D366', borderColor: '#25D366' }}
                    >
                        <FontAwesomeIcon icon={faWhatsapp} /> Enviar via WhatsApp
                    </Button>
                    <Button
                        variant="info"
                        onClick={handleReverterParaPendente}
                        disabled={actionLoading}
                    >
                        <FontAwesomeIcon icon={faUndo} /> Reverter para Pendente
                    </Button>
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
                                <th className="text-center">Qtd Atual</th>
                                <th className="text-center">Qtd Mínima</th>
                                <th className="text-center">Pedido</th>
                                <th className="text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {modoEdicao ? (
                                // Modo Edição: mostra estoque editável
                                itensEstoque.map((item, idx) => {
                                    const pedido = calcularPedido(item.item_id);
                                    return (
                                        <tr key={item.item_id}>
                                            <td>{idx + 1}</td>
                                            <td><strong>{item.item.nome}</strong></td>
                                            <td className="text-center">
                                                <Form.Control
                                                    id={`qtd-input-${idx}`}
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={quantidadesAtuais[item.item_id] || 0}
                                                    onChange={(e) => handleAlterarQuantidade(
                                                        item.item_id,
                                                        parseFloat(e.target.value) || 0
                                                    )}
                                                    onKeyDown={(e) => handleKeyDown(e, idx)}
                                                    style={{ width: '120px', display: 'inline-block' }}
                                                    autoFocus={idx === 0}
                                                />
                                                <span className="ms-2">{item.item.unidade_medida}</span>
                                            </td>
                                            <td className="text-center">
                                                {item.quantidade_minima} {item.item.unidade_medida}
                                            </td>
                                            <td className="text-center">
                                                <Badge bg={pedido > 0 ? 'warning' : 'success'}>
                                                    {pedido.toFixed(2)} {item.item.unidade_medida}
                                                </Badge>
                                            </td>
                                            <td className="text-center">
                                                <Badge bg={pedido > 0 ? 'warning' : 'success'}>
                                                    {pedido > 0 ? 'NECESSÁRIO' : 'OK'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                // Modo Visualização: mostra pedidos da submissão
                                submissao.pedidos.map((pedido, idx) => (
                                    <tr key={pedido.id}>
                                        {submissao.status === 'PENDENTE' && (
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
                                        <td className="text-center" colSpan={2}>
                                            <em className="text-muted">Clique em "Editar" para ver</em>
                                        </td>
                                        <td className="text-center">
                                            <strong>{pedido.quantidade_solicitada} {pedido.unidade}</strong>
                                        </td>
                                        <td className="text-center">
                                            {getStatusBadge(pedido.status)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                    {modoEdicao && (
                        <div className="p-3 bg-light border-top">
                            <small className="text-muted">
                                💡 <strong>Dica:</strong> Pressione <kbd>Enter</kbd> para ir ao próximo item
                            </small>
                        </div>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
};

export default DetalhesSubmissao;
