import React, { useState, useEffect, useCallback } from 'react';
import {
    Modal, Button, Table, Form, Alert, Spinner, Badge, Accordion
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faLink, faArrowLeft, faArrowRight, faCopy, faSearch
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import api from '../../services/api';

// ---- tipos ----

interface SubmissaoResumo {
    id: number;
    lista_id: number;
    lista_nome: string;
    usuario_nome: string;
    data_submissao: string;
    status: string;
}

interface BreakdownItem {
    submissao_id: number;
    lista_id: number;
    lista_nome: string;
    usuario_nome: string;
    quantidade: number;
}

interface ItemFundido {
    item_id: number;
    item_nome: string;
    item_unidade: string;
    quantidade_total: number;
    breakdown: BreakdownItem[];
}

interface MergePreview {
    submissao_ids: number[];
    listas: { submissao_id: number; lista_id: number; lista_nome: string }[];
    itens: ItemFundido[];
    total_itens: number;
}

type Step = 'select' | 'preview' | 'share';

// ---- componente ----

interface MergeModalProps {
    show: boolean;
    onHide: () => void;
    submissaoAtualId: number;
    listaAtualNome: string;
}

const MergeModal: React.FC<MergeModalProps> = ({
    show, onHide, submissaoAtualId, listaAtualNome
}) => {
    const [step, setStep] = useState<Step>('select');
    const [available, setAvailable] = useState<SubmissaoResumo[]>([]);
    const [loadingAvailable, setLoadingAvailable] = useState(false);
    const [errorAvailable, setErrorAvailable] = useState('');
    const [selectedIds, setSelectedIds] = useState<number[]>([submissaoAtualId]);
    const [busca, setBusca] = useState('');

    const [preview, setPreview] = useState<MergePreview | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [errorPreview, setErrorPreview] = useState('');

    const [textoWpp, setTextoWpp] = useState('');
    const [loadingWpp, setLoadingWpp] = useState(false);
    const [errorWpp, setErrorWpp] = useState('');
    const [copiado, setCopiado] = useState(false);

    // reset ao fechar/abrir
    useEffect(() => {
        if (show) {
            setStep('select');
            setSelectedIds([submissaoAtualId]);
            setPreview(null);
            setTextoWpp('');
            setErrorPreview('');
            setErrorWpp('');
            setBusca('');
            carregarDisponiveis();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show]);

    const carregarDisponiveis = useCallback(async () => {
        setLoadingAvailable(true);
        setErrorAvailable('');
        try {
            const res = await api.get('/admin/submissoes?status=APROVADO');
            // excluir a submissão atual da lista de opções
            const filtradas = (res.data as SubmissaoResumo[]).filter(
                s => s.id !== submissaoAtualId
            );
            setAvailable(filtradas);
        } catch {
            setErrorAvailable('Erro ao carregar submissões aprovadas.');
        } finally {
            setLoadingAvailable(false);
        }
    }, [submissaoAtualId]);

    const toggleId = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        const idsDisponiveis = available
            .filter(s => matchBusca(s))
            .map(s => s.id);
        const todosNaSeleção = idsDisponiveis.every(id => selectedIds.includes(id));
        if (todosNaSeleção) {
            // remover todos os disponíveis (manter apenas o atual)
            setSelectedIds(prev =>
                prev.filter(id => id === submissaoAtualId || !idsDisponiveis.includes(id))
            );
        } else {
            setSelectedIds(prev =>
                Array.from(new Set([...prev, ...idsDisponiveis]))
            );
        }
    };

    const matchBusca = (s: SubmissaoResumo) => {
        if (!busca.trim()) return true;
        return s.lista_nome.toLowerCase().includes(busca.toLowerCase());
    };

    const disponiveisFiltrados = available.filter(matchBusca);
    const todosDisponiveisSelecionados =
        disponiveisFiltrados.length > 0 &&
        disponiveisFiltrados.every(s => selectedIds.includes(s.id));

    // ---- Step 2: gerar preview ----
    const handleGerarPreview = async () => {
        setLoadingPreview(true);
        setErrorPreview('');
        try {
            const res = await api.post('/admin/submissoes/merge-preview', {
                submissao_ids: selectedIds
            });
            setPreview(res.data);
            setStep('preview');
        } catch (err: any) {
            setErrorPreview(err.response?.data?.error || 'Erro ao gerar prévia.');
        } finally {
            setLoadingPreview(false);
        }
    };

    // ---- Step 3: gerar WhatsApp ----
    const handleGerarWhatsApp = async () => {
        setLoadingWpp(true);
        setErrorWpp('');
        try {
            const res = await api.post('/admin/submissoes/merge-whatsapp', {
                submissao_ids: selectedIds
            });
            setTextoWpp(res.data.texto);
            setStep('share');
        } catch (err: any) {
            setErrorWpp(err.response?.data?.error || 'Erro ao gerar texto WhatsApp.');
        } finally {
            setLoadingWpp(false);
        }
    };

    const handleCopiar = async () => {
        try {
            await navigator.clipboard.writeText(textoWpp);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
        } catch {
            // fallback
        }
    };

    const handleAbrirWhatsApp = () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(textoWpp)}`, '_blank');
    };

    const formatarQtd = (qtd: number) =>
        qtd === Math.floor(qtd) ? qtd.toFixed(0) : qtd.toFixed(2);

    const formatarData = (iso: string) => {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    };

    // ---- barra de progresso ----
    const stepIndex = step === 'select' ? 0 : step === 'preview' ? 1 : 2;

    return (
        <Modal show={show} onHide={onHide} size="lg" scrollable>
            <Modal.Header closeButton>
                <Modal.Title>
                    <FontAwesomeIcon icon={faLink} className="me-2 text-primary" />
                    Fundir pedidos (submissões aprovadas)
                </Modal.Title>
            </Modal.Header>

            {/* Barra de progresso */}
            <div className="px-4 pt-3">
                <div className="d-flex align-items-center gap-2 mb-3">
                    {['Seleção', 'Prévia', 'Compartilhar'].map((label, i) => (
                        <React.Fragment key={label}>
                            <div
                                className={`px-3 py-1 rounded-pill small fw-semibold ${
                                    i === stepIndex
                                        ? 'bg-primary text-white'
                                        : i < stepIndex
                                        ? 'bg-success text-white'
                                        : 'bg-light text-muted'
                                }`}
                            >
                                {i + 1}. {label}
                            </div>
                            {i < 2 && <div className="flex-grow-1 border-top" />}
                        </React.Fragment>
                    ))}
                </div>
                <p className="text-muted small mb-2">
                    Itens repetidos (mesmo produto) serão somados por ID global do catálogo.
                </p>
            </div>

            <Modal.Body>

                {/* ====== STEP 1: SELEÇÃO ====== */}
                {step === 'select' && (
                    <>
                        {/* Submissão atual — fixa */}
                        <div className="mb-3 p-3 bg-light rounded border">
                            <small className="text-muted d-block mb-1">Submissão atual (fixa)</small>
                            <Form.Check
                                type="checkbox"
                                id="sub-atual"
                                label={
                                    <span>
                                        <Badge bg="primary" className="me-2">#{submissaoAtualId}</Badge>
                                        <strong>{listaAtualNome}</strong>
                                        <Badge bg="success" className="ms-2">APROVADO</Badge>
                                    </span>
                                }
                                checked
                                disabled
                            />
                        </div>

                        {/* Busca + toggle-all */}
                        <div className="d-flex gap-2 mb-2">
                            <div className="input-group">
                                <span className="input-group-text">
                                    <FontAwesomeIcon icon={faSearch} />
                                </span>
                                <Form.Control
                                    placeholder="Buscar por nome da lista…"
                                    value={busca}
                                    onChange={e => setBusca(e.target.value)}
                                />
                            </div>
                        </div>

                        {errorAvailable && (
                            <Alert variant="danger" className="py-2">{errorAvailable}</Alert>
                        )}

                        {loadingAvailable ? (
                            <div className="text-center py-4">
                                <Spinner animation="border" size="sm" className="me-2" />
                                Carregando submissões aprovadas…
                            </div>
                        ) : disponiveisFiltrados.length === 0 ? (
                            <Alert variant="info" className="py-2">
                                {busca
                                    ? 'Nenhuma submissão encontrada com esse termo.'
                                    : 'Não há outras submissões aprovadas disponíveis para fundir.'}
                            </Alert>
                        ) : (
                            <Table hover responsive bordered size="sm">
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ width: 36 }}>
                                            <Form.Check
                                                type="checkbox"
                                                checked={todosDisponiveisSelecionados}
                                                onChange={toggleAll}
                                                title="Selecionar todas"
                                            />
                                        </th>
                                        <th>Lista</th>
                                        <th>Sub#</th>
                                        <th>Usuário</th>
                                        <th>Data</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {disponiveisFiltrados.map(s => (
                                        <tr
                                            key={s.id}
                                            onClick={() => toggleId(s.id)}
                                            style={{ cursor: 'pointer' }}
                                            className={selectedIds.includes(s.id) ? 'table-primary' : ''}
                                        >
                                            <td onClick={e => e.stopPropagation()}>
                                                <Form.Check
                                                    type="checkbox"
                                                    checked={selectedIds.includes(s.id)}
                                                    onChange={() => toggleId(s.id)}
                                                />
                                            </td>
                                            <td><strong>{s.lista_nome}</strong></td>
                                            <td>
                                                <Badge bg="secondary">#{s.id}</Badge>
                                            </td>
                                            <td>{s.usuario_nome}</td>
                                            <td className="text-nowrap">
                                                {formatarData(s.data_submissao)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        )}

                        {errorPreview && (
                            <Alert variant="danger" className="mt-2 py-2">{errorPreview}</Alert>
                        )}

                        <div className="text-muted small mt-2">
                            Selecionadas: <strong>{selectedIds.length}</strong> (mínimo 2)
                        </div>
                    </>
                )}

                {/* ====== STEP 2: PREVIEW ====== */}
                {step === 'preview' && preview && (
                    <>
                        {/* Chips das listas envolvidas */}
                        <div className="mb-3 d-flex flex-wrap gap-2">
                            {preview.listas.map(l => (
                                <Badge key={l.submissao_id} bg="primary" className="px-3 py-2">
                                    #{l.submissao_id} {l.lista_nome}
                                </Badge>
                            ))}
                        </div>
                        <p className="text-muted small mb-3">
                            <strong>{preview.total_itens}</strong> item(ns) únicos ·{' '}
                            <strong>{preview.listas.length}</strong> submissões fundidas
                        </p>

                        {preview.itens.length === 0 ? (
                            <Alert variant="warning">
                                Nenhum item aprovado encontrado nas submissões selecionadas.
                            </Alert>
                        ) : (
                            <Accordion flush>
                                {preview.itens.map(item => (
                                    <Accordion.Item key={item.item_id} eventKey={String(item.item_id)}>
                                        <Accordion.Header>
                                            <div className="d-flex justify-content-between w-100 me-3">
                                                <span><strong>{item.item_nome}</strong></span>
                                                <Badge bg="success" className="ms-auto">
                                                    {formatarQtd(item.quantidade_total)} {item.item_unidade}
                                                </Badge>
                                            </div>
                                        </Accordion.Header>
                                        <Accordion.Body className="py-2">
                                            <Table size="sm" className="mb-0">
                                                <thead>
                                                    <tr>
                                                        <th>Lista</th>
                                                        <th>Usuário</th>
                                                        <th className="text-end">Qtd</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {item.breakdown.map(b => (
                                                        <tr key={b.submissao_id}>
                                                            <td>{b.lista_nome}</td>
                                                            <td className="text-muted">{b.usuario_nome}</td>
                                                            <td className="text-end">
                                                                {formatarQtd(b.quantidade)} {item.item_unidade}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>
                                        </Accordion.Body>
                                    </Accordion.Item>
                                ))}
                            </Accordion>
                        )}

                        {errorWpp && (
                            <Alert variant="danger" className="mt-3 py-2">{errorWpp}</Alert>
                        )}
                    </>
                )}

                {/* ====== STEP 3: COMPARTILHAR ====== */}
                {step === 'share' && (
                    <>
                        <Form.Label className="fw-semibold">Mensagem gerada</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={14}
                            value={textoWpp}
                            readOnly
                            className="mb-3 font-monospace"
                            style={{ fontSize: '0.82rem' }}
                        />
                        {copiado && (
                            <Alert variant="success" className="py-2">
                                ✅ Texto copiado para a área de transferência!
                            </Alert>
                        )}
                        <div className="d-flex gap-2 flex-wrap">
                            <Button variant="outline-secondary" onClick={handleCopiar}>
                                <FontAwesomeIcon icon={faCopy} className="me-1" />
                                Copiar texto
                            </Button>
                            <Button
                                variant="success"
                                onClick={handleAbrirWhatsApp}
                                style={{ backgroundColor: '#25D366', borderColor: '#25D366' }}
                            >
                                <FontAwesomeIcon icon={faWhatsapp} className="me-1" />
                                Abrir WhatsApp
                            </Button>
                        </div>
                    </>
                )}

            </Modal.Body>

            <Modal.Footer>
                {step === 'select' && (
                    <>
                        <Button variant="outline-secondary" onClick={onHide}>
                            Cancelar
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleGerarPreview}
                            disabled={selectedIds.length < 2 || loadingPreview}
                        >
                            {loadingPreview ? (
                                <><Spinner animation="border" size="sm" className="me-2" />Calculando…</>
                            ) : (
                                <>Gerar prévia <FontAwesomeIcon icon={faArrowRight} className="ms-1" /></>
                            )}
                        </Button>
                    </>
                )}

                {step === 'preview' && (
                    <>
                        <Button variant="outline-secondary" onClick={() => setStep('select')}>
                            <FontAwesomeIcon icon={faArrowLeft} className="me-1" /> Voltar
                        </Button>
                        <Button
                            variant="success"
                            onClick={handleGerarWhatsApp}
                            disabled={loadingWpp || (preview?.itens.length === 0)}
                            style={{ backgroundColor: '#25D366', borderColor: '#25D366' }}
                        >
                            {loadingWpp ? (
                                <><Spinner animation="border" size="sm" className="me-2" />Gerando…</>
                            ) : (
                                <><FontAwesomeIcon icon={faWhatsapp} className="me-1" />Gerar texto WhatsApp</>
                            )}
                        </Button>
                    </>
                )}

                {step === 'share' && (
                    <>
                        <Button variant="outline-secondary" onClick={() => setStep('preview')}>
                            <FontAwesomeIcon icon={faArrowLeft} className="me-1" /> Voltar
                        </Button>
                        <Button variant="secondary" onClick={onHide}>
                            Fechar
                        </Button>
                    </>
                )}
            </Modal.Footer>
        </Modal>
    );
};

export default MergeModal;
