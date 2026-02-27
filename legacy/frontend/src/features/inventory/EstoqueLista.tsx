import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Table, Button, Form, Spinner, Alert, Row, Col, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpload } from '@fortawesome/free-solid-svg-icons';
import CustomSpinner from '../../components/Spinner';
import ImportacaoEstoque from './ImportacaoEstoque';
import api from '../../services/api';
import { parseQuantidadeInput } from '../../utils/quantityParser';
import {
    buildDraftKey,
    getOfflineDraft,
    isOfflineError,
    mergeDraftItems,
    removeOfflineDraft,
    saveOfflineDraft
} from '../../services/offlineDrafts';

interface EstoqueItem {
    id: number;
    item_id: number;
    area_id: number;
    quantidade_atual: string;
    quantidade_minima: number;
    item: {
        id: number;
        nome: string;
        unidade_medida: string;
    };
    changed?: boolean;
}

const EstoqueLista: React.FC = () => {
    const { areaId } = useParams<{ areaId: string }>();
    const [estoque, setEstoque] = useState<EstoqueItem[]>([]);
    const [originalEstoque, setOriginalEstoque] = useState<EstoqueItem[]>([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [areaName, setAreaName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showImportModal, setShowImportModal] = useState(false);
    const [incompleteIds, setIncompleteIds] = useState<Set<number>>(new Set());
    const draftKey = areaId ? buildDraftKey('area', areaId) : null;

    useEffect(() => {
        if (areaId) {
            const fetchEstoque = async () => {
                setIsLoading(true);
                try {
                    const [estoqueRes, areaRes] = await Promise.all([
                        api.get(`/collaborator/areas/${areaId}/estoque`),
                        api.get(`/collaborator/areas/${areaId}`)
                    ]);
                    const estoqueComStatus = estoqueRes.data.map((item: EstoqueItem) => ({
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
                                changed: baseMap.get(item.id) !== item.quantidade_atual
                            }));
                            setSuccess('Rascunho offline restaurado.');
                        }
                    }
                    setEstoque(estoqueFinal);
                    setOriginalEstoque(JSON.parse(JSON.stringify(estoqueComStatus))); // Deep copy
                    setAreaName(areaRes.data.nome);
                } catch (err) {
                    if (draftKey) {
                        const draft = await getOfflineDraft<EstoqueItem>(draftKey);
                        if (draft?.items?.length) {
                            const offlineItems = draft.items.map((item: EstoqueItem) => ({
                                ...item,
                                quantidade_atual: String(item.quantidade_atual ?? ''),
                                changed: true
                            }));
                            setEstoque(offlineItems);
                            setOriginalEstoque(
                                JSON.parse(JSON.stringify(draft.originalItems || draft.items))
                            );
                            const storedName = draft.meta?.name;
                            if (typeof storedName === 'string') {
                                setAreaName(storedName);
                            }
                            setSuccess('Sem conexão. Usando rascunho offline.');
                            setError('');
                            return;
                        }
                    }
                    setError('Não foi possível carregar os itens de estoque.');
                } finally {
                    setIsLoading(false);
                }
            };
            fetchEstoque();
        }
    }, [areaId, draftKey]);

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
                meta: { name: areaName }
            });
        }, 400);
        return () => window.clearTimeout(timeoutId);
    }, [draftKey, estoque, originalEstoque, areaName]);

    const parseQuantidade = (valor: string | number | '') => parseQuantidadeInput(valor);

    const handleQuantityChange = (estoqueId: number, novaQuantidade: string) => {
        const parsed = parseQuantidade(novaQuantidade);
        const updatedEstoque = estoque.map((item) => {
            if (item.id === estoqueId) {
                const originalItem = originalEstoque.find(oi => oi.id === estoqueId);
                const originalValor = parseQuantidade(originalItem?.quantidade_atual ?? '');
                const isChanged = parsed === null || originalValor !== parsed;
                return {
                    ...item,
                    quantidade_atual: novaQuantidade,
                    changed: isChanged
                };
            }
            return item;
        });
        setEstoque(updatedEstoque);
        if (parsed !== null) {
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
        if (event.key !== 'Enter') return;
        event.preventDefault();
        const parsed = parseQuantidadeInput((event.currentTarget as HTMLInputElement).value);
        if (parsed !== null) {
            handleQuantityChange(estoqueId, String(parsed));
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
            await api.post(`/v1/estoque/draft`, {
                area_id: areaId,
                items: estoque.map((item) => ({
                    ...item,
                    quantidade_atual: parseQuantidade(item.quantidade_atual) ?? 0
                }))
            });
            setSuccess('Rascunho salvo com sucesso!');
            const estoqueComStatus = estoque.map(item => ({ ...item, changed: false }));
            setEstoque(estoqueComStatus);
            setOriginalEstoque(JSON.parse(JSON.stringify(estoqueComStatus)));
            if (draftKey) {
                await removeOfflineDraft(draftKey);
            }
        } catch (err) {
            if (isOfflineError(err)) {
                setSuccess('Sem conexão. Rascunho salvo localmente e será sincronizado.');
                return;
            }
            setError('Falha ao salvar o rascunho.');
        } finally {
            setIsLoading(false);
        }
    };

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
        setIsLoading(true);
        setError('');
        setSuccess('');
        try {
            await handleSaveDraft(); // Save latest changes first
            const response = await api.post('/v1/pedidos/submit', { area_id: areaId });
            setSuccess(response.data.message);
            if (draftKey) {
                await removeOfflineDraft(draftKey);
            }
        } catch (err) {
            if (isOfflineError(err)) {
                setSuccess('Sem conexão. Submissão enfileirada para sincronização.');
                return;
            }
            setError('Erro ao submeter a lista.');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredEstoque = useMemo(() => {
        return estoque.filter(item => 
            item.item.nome.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [estoque, searchTerm]);

    const summary = useMemo(() => {
        const totalItems = estoque.length;
        const itemsToRequest = estoque.filter(item => {
            const quantidadeAtual = parseQuantidade(item.quantidade_atual);
            return quantidadeAtual !== null && quantidadeAtual < item.quantidade_minima;
        }).length;
        const changedItems = estoque.filter(item => item.changed).length;
        return { totalItems, itemsToRequest, changedItems };
    }, [estoque]);

    const handleImportSuccess = () => {
        // Recarrega o estoque após importação bem-sucedida
        if (areaId) {
            const fetchEstoque = async () => {
                setIsLoading(true);
                try {
                    const estoqueRes = await api.get(`/collaborator/areas/${areaId}/estoque`);
                    const estoqueComStatus = estoqueRes.data.map((item: EstoqueItem) => ({
                        ...item,
                        changed: false
                    }));
                    setEstoque(estoqueComStatus);
                    setOriginalEstoque(JSON.parse(JSON.stringify(estoqueComStatus)));
                    setSuccess('Estoque atualizado com sucesso após importação!');
                } catch (err) {
                    setError('Erro ao recarregar o estoque.');
                } finally {
                    setIsLoading(false);
                }
            };
            fetchEstoque();
        }
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fs-2 mb-0">Preenchimento de Estoque: {areaName}</h2>
                <Button 
                    variant="success" 
                    onClick={() => setShowImportModal(true)}
                    title="Importar itens em lote"
                >
                    <FontAwesomeIcon icon={faUpload} className="me-2" />
                    Importar Itens
                </Button>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            <Row className="mb-3">
                <Col md={8}>
                    <Form.Control 
                        type="text" 
                        placeholder="Buscar item..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                    />
                </Col>
                <Col md={4}>
                    <Card>
                        <Card.Body className="p-2 text-center">
                            <small className="text-muted">Itens a Pedir: </small><span className="fw-bold">{summary.itemsToRequest}</span> | 
                            <small className="text-muted"> Alterados: </small><span className="fw-bold">{summary.changedItems}</span> | 
                            <small className="text-muted"> Total: </small><span className="fw-bold">{summary.totalItems}</span>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Form onSubmit={(e) => { e.preventDefault(); }}>
                <Table striped bordered hover responsive>
                    <thead className="table-dark">
                        <tr>
                            <th>Item</th>
                            <th className="text-center">Qtd. Mínima</th>
                            <th style={{ width: '150px' }} className="text-center">Qtd. Atual</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && !filteredEstoque.length ? (
                            <tr>
                                <td colSpan={3} className="text-center"><CustomSpinner /></td>
                            </tr>
                        ) : filteredEstoque.length > 0 ? filteredEstoque.map(item => (
                            <tr
                                key={item.id}
                                className={`${item.changed ? 'table-warning' : ''} ${incompleteIds.has(item.id) ? 'table-danger' : ''}`}
                            >
                                <td>{item.item?.nome || 'Nome não encontrado'} ({item.item?.unidade_medida})</td>
                                <td className="text-center">{item.quantidade_minima}</td>
                                <td>
                                    <Form.Control 
                                        type="text"
                                        inputMode="text"
                                        pattern="[0-9+.,]*"
                                        value={item.quantidade_atual}
                                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                        onKeyDown={(e) => handleQuantidadeKeyDown(e, item.id)}
                                        onKeyUp={(e) => handleQuantidadeKeyUp(e, item.id)}
                                        onBlur={(e) => handleQuantidadeBlur(e, item.id)}
                                        className={`text-center ${incompleteIds.has(item.id) ? 'is-invalid' : ''}`}
                                    />
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={3} className="text-center">Nenhum item encontrado.</td>
                            </tr>
                        )}
                    </tbody>
                </Table>
                <div className="d-flex justify-content-end gap-2 mt-3">
                    <Button variant="outline-secondary" onClick={handleSaveDraft} disabled={isLoading || summary.changedItems === 0}>
                        {isLoading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true"/> : 'Salvar Rascunho'}
                    </Button>
                    <Button variant="primary" onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true"/> : 'Submeter Lista'}
                    </Button>
                </div>
            </Form>

            {/* Modal de Importação */}
            <ImportacaoEstoque
                show={showImportModal}
                onHide={() => setShowImportModal(false)}
                onSuccess={handleImportSuccess}
            />
        </div>
    );
};

export default EstoqueLista;
