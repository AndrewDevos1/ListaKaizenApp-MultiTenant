import React, { useState, useEffect } from 'react';
import { Container, Button, Table, Alert, Badge, Card, Form, Modal } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { formatarDataBrasilia } from '../../utils/dateFormatter';
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
    faListCheck,
    faFileLines,
    faLink,
} from '@fortawesome/free-solid-svg-icons';
import MergeModal from './MergeModal';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import styles from './DetalhesSubmissao.module.css';
import ResponsiveTable from '../../components/ResponsiveTable';
import { parseQuantidadeInput, parseSumExpression } from '../../utils/quantityParser';

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
    id: number | string;
    tipo?: 'lista_comum' | 'lista_rapida';
    lista_id: number;
    lista_nome: string;
    usuario_id: number;
    usuario_nome: string;
    data_submissao: string;
    criado_em?: string;
    status: 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'PARCIALMENTE_APROVADO' | 'APROVADA' | 'REJEITADA';
    arquivada?: boolean;
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
    const [desarquivando, setDesarquivando] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [modoEdicao, setModoEdicao] = useState(false);
    const [quantidadesAtuais, setQuantidadesAtuais] = useState<{ [key: number]: string }>({});
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showConverterModal, setShowConverterModal] = useState(false);
    const [showMergeModal, setShowMergeModal] = useState(false);
    const [incluirFornecedor, setIncluirFornecedor] = useState(true);
    const [incluirObservacoes, setIncluirObservacoes] = useState(true);
    const [convertendoChecklist, setConvertendoChecklist] = useState(false);
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
                const qtds: { [key: number]: string } = {};
                responseEstoque.data.forEach((item: ItemEstoque) => {
                    qtds[item.item_id] = String(item.quantidade_atual);
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


    const handleAprovarSelecionados = async () => {
        if (selectedIds.length === 0) {
            setError('Selecione pelo menos um item');
            return;
        }

        try {
            setActionLoading(true);
            setError('');

            await api.post('/admin/pedidos/aprovar-lote', { pedido_ids: selectedIds });

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

    const handleRejeitarSelecionados = async () => {
        if (selectedIds.length === 0) {
            setError('Selecione pelo menos um item');
            return;
        }

        if (!window.confirm(`Rejeitar ${selectedIds.length} item(ns) selecionado(s)?`)) {
            return;
        }

        try {
            setActionLoading(true);
            setError('');

            // Rejeitar cada pedido selecionado
            await Promise.all(
                selectedIds.map(pedidoId => api.post(`/admin/pedidos/${pedidoId}/rejeitar`))
            );

            // Mostrar modal de sucesso
            setModalType('warning');
            setModalMessage(`${selectedIds.length} item(ns) rejeitado(s)`);
            setPedidosCriados(selectedIds.length);
            setShowSuccessModal(true);
            setSelectedIds([]);

            setTimeout(() => {
                setShowSuccessModal(false);
                fetchSubmissao();
            }, 2000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao rejeitar itens');
        } finally {
            setActionLoading(false);
        }
    };

    const handleConverterParaChecklist = async () => {
        if (!submissao) return;

        try {
            setConvertendoChecklist(true);
            const response = await api.post(
                `/admin/submissoes/${submissao.id}/converter-checklist`,
                {
                    incluir_fornecedor: incluirFornecedor,
                    incluir_observacoes: incluirObservacoes
                }
            );

            setSuccessMessage('Checklist criado com sucesso!');
            setShowConverterModal(false);
            navigate(`/admin/checklists/${response.data.id}`);
        } catch (err: any) {
            console.error('Erro ao criar checklist:', err);
            setError(err.response?.data?.error || 'Erro ao criar checklist');
        } finally {
            setConvertendoChecklist(false);
        }
    };

    const toggleSelect = (pedidoId: number) => {
        if (selectedIds.includes(pedidoId)) {
            setSelectedIds(selectedIds.filter(id => id !== pedidoId));
        } else {
            setSelectedIds([...selectedIds, pedidoId]);
        }
    };

    const handleDesfazerRejeicao = async (pedidoId: number) => {
        try {
            setActionLoading(true);
            setError('');

            // Reverter pedido rejeitado para PENDENTE
            await api.post(`/admin/pedidos/${pedidoId}/reverter`);

            setModalType('success');
            setModalMessage('Item revertido para PENDENTE');
            setShowSuccessModal(true);

            setTimeout(() => {
                setShowSuccessModal(false);
                fetchSubmissao();
            }, 1500);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao reverter rejeição');
        } finally {
            setActionLoading(false);
        }
    };

    const toggleSelectAll = () => {
        if (!submissao) return;

        const pendentes = submissao.pedidos.filter((pedido) => pedido.status === 'PENDENTE');
        const pendentesIds = pendentes.map((pedido) => pedido.id);

        if (pendentesIds.length === 0) {
            return;
        }

        if (selectedIds.length === pendentesIds.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(pendentesIds);
        }
    };

    const handleAlterarQuantidade = (itemId: number, novaQuantidade: string) => {
        setQuantidadesAtuais(prev => ({
            ...prev,
            [itemId]: novaQuantidade
        }));
    };

    const calcularPedido = (itemId: number): number => {
        const item = itensEstoque.find(i => i.item_id === itemId);
        if (!item) return 0;
        
        const qtdAtualStr = quantidadesAtuais[itemId] ?? '';
        const qtdAtualParsed = parseQuantidadeInput(qtdAtualStr);
        const qtdAtual = qtdAtualParsed ?? 0;
        const qtdMinima = item.quantidade_minima || 0;
        
        return Math.max(0, qtdMinima - qtdAtual);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>, currentIndex: number, itemId: number) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const sum = parseSumExpression((e.currentTarget as HTMLInputElement).value);
            if (sum !== null) {
                handleAlterarQuantidade(itemId, String(sum));
            }
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
            const items = itensEstoque.map(item => {
                const qtdAtualStr = quantidadesAtuais[item.item_id] ?? '';
                const qtdAtualParsed = parseQuantidadeInput(qtdAtualStr);
                const quantidade_atual = qtdAtualParsed ?? 0;
                return {
                    item_id: item.item_id,
                    quantidade_atual
                };
            });

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

    const handleDesarquivar = async () => {
        if (!submissao) return;

        if (!window.confirm('Desarquivar esta submissão?')) {
            return;
        }

        try {
            setDesarquivando(true);
            setError('');
            await api.post(`/admin/submissoes/${submissao.id}/desarquivar`);
            localStorage.setItem('admin:submissoes:showArchived', JSON.stringify(false));
            navigate('/admin/submissoes');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao desarquivar submissão');
        } finally {
            setDesarquivando(false);
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

    const getStatusBadgeColor = (status: string) => {
        switch (status) {
            case 'APROVADO':
                return 'success';
            case 'REJEITADO':
                return 'danger';
            default:
                return 'warning';
        }
    };

    const formatarData = (dataISO: string) => {
        return formatarDataBrasilia(dataISO);
    };

    const calcularStatusSubmissao = (sub: Submissao) => {
        if (!sub.pedidos || sub.pedidos.length === 0) {
            return sub.status;
        }

        const hasPendente = sub.pedidos.some((pedido) => pedido.status === 'PENDENTE');
        if (hasPendente) {
            return 'PENDENTE';
        }

        const hasAprovado = sub.pedidos.some((pedido) => pedido.status === 'APROVADO');
        const hasRejeitado = sub.pedidos.some((pedido) => pedido.status === 'REJEITADO');

        if (hasAprovado && hasRejeitado) {
            return 'PARCIALMENTE_APROVADO';
        }
        if (hasAprovado) {
            return 'APROVADO';
        }
        if (hasRejeitado) {
            return 'REJEITADO';
        }

        return sub.status;
    };

    // Formatar mensagem para WhatsApp/Copiar
    const formatarMensagem = () => {
        if (!submissao) return '';

        // Filtrar apenas pedidos APROVADOS (não incluir rejeitados)
        const pedidosAprovados = submissao.pedidos.filter(pedido => pedido.status === 'APROVADO');

        if (pedidosAprovados.length === 0) {
            return 'Nenhum item aprovado para enviar.';
        }

        // Montar mensagem formatada (sem mostrar status "PARCIALMENTE_APROVADO")
        let mensagem = `📋 *Solicitação Aprovada - ${submissao.lista_nome}*\n\n`;
        mensagem += `*Lista:* ${submissao.lista_nome}\n`;
        mensagem += `*Solicitante:* ${submissao.usuario_nome}\n`;
        mensagem += `*Data:* ${formatarData(submissao.criado_em || submissao.data_submissao)}\n\n`;
        mensagem += `*Itens Aprovados:*\n\n`;

        pedidosAprovados.forEach(pedido => {
            mensagem += `• ${pedido.item_nome} - *Pedido: ${pedido.quantidade_solicitada} ${pedido.unidade}*\n`;
        });

        mensagem += `\n*Total:* ${pedidosAprovados.length} ${pedidosAprovados.length === 1 ? 'item' : 'itens'}\n\n`;
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

    // Formatar relatório completo (aprovados + rejeitados) para feedback da equipe
    const formatarRelatorioCompleto = () => {
        if (!submissao) return '';

        const aprovados = submissao.pedidos.filter(pedido => pedido.status === 'APROVADO');
        const rejeitados = submissao.pedidos.filter(pedido => pedido.status === 'REJEITADO');

        let mensagem = `📊 *Relatório Completo - ${submissao.lista_nome}*\n\n`;
        mensagem += `*Lista:* ${submissao.lista_nome}\n`;
        mensagem += `*Solicitante:* ${submissao.usuario_nome}\n`;
        mensagem += `*Data:* ${formatarData(submissao.criado_em || submissao.data_submissao)}\n\n`;

        mensagem += `✅ *Itens Aprovados (${aprovados.length}):*\n\n`;
        if (aprovados.length > 0) {
            aprovados.forEach(pedido => {
                mensagem += `• ${pedido.item_nome} - *${pedido.quantidade_solicitada} ${pedido.unidade}*\n`;
            });
        } else {
            mensagem += `_Nenhum item aprovado._\n`;
        }

        mensagem += `\n`;

        mensagem += `❌ *Itens Não Aceitos (${rejeitados.length}):*\n\n`;
        if (rejeitados.length > 0) {
            rejeitados.forEach(pedido => {
                mensagem += `• ${pedido.item_nome} - ${pedido.quantidade_solicitada} ${pedido.unidade}\n`;
            });
        } else {
            mensagem += `_Nenhum item rejeitado._\n`;
        }

        mensagem += `\n`;

        const total = aprovados.length + rejeitados.length;
        mensagem += `*Resumo:* ${aprovados.length}/${total} aprovado(s), ${rejeitados.length}/${total} não aceito(s)\n\n`;
        mensagem += `---\n`;
        mensagem += `Sistema Kaizen - Relatório de Submissão`;

        return mensagem;
    };

    // Copiar relatório completo para clipboard
    const handleCopiarRelatorio = async () => {
        try {
            const mensagem = formatarRelatorioCompleto();
            await navigator.clipboard.writeText(mensagem);
            setModalMessage('✅ Relatório copiado para a área de transferência!');
            setModalType('success');
            setShowSuccessModal(true);
            setTimeout(() => setShowSuccessModal(false), 2000);
        } catch (err) {
            console.error('Erro ao copiar relatório:', err);
            setModalMessage('❌ Erro ao copiar relatório. Tente novamente.');
            setModalType('warning');
            setShowSuccessModal(true);
            setTimeout(() => setShowSuccessModal(false), 2000);
        }
    };

    // Abrir WhatsApp com relatório completo
    const handleWhatsAppRelatorio = () => {
        const mensagem = formatarRelatorioCompleto();
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

    const isArquivada = Boolean(submissao.arquivada);
    const statusCalculado = calcularStatusSubmissao(submissao);
    const pedidosPendentes = submissao.pedidos.filter((pedido) => pedido.status === 'PENDENTE');
    const totalPendentes = pedidosPendentes.length;
    const todosPendentesSelecionados = totalPendentes > 0 && selectedIds.length === totalPendentes;
    const pedidosComIndex = submissao.pedidos.map((pedido, idx) => ({
        ...pedido,
        _index: idx + 1
    }));
    const pedidosAtivos = pedidosComIndex.filter(p => p.status !== 'REJEITADO');
    const pedidosRejeitados = pedidosComIndex.filter(p => p.status === 'REJEITADO');

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

            {/* Modal de Fundir Submissões */}
            {submissao && (
                <MergeModal
                    show={showMergeModal}
                    onHide={() => setShowMergeModal(false)}
                    submissaoAtualId={Number(submissao.id)}
                    listaAtualNome={submissao.lista_nome}
                />
            )}

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
                            <h5>{getStatusBadge(statusCalculado)}</h5>
                        </div>
                    </div>
                </Card.Body>
            </Card>

            {/* Ações em Massa */}
            {isArquivada ? (
                <div className={styles.actions}>
                    <Button
                        variant="outline-secondary"
                        onClick={handleDesarquivar}
                        disabled={desarquivando}
                    >
                        <FontAwesomeIcon icon={faBox} /> Desarquivar
                    </Button>
                </div>
            ) : statusCalculado === 'PENDENTE' ? (
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
                            {selectedIds.length > 0 && (
                                <>
                                    <Button
                                        variant="success"
                                        onClick={handleAprovarSelecionados}
                                        disabled={actionLoading}
                                    >
                                        <FontAwesomeIcon icon={faCheck} /> Aprovar Marcados ({selectedIds.length})
                                    </Button>
                                    <Button
                                        variant="danger"
                                        onClick={handleRejeitarSelecionados}
                                        disabled={actionLoading}
                                    >
                                        <FontAwesomeIcon icon={faTimes} /> Rejeitar Marcados ({selectedIds.length})
                                    </Button>
                                </>
                            )}
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
                    {submissao.status === 'APROVADO' && (
                        <Button
                            variant="success"
                            onClick={() => setShowConverterModal(true)}
                            className="d-flex align-items-center gap-2"
                        >
                            <FontAwesomeIcon icon={faListCheck} /> Converter para Checklist
                        </Button>
                    )}
                    {submissao.status === 'APROVADO' && (
                        <Button
                            variant="outline-primary"
                            onClick={() => setShowMergeModal(true)}
                            className="d-flex align-items-center gap-2"
                        >
                            <FontAwesomeIcon icon={faLink} /> Fundir com outras listas
                        </Button>
                    )}
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
                    {submissao.status !== 'PENDENTE' && (
                        <Button
                            variant="info"
                            onClick={handleReverterParaPendente}
                            disabled={actionLoading}
                        >
                            <FontAwesomeIcon icon={faUndo} /> Reverter para Pendente
                        </Button>
                    )}
                </div>
            )}

            {/* Tabela de Itens */}
            <Card className={styles.tableCard}>
                <Card.Header>
                    <div className={styles.tableHeaderRow}>
                        <h5>
                            Itens Solicitados ({pedidosAtivos.length})
                            {modoEdicao && <Badge bg="warning" className="ms-2">Modo Edição</Badge>}
                        </h5>
                    </div>
                </Card.Header>
                <Card.Body className="p-0">
                    {modoEdicao ? (
                        // Modo Edição: mantém tabela HTML editável
                        <Table striped bordered hover responsive className="mb-0">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Item</th>
                                    <th className="text-center">Qtd Atual</th>
                                    <th className="text-center">Qtd Mínima</th>
                                    <th className="text-center">Pedido</th>
                                    <th className="text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {itensEstoque.map((item, idx) => {
                                    const pedido = calcularPedido(item.item_id);
                                    return (
                                        <tr key={item.item_id}>
                                            <td>{idx + 1}</td>
                                            <td><strong>{item.item.nome}</strong></td>
                                            <td className="text-center">
                                                <Form.Control
                                                    id={`qtd-input-${idx}`}
                                                    type="text"
                                                    inputMode="text"
                                                    pattern="[0-9+.,]*"
                                                    value={quantidadesAtuais[item.item_id] ?? ''}
                                                    onChange={(e) => handleAlterarQuantidade(
                                                        item.item_id,
                                                        e.target.value
                                                    )}
                                                    onKeyDown={(e) => handleKeyDown(e, idx, item.item_id)}
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
                                })}
                            </tbody>
                        </Table>
                    ) : (
                        // Modo Visualização: usa ResponsiveTable
                        <ResponsiveTable
                            data={pedidosAtivos}
                            columns={[
                                { header: '#', accessor: '_index' },
                                { header: 'Item', accessor: 'item_nome' },
                                {
                                    header: 'Pedido',
                                    accessor: (p) => `${p.quantidade_solicitada} ${p.unidade}`,
                                    mobileLabel: 'Qtd'
                                },
                                {
                                    header: 'Status',
                                    accessor: (p) => (
                                        <Badge bg={getStatusBadgeColor(p.status)}>
                                            {p.status}
                                        </Badge>
                                    )
                                }
                            ]}
                            keyExtractor={(p) => p.id.toString()}
                            actionsHeader={
                                statusCalculado === 'PENDENTE' ? (
                                    <Form.Check
                                        type="checkbox"
                                        id="select-all-pending"
                                        aria-label="Selecionar todos os pendentes"
                                        title="Selecionar todos os pendentes"
                                        checked={todosPendentesSelecionados}
                                        onChange={toggleSelectAll}
                                        disabled={actionLoading || totalPendentes === 0}
                                        className={styles.selectAllToggle}
                                    />
                                ) : undefined
                            }
                            renderActions={(p) => {
                                if (statusCalculado === 'PENDENTE' && p.status === 'PENDENTE') {
                                    return (
                                        <Form.Check
                                            type="checkbox"
                                            checked={selectedIds.includes(p.id)}
                                            onChange={() => toggleSelect(p.id)}
                                            disabled={actionLoading}
                                        />
                                    );
                                }
                                return null;
                            }}
                            emptyMessage="Nenhum item solicitado."
                        />
                    )}
                    {modoEdicao && (
                        <div className="p-3 bg-light border-top">
                            <small className="text-muted">
                                💡 <strong>Dica:</strong> Pressione <kbd>Enter</kbd> para ir ao próximo item
                            </small>
                        </div>
                    )}
                </Card.Body>
            </Card>

            {/* Seção de Itens Não Aceitos */}
            {pedidosRejeitados.length > 0 && (
                <>
                    <Card className={`${styles.tableCard} mt-3`}>
                        <Card.Header className="bg-danger bg-opacity-10">
                            <h5 className="text-danger mb-0">
                                <FontAwesomeIcon icon={faTimesCircle} className="me-2" />
                                Itens Não Aceitos ({pedidosRejeitados.length})
                            </h5>
                        </Card.Header>
                        <Card.Body className="p-0">
                            <ResponsiveTable
                                data={pedidosRejeitados}
                                columns={[
                                    { header: '#', accessor: '_index' },
                                    { header: 'Item', accessor: 'item_nome' },
                                    {
                                        header: 'Pedido',
                                        accessor: (p) => `${p.quantidade_solicitada} ${p.unidade}`,
                                        mobileLabel: 'Qtd'
                                    },
                                    {
                                        header: 'Status',
                                        accessor: () => (
                                            <Badge bg="danger">REJEITADO</Badge>
                                        )
                                    }
                                ]}
                                keyExtractor={(p) => p.id.toString()}
                                renderActions={(p) => (
                                    <Button
                                        variant="outline-warning"
                                        size="sm"
                                        onClick={() => handleDesfazerRejeicao(p.id)}
                                        disabled={actionLoading}
                                        title="Reverter para PENDENTE"
                                    >
                                        <FontAwesomeIcon icon={faUndo} /> Desfazer
                                    </Button>
                                )}
                                emptyMessage=""
                            />
                        </Card.Body>
                    </Card>

                    {/* Botões de compartilhamento do relatório completo */}
                    <div className={styles.actions} style={{ marginTop: '1rem' }}>
                        <Button
                            variant="outline-secondary"
                            onClick={handleCopiarRelatorio}
                            disabled={actionLoading}
                            title="Copiar relatório completo com itens aprovados e rejeitados"
                        >
                            <FontAwesomeIcon icon={faFileLines} /> Copiar Relatório
                        </Button>
                        <Button
                            variant="outline-success"
                            onClick={handleWhatsAppRelatorio}
                            disabled={actionLoading}
                            title="Enviar relatório completo via WhatsApp"
                            style={{ borderColor: '#25D366', color: '#25D366' }}
                        >
                            <FontAwesomeIcon icon={faWhatsapp} /> Enviar Relatório
                        </Button>
                    </div>
                </>
            )}

            {/* Modal Converter para Checklist */}
            <Modal show={showConverterModal} onHide={() => setShowConverterModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Converter para Checklist</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Configure quais informações incluir no checklist:</p>
                    <Form>
                        <Form.Check
                            type="checkbox"
                            label="Incluir nome do fornecedor"
                            checked={incluirFornecedor}
                            onChange={(e) => setIncluirFornecedor(e.target.checked)}
                            className="mb-2"
                        />
                        <Form.Check
                            type="checkbox"
                            label="Incluir observações dos pedidos"
                            checked={incluirObservacoes}
                            onChange={(e) => setIncluirObservacoes(e.target.checked)}
                        />
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowConverterModal(false)}>
                        Cancelar
                    </Button>
                    <Button
                        variant="success"
                        onClick={handleConverterParaChecklist}
                        disabled={convertendoChecklist}
                    >
                        {convertendoChecklist ? 'Criando...' : 'Criar Checklist'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default DetalhesSubmissao;
