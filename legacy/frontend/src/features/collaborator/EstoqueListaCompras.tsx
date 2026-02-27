/**
 * Estoque - Preenchimento de Lista de Compras
 *
 * Componente para colaboradores preencherem as quantidades atuais de itens
 * de uma lista específica, com cálculo automático de pedidos
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Table, Button, Form, Spinner, Alert, Row, Col, Card, Badge, Modal } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft,
    faCheckCircle,
    faExclamationTriangle,
    faSave,
    faPaperPlane,
    faShoppingCart,
    faLightbulb
} from '@fortawesome/free-solid-svg-icons';
import CustomSpinner from '../../components/Spinner';
import SugerirItemModal from '../../components/SugerirItemModal';
import api from '../../services/api';
import styles from './EstoqueListaCompras.module.css';
import { parseQuantidadeInput } from '../../utils/quantityParser';
import {
    buildDraftKey,
    getOfflineDraft,
    isOfflineError,
    mergeDraftItems,
    removeOfflineDraft,
    saveOfflineDraft
} from '../../services/offlineDrafts';

// Interfaces TypeScript
interface EstoqueItem {
    id: number;
    item_id: number;
    lista_id: number;
    quantidade_atual: string;
    quantidade_minima: number;
    pedido: number;
    usa_threshold?: boolean;
    quantidade_por_fardo?: number;
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
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showSugerirModal, setShowSugerirModal] = useState(false);
    const [successSugestao, setSuccessSugestao] = useState('');
    const [incompleteIds, setIncompleteIds] = useState<Set<number>>(new Set());
    const draftKey = listaId ? buildDraftKey('lista', listaId) : null;

    // Estado para ordenação de colunas
    const [ordenacao, setOrdenacao] = useState<{ campo: string; direcao: 'asc' | 'desc' }>({
        campo: 'nome',
        direcao: 'asc'
    });

    // Carregar estoque da lista
    useEffect(() => {
        if (listaId) {
            const fetchEstoque = async () => {
                setIsLoading(true);
                try {
                    const [listaResponse, estoqueResponse] = await Promise.all([
                        api.get(`/collaborator/listas/${listaId}`),
                        api.get(`/collaborator/listas/${listaId}/estoque`)
                    ]);
                    const estoqueComStatus = estoqueResponse.data.map((item: EstoqueItem) => ({
                        ...item,
                        quantidade_atual: String(item.quantidade_atual ?? ''),
                        changed: false
                    }));
                    let estoqueFinal = estoqueComStatus;
                    if (draftKey) {
                        const draft = await getOfflineDraft<EstoqueItem>(draftKey);
                        if (draft?.items?.length) {
                            const merged = mergeDraftItems(estoqueComStatus, draft.items);
                            const baseMap = new Map(
                                estoqueComStatus.map((item: EstoqueItem) => [item.id, item.quantidade_atual])
                            );
                            estoqueFinal = merged.map((item: EstoqueItem) => ({
                                ...item,
                                quantidade_atual: String(item.quantidade_atual ?? ''),
                                pedido: parseQuantidade(item.quantidade_atual) === null
                                    ? 0
                                    : calculatePedido(
                                          item.quantidade_minima,
                                          parseQuantidade(item.quantidade_atual) ?? 0,
                                          item.usa_threshold,
                                          item.quantidade_por_fardo
                                      ),
                                changed:
                                    parseQuantidade(item.quantidade_atual) === null ||
                                    baseMap.get(item.id) !== item.quantidade_atual
                            }));
                            setSuccess('Rascunho offline restaurado.');
                        }
                    }
                    setEstoque(estoqueFinal);
                    setOriginalEstoque(JSON.parse(JSON.stringify(estoqueComStatus))); // Deep copy

                    setListaName(listaResponse.data?.nome || `Lista #${listaId}`);
                } catch (err: any) {
                    if (draftKey) {
                        const draft = await getOfflineDraft<EstoqueItem>(draftKey);
                        if (draft?.items?.length) {
                            const offlineItems = draft.items.map((item: EstoqueItem) => ({
                                ...item,
                                quantidade_atual: String(item.quantidade_atual ?? ''),
                                pedido: parseQuantidade(item.quantidade_atual) === null
                                    ? 0
                                    : calculatePedido(
                                          item.quantidade_minima,
                                          parseQuantidade(item.quantidade_atual) ?? 0,
                                          item.usa_threshold,
                                          item.quantidade_por_fardo
                                      ),
                                changed: true
                            }));
                            setEstoque(offlineItems);
                            setOriginalEstoque(
                                JSON.parse(JSON.stringify(draft.originalItems || draft.items))
                            );
                            const storedName = draft.meta?.name;
                            if (typeof storedName === 'string') {
                                setListaName(storedName);
                            }
                            setSuccess('Sem conexão. Usando rascunho offline.');
                            setError('');
                            return;
                        }
                    }
                    setError(err.response?.data?.error || 'Não foi possível carregar os itens de estoque.');
                    console.error('Erro:', err);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchEstoque();
        }
    }, [listaId, draftKey]);

    useEffect(() => {
        if (!draftKey || !originalEstoque.length) {
            return;
        }
        const hasChanges = estoque.some((item) => item.changed);
        if (!hasChanges) {
            if (draftKey) {
                void removeOfflineDraft(draftKey);
            }
            return;
        }
        const timeoutId = window.setTimeout(() => {
            void saveOfflineDraft({
                key: draftKey,
                updatedAt: Date.now(),
                items: estoque,
                originalItems: originalEstoque,
                meta: { name: listaName }
            });
        }, 400);
        return () => window.clearTimeout(timeoutId);
    }, [draftKey, estoque, originalEstoque, listaName]);

    const calculatePedido = (quantidadeMinima: number, quantidadeAtual: number, usaThreshold?: boolean, quantidadePorFardo?: number) => {
        // Se quantidade atual > mínima, não precisa pedir
        if (quantidadeAtual > quantidadeMinima) {
            return 0;
        }
        // Se usa threshold, pede 1 fardo quando atingir mínimo
        if (usaThreshold) {
            return quantidadePorFardo || 1;
        }
        // Lógica padrão: diferença
        return Math.max(0, quantidadeMinima - quantidadeAtual);
    };

    const parseQuantidade = (valor: string | number | '') => parseQuantidadeInput(valor);

    const focusRelativeQuantidadeInput = (
        currentInput: HTMLInputElement,
        direction: 'next' | 'prev'
    ) => {
        const inputs = Array.from(
            document.querySelectorAll<HTMLInputElement>('[data-estoque-input="true"]')
        );
        const currentIndex = inputs.indexOf(currentInput);
        if (currentIndex === -1) {
            return false;
        }
        const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        const target = inputs[targetIndex];
        if (!target) {
            return false;
        }
        target.focus();
        target.select();
        return true;
    };

    // Handle mudança de quantidade
    const handleQuantityChange = (estoqueId: number, novaQuantidade: string) => {
        const quantidadeAtual = parseQuantidade(novaQuantidade);
        const updatedEstoque = estoque.map((item) => {
            if (item.id === estoqueId) {
                const originalItem = originalEstoque.find(oi => oi.id === estoqueId);
                const originalValor = parseQuantidade(originalItem?.quantidade_atual ?? '');
                const isChanged = quantidadeAtual === null || originalValor !== quantidadeAtual;
                return {
                    ...item,
                    quantidade_atual: novaQuantidade,
                    pedido: quantidadeAtual === null ? 0 : calculatePedido(item.quantidade_minima, quantidadeAtual, item.usa_threshold, item.quantidade_por_fardo),
                    changed: isChanged
                };
            }
            return item;
        });
        setEstoque(updatedEstoque);
        if (quantidadeAtual !== null) {
            setIncompleteIds((prev) => {
                if (!prev.has(estoqueId)) return prev;
                const next = new Set(prev);
                next.delete(estoqueId);
                return next;
            });
        }
    };

    const handleQuantidadeKeyDown = (
        event: React.KeyboardEvent<HTMLElement>,
        estoqueId: number
    ) => {
        const input = event.currentTarget as HTMLInputElement;
        if (event.key === 'Enter') {
            event.preventDefault();
            const parsed = parseQuantidadeInput(input.value);
            if (parsed !== null) {
                handleQuantityChange(estoqueId, String(parsed));
            }
            focusRelativeQuantidadeInput(input, 'next');
            return;
        }

        if (event.key === 'Tab') {
            const moved = focusRelativeQuantidadeInput(input, 'prev');
            if (moved) {
                event.preventDefault();
            }
        }
    };

    // Android: keydown chega com key='Unidentified', keyup chega com key='Enter' correto
    const handleQuantidadeKeyUp = (
        event: React.KeyboardEvent<HTMLElement>,
        estoqueId: number
    ) => {
        if (event.key !== 'Enter') return;
        const input = event.currentTarget as HTMLInputElement;
        const parsed = parseQuantidadeInput(input.value);
        if (parsed !== null) {
            handleQuantityChange(estoqueId, String(parsed));
        }
    };

    // Cobertura total mobile: "toque no próximo campo", "Done", Tab no desktop
    const handleQuantidadeBlur = (
        event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
        estoqueId: number
    ) => {
        const raw = event.currentTarget.value;
        const parsed = parseQuantidadeInput(raw);
        if (parsed !== null && raw !== String(parsed)) {
            handleQuantityChange(estoqueId, String(parsed));
        }
    };

    // Salvar rascunho
    const handleSaveDraft = async () => {
        const missing = estoque
            .filter((item) => parseQuantidade(item.quantidade_atual) === null)
            .map((item) => item.id);
        if (missing.length > 0) {
            setIncompleteIds(new Set(missing));
            setError('Preencha todas as quantidades antes de salvar o rascunho.');
            setSuccess('');
            return;
        }
        setIsLoading(true);
        setError('');
        setSuccess('');
        try {
            // Salva um item por vez para confirmar que tem acesso
            const itemsParaSalvar = estoque
                .filter(item => item.changed)
                .map(item => ({
                    estoque_id: item.id,
                    quantidade_atual: parseQuantidade(item.quantidade_atual) ?? 0
                }));

            if (itemsParaSalvar.length === 0) {
                setError('Nenhum item foi alterado.');
                setIsLoading(false);
                return;
            }

            // Faz um request para cada item (pode otimizar depois com batch)
            for (const item of itemsParaSalvar) {
                await api.put(`/collaborator/estoque/${item.estoque_id}`, {
                    quantidade_atual: item.quantidade_atual
                });
            }

            setSuccess('Rascunho salvo com sucesso!');
            const estoqueComStatus = estoque.map((item: EstoqueItem) => ({
                ...item,
                changed: false
            }));
            setEstoque(estoqueComStatus);
            setOriginalEstoque(JSON.parse(JSON.stringify(estoqueComStatus)));
            if (draftKey) {
                await removeOfflineDraft(draftKey);
            }
        } catch (err: any) {
            if (isOfflineError(err)) {
                setSuccess('Sem conexão. Rascunho salvo localmente e será sincronizado.');
                return;
            }
            setError(err.response?.data?.error || 'Falha ao salvar o rascunho.');
        } finally {
            setIsLoading(false);
        }
    };

    // Submeter lista
    const handleSubmit = async () => {
        const missing = estoque
            .filter((item) => parseQuantidade(item.quantidade_atual) === null)
            .map((item) => item.id);
        if (missing.length > 0) {
            setIncompleteIds(new Set(missing));
            setError('Preencha todas as quantidades antes de submeter.');
            setSuccess('');
            return;
        }
        setIsSubmitting(true);
        setError('');
        setSuccess('');
        try {
            // Prepara os dados para submit
            const itemsParaSubmeter = estoque.map(item => ({
                estoque_id: item.id,
                quantidade_atual: parseQuantidade(item.quantidade_atual) ?? 0
            }));

            const response = await api.post<SubmitResponse>(
                `/v1/listas/${listaId}/estoque/submit`,
                { items: itemsParaSubmeter }
            );

            // Mostra modal de sucesso animado
            setShowSuccessModal(true);
            setSuccess(
                `Lista submetida com sucesso! ${response.data.pedidos_criados} pedido(s) criado(s).`
            );
            if (draftKey) {
                await removeOfflineDraft(draftKey);
            }

            // Aguarda 5 segundos para usuário ler mensagem, depois volta
            setTimeout(() => {
                navigate('/collaborator/listas');
            }, 5000);
        } catch (err: any) {
            if (isOfflineError(err)) {
                setError('Sem conexão. Submissão enfileirada para sincronização.');
                return;
            }
            setError(err.response?.data?.error || 'Erro ao submeter a lista.');
            console.error('Erro ao submeter:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Função de ordenação de colunas
    const handleOrdenar = (campo: string) => {
        setOrdenacao(prev => ({
            campo,
            direcao: prev.campo === campo && prev.direcao === 'asc' ? 'desc' : 'asc'
        }));
    };

    const ordenarItens = (itens: EstoqueItem[]) => {
        return [...itens].sort((a, b) => {
            let valorA: string | number;
            let valorB: string | number;

            switch (ordenacao.campo) {
                case 'nome':
                    valorA = a.item.nome;
                    valorB = b.item.nome;
                    break;
                case 'unidade':
                    valorA = a.item.unidade_medida;
                    valorB = b.item.unidade_medida;
                    break;
                case 'quantidade_minima':
                    valorA = a.quantidade_minima;
                    valorB = b.quantidade_minima;
                    break;
                case 'quantidade_atual':
                    valorA = parseQuantidade(a.quantidade_atual) ?? 0;
                    valorB = parseQuantidade(b.quantidade_atual) ?? 0;
                    break;
                case 'pedido':
                    const qtdAtualA = parseQuantidade(a.quantidade_atual);
                    const qtdAtualB = parseQuantidade(b.quantidade_atual);
                    valorA = qtdAtualA === null ? 0 : calculatePedido(a.quantidade_minima, qtdAtualA, a.usa_threshold, a.quantidade_por_fardo);
                    valorB = qtdAtualB === null ? 0 : calculatePedido(b.quantidade_minima, qtdAtualB, b.usa_threshold, b.quantidade_por_fardo);
                    break;
                default:
                    valorA = a.item.nome;
                    valorB = b.item.nome;
            }

            // Comparação para strings
            if (typeof valorA === 'string' && typeof valorB === 'string') {
                const comparacao = valorA.localeCompare(valorB, 'pt-BR', { sensitivity: 'base' });
                return ordenacao.direcao === 'asc' ? comparacao : -comparacao;
            }

            // Comparação para números
            const comparacao = ((valorA as number) ?? 0) - ((valorB as number) ?? 0);
            return ordenacao.direcao === 'asc' ? comparacao : -comparacao;
        });
    };

    // Filter e summary
    const filteredEstoque = useMemo(() => {
        const resultado = estoque.filter(item =>
            item.item.nome.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return ordenarItens(resultado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [estoque, searchTerm, ordenacao]);

    const summary = useMemo(() => {
        const totalItems = estoque.length;
        const itemsToRequest = estoque.filter(item => {
            const quantidadeAtual = parseQuantidade(item.quantidade_atual);
            return quantidadeAtual !== null && quantidadeAtual < item.quantidade_minima;
        }).length;
        const changedItems = estoque.filter(item => item.changed).length;
        return { totalItems, itemsToRequest, changedItems };
    }, [estoque]);

    const handleSucessoSugestao = () => {
        setSuccessSugestao('✅ Sugestão enviada com sucesso! O administrador irá analisá-la.');
        setTimeout(() => setSuccessSugestao(''), 5000);
    };

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

                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h2 className={`fs-2 mb-0 ${styles.title}`}>
                        <FontAwesomeIcon icon={faShoppingCart} /> Preenchimento: {listaName}
                    </h2>
                    <Button 
                        variant="warning"
                        onClick={() => setShowSugerirModal(true)}
                        className="d-flex align-items-center gap-2"
                    >
                        <FontAwesomeIcon icon={faLightbulb} />
                        Sugerir Novo Item
                    </Button>
                </div>
                
                <p className="text-muted">
                    Atualize as quantidades atuais de cada item e clique em "Submeter Lista"
                </p>
            </div>

            {/* Alertas */}
            {successSugestao && (
                <Alert variant="success" onClose={() => setSuccessSugestao('')} dismissible>
                    {successSugestao}
                </Alert>
            )}

            {success && (
                <Alert variant="success" onClose={() => setSuccess('')} dismissible>
                    {success}
                </Alert>
            )}
            
            {error && (
                <Alert variant="danger" onClose={() => setError('')} dismissible>
                    <FontAwesomeIcon icon={faExclamationTriangle} /> {error}
                </Alert>
            )}

            {/* Modal de Sucesso Animado */}
            <Modal 
                show={showSuccessModal} 
                centered 
                backdrop="static"
                keyboard={false}
            >
                <Modal.Body className="text-center py-5">
                    <div className="mb-4">
                        <FontAwesomeIcon 
                            icon={faCheckCircle} 
                            size="4x" 
                            className="text-success"
                            style={{ animation: 'pulse 1.5s infinite' }}
                        />
                    </div>
                    <h3 className="mb-3 text-success">
                        ✅ Lista Submetida com Sucesso!
                    </h3>
                    <p className="text-muted mb-0">
                        {success}
                    </p>
                    <p className="text-muted mt-3 small">
                        Redirecionando em 5 segundos...
                    </p>
                    <Spinner animation="border" size="sm" className="mt-2" />
                </Modal.Body>
            </Modal>

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
                                <th
                                    onClick={() => handleOrdenar('nome')}
                                    style={{ cursor: 'pointer', userSelect: 'none' }}
                                >
                                    Item
                                    {ordenacao.campo === 'nome' && (
                                        <span className="ms-1">
                                            {ordenacao.direcao === 'asc' ? '▲' : '▼'}
                                        </span>
                                    )}
                                </th>
                                <th
                                    onClick={() => handleOrdenar('unidade')}
                                    style={{ cursor: 'pointer', userSelect: 'none', width: '120px' }}
                                    className="text-center"
                                >
                                    Unidade
                                    {ordenacao.campo === 'unidade' && (
                                        <span className="ms-1">
                                            {ordenacao.direcao === 'asc' ? '▲' : '▼'}
                                        </span>
                                    )}
                                </th>
                                <th
                                    onClick={() => handleOrdenar('quantidade_minima')}
                                    style={{ cursor: 'pointer', userSelect: 'none', width: '120px' }}
                                    className="text-center"
                                >
                                    Qtd. Mín.
                                    {ordenacao.campo === 'quantidade_minima' && (
                                        <span className="ms-1">
                                            {ordenacao.direcao === 'asc' ? '▲' : '▼'}
                                        </span>
                                    )}
                                </th>
                                <th
                                    onClick={() => handleOrdenar('quantidade_atual')}
                                    style={{ cursor: 'pointer', userSelect: 'none', width: '120px' }}
                                    className="text-center"
                                >
                                    Qtd. Atual
                                    {ordenacao.campo === 'quantidade_atual' && (
                                        <span className="ms-1">
                                            {ordenacao.direcao === 'asc' ? '▲' : '▼'}
                                        </span>
                                    )}
                                </th>
                                <th
                                    onClick={() => handleOrdenar('pedido')}
                                    style={{ cursor: 'pointer', userSelect: 'none', width: '100px' }}
                                    className="text-center"
                                >
                                    Pedido
                                    {ordenacao.campo === 'pedido' && (
                                        <span className="ms-1">
                                            {ordenacao.direcao === 'asc' ? '▲' : '▼'}
                                        </span>
                                    )}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading && !filteredEstoque.length ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-5">
                                        <CustomSpinner />
                                    </td>
                                </tr>
                            ) : filteredEstoque.length > 0 ? filteredEstoque.map(item => {
                                const quantidadeAtual = parseQuantidade(item.quantidade_atual);
                                const pedidoCalculado = quantidadeAtual === null
                                    ? null
                                    : calculatePedido(item.quantidade_minima, quantidadeAtual, item.usa_threshold, item.quantidade_por_fardo);
                                return (
                                    <tr
                                        key={item.id}
                                        className={`${item.changed ? styles.changedRow : ''} ${incompleteIds.has(item.id) ? styles.invalidRow : ''}`}
                                    >
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
                                                type="text"
                                                inputMode="text"
                                                pattern="[0-9+.,]*"
                                                value={item.quantidade_atual}
                                                onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                                onKeyDown={(e) => handleQuantidadeKeyDown(e, item.id)}
                                                onKeyUp={(e) => handleQuantidadeKeyUp(e, item.id)}
                                                onBlur={(e) => handleQuantidadeBlur(e, item.id)}
                                                className={`${styles.quantityInput} ${incompleteIds.has(item.id) ? styles.invalidInput : ''}`}
                                                data-estoque-input="true"
                                            />
                                        </td>
                                        <td className="text-center">
                                            {pedidoCalculado === null ? (
                                                <Badge bg="secondary">-</Badge>
                                            ) : pedidoCalculado > 0 ? (
                                                <Badge bg="danger">{pedidoCalculado.toFixed(2)}</Badge>
                                            ) : (
                                                <Badge bg="success">0</Badge>
                                            )}
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={5} className="text-center text-muted py-4">
                                        <div>Nenhum item encontrado.</div>
                                        <small className="text-muted">
                                            Apenas itens com quantidade mínima definida aparecem aqui.
                                            <br />
                                            Peça ao administrador para configurar os itens da lista.
                                        </small>
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

            {/* Modal de Sugestão de Item */}
            <SugerirItemModal
                show={showSugerirModal}
                onHide={() => setShowSugerirModal(false)}
                listaId={parseInt(listaId || '0')}
                listaNome={listaName}
                onSucessoEnvio={handleSucessoSugestao}
            />
        </div>
    );
};

export default EstoqueListaCompras;
