import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, ProgressBar, Form, Alert, Modal } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { faArrowLeft, faCheckCircle, faCheckSquare, faCopy } from '@fortawesome/free-solid-svg-icons';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { isOfflineError } from '../../services/offlineDrafts';
import { formatarDataHoraBrasilia } from '../../utils/dateFormatter';
import styles from './DetalhesChecklist.module.css';

interface ChecklistItem {
    id: number;
    item_nome: string;
    quantidade: number | null;
    unidade: string | null;
    fornecedor_nome?: string;
    observacao?: string;
    marcado: boolean;
    marcado_em?: string;
}

interface Checklist {
    id: number;
    nome: string;
    status: 'ATIVO' | 'FINALIZADO';
    criado_em: string;
    finalizado_em?: string;
    total_itens: number;
    itens_marcados: number;
    progresso_percentual: number;
    submissao?: {
        lista: {
            nome: string;
        };
    };
    itens: ChecklistItem[];
}
type Feedback = {
    variant: 'danger' | 'success' | 'info';
    message: string;
};

const DetalhesChecklist: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [checklist, setChecklist] = useState<Checklist | null>(null);
    const [loading, setLoading] = useState(true);
    const [finalizando, setFinalizando] = useState(false);
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [textoCopiar, setTextoCopiar] = useState('');
    const [mostrarModalCopiar, setMostrarModalCopiar] = useState(false);
    const navigate = useNavigate();

    const fetchChecklist = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get(`/admin/checklists/${id}`);
            setChecklist(response.data);
        } catch (error: any) {
            if (isOfflineError(error)) {
                setFeedback({ variant: 'info', message: 'Sem conexão. Tente novamente quando estiver online.' });
            } else {
                setFeedback({ variant: 'danger', message: 'Erro ao carregar checklist' });
            }
            console.error(error);
            if (!isOfflineError(error)) {
                navigate('/admin/checklists');
            }
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        fetchChecklist();
    }, [fetchChecklist]);

    const handleMarcarItem = async (itemId: number, marcado: boolean) => {
        if (!checklist || checklist.status === 'FINALIZADO') return;

        const itemAnterior = checklist.itens.find((item) => item.id === itemId);

        const aplicarMudancaLocal = (valor: boolean) => {
            setChecklist((prev) => {
                if (!prev) return prev;
                const novosItens = prev.itens.map((item) =>
                    item.id === itemId
                        ? { ...item, marcado: valor, marcado_em: valor ? new Date().toISOString() : undefined }
                        : item
                );
                const itensMarcados = novosItens.filter((i) => i.marcado).length;
                return {
                    ...prev,
                    itens: novosItens,
                    itens_marcados: itensMarcados,
                    progresso_percentual: (itensMarcados / prev.total_itens) * 100,
                };
            });
        };

        aplicarMudancaLocal(marcado);

        try {
            await api.put(`/admin/checklists/${checklist.id}/itens/${itemId}/marcar`, { marcado });
        } catch (error: any) {
            if (isOfflineError(error)) {
                setFeedback({
                    variant: 'info',
                    message: 'Sem conexão. Marcação salva localmente e será sincronizada.',
                });
                return;
            }
            if (itemAnterior) {
                aplicarMudancaLocal(itemAnterior.marcado);
            }
            setFeedback({ variant: 'danger', message: 'Erro ao marcar item' });
            console.error(error);
        }
    };

    const handleFinalizar = async () => {
        if (!checklist) return;

        if (window.confirm('Deseja realmente finalizar este checklist?')) {
            try {
                setFinalizando(true);
                await api.post(`/admin/checklists/${checklist.id}/finalizar`);
                setFeedback({ variant: 'success', message: 'Checklist finalizado com sucesso!' });
                fetchChecklist();
            } catch (error: any) {
                if (isOfflineError(error)) {
                    setFeedback({
                        variant: 'info',
                        message: 'Sem conexão. Finalização será sincronizada.',
                    });
                    return;
                }
                setFeedback({ variant: 'danger', message: error.response?.data?.error || 'Erro ao finalizar checklist' });
            } finally {
                setFinalizando(false);
            }
        }
    };

    const handleReabrir = async () => {
        if (!checklist) return;

        if (window.confirm('Deseja reabrir este checklist? Você poderá voltar a marcar/desmarcar itens.')) {
            try {
                setFinalizando(true);
                await api.post(`/admin/checklists/${checklist.id}/reabrir`);
                setFeedback({ variant: 'success', message: 'Checklist reaberto com sucesso!' });
                fetchChecklist();
            } catch (error: any) {
                if (isOfflineError(error)) {
                    setFeedback({
                        variant: 'info',
                        message: 'Sem conexão. Reabertura será sincronizada.',
                    });
                    return;
                }
                setFeedback({ variant: 'danger', message: error.response?.data?.error || 'Erro ao reabrir checklist' });
            } finally {
                setFinalizando(false);
            }
        }
    };

    const handleCompartilharWhatsApp = async () => {
        if (!checklist) return;

        const popup = window.open('about:blank', '_blank');

        try {
            const texto = await buscarTextoWhatsApp(checklist.id);
            const copiado = await copiarTexto(texto);

            // Abrir WhatsApp Web com encoding que preserva emojis
            const url = new URL('https://wa.me/');
            url.searchParams.set('text', texto);
            if (popup) {
                popup.location.href = url.toString();
            } else {
                window.location.href = url.toString();
            }

            setFeedback({
                variant: copiado ? 'success' : 'info',
                message: copiado ? 'Texto copiado e WhatsApp aberto!' : 'WhatsApp aberto. Copie o texto manualmente.',
            });

            if (!copiado) {
                abrirModalCopiar(texto);
            }
        } catch (error: any) {
            if (popup) {
                popup.close();
            }
            if (isOfflineError(error)) {
                setFeedback({ variant: 'info', message: 'Sem conexão. Não foi possível gerar o texto agora.' });
            } else {
                setFeedback({ variant: 'danger', message: 'Erro ao gerar texto para WhatsApp' });
            }
            console.error(error);
        }
    };

    const handleCopiarTexto = async () => {
        if (!checklist) return;

        try {
            const texto = await buscarTextoWhatsApp(checklist.id);
            const copiado = await copiarTexto(texto);
            if (!copiado) {
                abrirModalCopiar(texto);
            }
            setFeedback({
                variant: copiado ? 'success' : 'info',
                message: copiado ? 'Texto copiado com sucesso!' : 'Texto gerado. Copie manualmente.',
            });
        } catch (error: any) {
            if (isOfflineError(error)) {
                setFeedback({ variant: 'info', message: 'Sem conexão. Não foi possível gerar o texto agora.' });
            } else {
                setFeedback({ variant: 'danger', message: 'Erro ao copiar texto do checklist' });
            }
            console.error(error);
        }
    };

    const handleCopiarTextoModal = async () => {
        if (!textoCopiar) return;

        const copiado = await copiarTexto(textoCopiar);
        setFeedback({
            variant: copiado ? 'success' : 'info',
            message: copiado ? 'Texto copiado com sucesso!' : 'Selecione o texto e copie manualmente.',
        });

        if (copiado) {
            setMostrarModalCopiar(false);
        }
    };

    const abrirModalCopiar = (texto: string) => {
        setTextoCopiar(texto);
        setMostrarModalCopiar(true);
    };

    const buscarTextoWhatsApp = async (checklistId: number) => {
        const response = await api.get(`/admin/checklists/${checklistId}/whatsapp`);
        return response.data.texto as string;
    };

    const copiarTexto = async (texto: string) => {
        if (navigator.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(texto);
                return true;
            } catch (error) {
                console.warn('[Checklist] Falha ao copiar via clipboard:', error);
            }
        }

        const textarea = document.createElement('textarea');
        textarea.value = texto;
        textarea.style.position = 'fixed';
        textarea.style.top = '-1000px';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        try {
            return document.execCommand('copy');
        } catch (error) {
            console.warn('[Checklist] Falha ao copiar via execCommand:', error);
            return false;
        } finally {
            document.body.removeChild(textarea);
        }
    };

    const formatarData = (dataString: string) => {
        return formatarDataHoraBrasilia(dataString);
    };

    const getVariantProgresso = (percentual: number) => {
        if (percentual === 100) return 'success';
        if (percentual >= 50) return 'info';
        return 'warning';
    };

    if (loading) {
        return (
            <Container fluid className="py-4">
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Carregando...</span>
                    </div>
                </div>
            </Container>
        );
    }

    if (!checklist) {
        return (
            <Container fluid className="py-4">
                {feedback && (
                    <Alert variant={feedback.variant} dismissible onClose={() => setFeedback(null)} className="mb-4">
                        {feedback.message}
                    </Alert>
                )}
                <Button variant="outline-secondary" onClick={() => navigate('/admin/checklists')}>
                    <FontAwesomeIcon icon={faArrowLeft} /> Voltar
                </Button>
            </Container>
        );
    }

    return (
        <Container fluid className="py-4">
            {/* Header */}
            <Row className="mb-4">
                <Col>
                    <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-3">
                            <Button variant="outline-secondary" onClick={() => navigate('/admin/checklists')}>
                                <FontAwesomeIcon icon={faArrowLeft} />
                            </Button>
                            <div>
                                <h2 className="mb-0">{checklist.nome}</h2>
                                {checklist.submissao && (
                                    <p className="text-muted mb-0">Lista: {checklist.submissao.lista.nome}</p>
                                )}
                            </div>
                        </div>
                        <Badge bg={checklist.status === 'ATIVO' ? 'success' : 'secondary'} style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                            {checklist.status}
                        </Badge>
                    </div>
                </Col>
            </Row>

            {feedback && (
                <Alert variant={feedback.variant} dismissible onClose={() => setFeedback(null)} className="mb-4">
                    {feedback.message}
                </Alert>
            )}

            {/* Card de Progresso */}
            <Card className="mb-4">
                <Card.Body>
                    <Row>
                        <Col md={8}>
                            <h5 className="mb-3">Progresso</h5>
                            <ProgressBar
                                now={checklist.progresso_percentual}
                                label={`${checklist.progresso_percentual.toFixed(0)}%`}
                                variant={getVariantProgresso(checklist.progresso_percentual)}
                                style={{ height: '30px', fontSize: '1rem' }}
                            />
                            <p className="text-muted mt-2 mb-0">
                                {checklist.itens_marcados} de {checklist.total_itens} itens marcados
                            </p>
                        </Col>
                        <Col md={4} className="d-flex flex-column gap-2">
                            <Button
                                variant="success"
                                onClick={handleCompartilharWhatsApp}
                                className="d-flex align-items-center justify-content-center gap-2"
                            >
                                <FontAwesomeIcon icon={faWhatsapp} />
                                Compartilhar WhatsApp
                            </Button>
                            <Button
                                variant="outline-primary"
                                onClick={handleCopiarTexto}
                                className="d-flex align-items-center justify-content-center gap-2"
                            >
                                <FontAwesomeIcon icon={faCopy} />
                                Copiar Texto
                            </Button>
                            {checklist.status === 'ATIVO' && (
                                <Button
                                    variant="primary"
                                    onClick={handleFinalizar}
                                    disabled={finalizando}
                                    className="d-flex align-items-center justify-content-center gap-2"
                                >
                                    <FontAwesomeIcon icon={faCheckCircle} />
                                    {finalizando ? 'Finalizando...' : 'Finalizar Checklist'}
                                </Button>
                            )}
                            {checklist.status === 'FINALIZADO' && (
                                <Button
                                    variant="warning"
                                    onClick={handleReabrir}
                                    disabled={finalizando}
                                    className="d-flex align-items-center justify-content-center gap-2"
                                >
                                    <FontAwesomeIcon icon={faCheckCircle} />
                                    {finalizando ? 'Reabrindo...' : 'Reabrir Checklist'}
                                </Button>
                            )}
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Alerta se finalizado */}
            {checklist.status === 'FINALIZADO' && (
                <Alert variant="info" className="mb-4">
                    <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                    Este checklist foi finalizado em {formatarData(checklist.finalizado_em!)}.
                    Os itens não podem mais ser modificados.
                </Alert>
            )}

            {/* Tabela de Itens */}
            <Card>
                <Card.Body>
                    <h5 className="mb-3">Itens do Checklist</h5>
                    <Table hover responsive>
                        <thead>
                            <tr>
                                <th style={{ width: '50px' }}>
                                    <FontAwesomeIcon icon={faCheckSquare} />
                                </th>
                                <th>Item</th>
                                {checklist.itens.some(item => item.quantidade !== null && item.quantidade !== undefined) && <th>Pedido</th>}
                                {checklist.itens.some(item => item.fornecedor_nome) && <th>Fornecedor</th>}
                                {checklist.itens.some(item => item.observacao) && <th>Observações</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {checklist.itens.map((item) => (
                                <tr
                                    key={item.id}
                                    className={item.marcado ? styles.itemMarcado : ''}
                                    style={{ cursor: checklist.status === 'ATIVO' ? 'pointer' : 'default' }}
                                    onClick={() => checklist.status === 'ATIVO' && handleMarcarItem(item.id, !item.marcado)}
                                >
                                    <td>
                                        <Form.Check
                                            type="checkbox"
                                            checked={item.marcado}
                                            onChange={(e) => handleMarcarItem(item.id, e.target.checked)}
                                            disabled={checklist.status === 'FINALIZADO'}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </td>
                                    <td>
                                        <strong className={item.marcado ? 'text-decoration-line-through text-muted' : ''}>
                                            {item.item_nome}
                                        </strong>
                                    </td>
                                    {checklist.itens.some(item => item.quantidade !== null && item.quantidade !== undefined) && (
                                        <td>
                                            {item.quantidade} {item.unidade}
                                        </td>
                                    )}
                                    {checklist.itens.some(item => item.fornecedor_nome) && (
                                        <td>{item.fornecedor_nome || '-'}</td>
                                    )}
                                    {checklist.itens.some(item => item.observacao) && (
                                        <td>{item.observacao || '-'}</td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>

            {/* Informações Adicionais */}
            <Card className="mt-4">
                <Card.Body>
                    <Row>
                        <Col md={6}>
                            <p className="mb-1">
                                <strong>Criado em:</strong> {formatarData(checklist.criado_em)}
                            </p>
                        </Col>
                        {checklist.finalizado_em && (
                            <Col md={6}>
                                <p className="mb-1">
                                    <strong>Finalizado em:</strong> {formatarData(checklist.finalizado_em)}
                                </p>
                            </Col>
                        )}
                    </Row>
                </Card.Body>
            </Card>

            <Modal
                show={mostrarModalCopiar}
                onHide={() => setMostrarModalCopiar(false)}
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>Copiar texto do checklist</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Control
                        as="textarea"
                        rows={10}
                        value={textoCopiar}
                        readOnly
                        onFocus={(event) => event.currentTarget.select()}
                    />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setMostrarModalCopiar(false)}>
                        Fechar
                    </Button>
                    <Button variant="primary" onClick={handleCopiarTextoModal}>
                        Copiar texto
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default DetalhesChecklist;
