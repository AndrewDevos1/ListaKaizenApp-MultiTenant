import React, { useState, useEffect } from 'react';
import { Table, Spinner, Alert, Badge, Button, Modal, Form } from 'react-bootstrap';
import api from '../../services/api';
import styles from './GerenciarSugestoes.module.css';

interface Sugestao {
    id: number;
    usuario_nome: string;
    lista_nome: string;
    nome_item: string;
    unidade: string;
    quantidade: number;
    mensagem_usuario: string | null;
    criado_em: string;
}

const GerenciarSugestoes: React.FC = () => {
    const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [sugestaoSelecionada, setSugestaoSelecionada] = useState<Sugestao | null>(null);
    const [showAprovarModal, setShowAprovarModal] = useState(false);
    const [showRejeitarModal, setShowRejeitarModal] = useState(false);
    const [mensagemAdmin, setMensagemAdmin] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        fetchSugestoes();
    }, []);

    const fetchSugestoes = async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await api.get('/admin/sugestoes/pendentes');
            setSugestoes(response.data.sugestoes || []);
        } catch (err: any) {
            console.error('[GerenciarSugestoes] Erro:', err);
            setError('Erro ao carregar sugestões.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAprovar = (sugestao: Sugestao) => {
        setSugestaoSelecionada(sugestao);
        setMensagemAdmin('');
        setShowAprovarModal(true);
    };

    const handleRejeitar = (sugestao: Sugestao) => {
        setSugestaoSelecionada(sugestao);
        setMensagemAdmin('');
        setShowRejeitarModal(true);
    };

    const confirmarAprovacao = async () => {
        if (!sugestaoSelecionada) return;

        setIsProcessing(true);
        setError('');
        try {
            await api.put(`/admin/sugestoes/${sugestaoSelecionada.id}/aprovar`, {
                mensagem_admin: mensagemAdmin.trim() || undefined
            });

            setShowAprovarModal(false);
            setSugestaoSelecionada(null);
            setMensagemAdmin('');
            fetchSugestoes(); // Recarrega lista
        } catch (err: any) {
            console.error('[GerenciarSugestoes] Erro ao aprovar:', err);
            setError(err.response?.data?.error || 'Erro ao aprovar sugestão.');
        } finally {
            setIsProcessing(false);
        }
    };

    const confirmarRejeicao = async () => {
        if (!sugestaoSelecionada) return;

        if (!mensagemAdmin.trim()) {
            setError('Mensagem explicativa é obrigatória ao rejeitar.');
            return;
        }

        setIsProcessing(true);
        setError('');
        try {
            await api.put(`/admin/sugestoes/${sugestaoSelecionada.id}/rejeitar`, {
                mensagem_admin: mensagemAdmin.trim()
            });

            setShowRejeitarModal(false);
            setSugestaoSelecionada(null);
            setMensagemAdmin('');
            fetchSugestoes(); // Recarrega lista
        } catch (err: any) {
            console.error('[GerenciarSugestoes] Erro ao rejeitar:', err);
            setError(err.response?.data?.error || 'Erro ao rejeitar sugestão.');
        } finally {
            setIsProcessing(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2>Gerenciar Sugestões de Itens</h2>
                <Badge bg="primary" className={styles.badge}>
                    {sugestoes.length} pendente(s)
                </Badge>
            </div>

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

            {isLoading ? (
                <div className="text-center py-5">
                    <Spinner animation="border" />
                    <p className="mt-2">Carregando sugestões...</p>
                </div>
            ) : sugestoes.length === 0 ? (
                <Alert variant="success">
                    <i className="fas fa-check-circle me-2"></i>
                    Nenhuma sugestão pendente no momento.
                </Alert>
            ) : (
                <Table striped bordered hover responsive>
                    <thead className="table-dark">
                        <tr>
                            <th>Usuário</th>
                            <th>Lista</th>
                            <th>Item Sugerido</th>
                            <th>Unidade</th>
                            <th>Qtd</th>
                            <th>Data</th>
                            <th>Mensagem</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sugestoes.map((sug) => (
                            <tr key={sug.id}>
                                <td>{sug.usuario_nome}</td>
                                <td>{sug.lista_nome}</td>
                                <td><strong>{sug.nome_item}</strong></td>
                                <td>{sug.unidade}</td>
                                <td>{sug.quantidade}</td>
                                <td>{formatDate(sug.criado_em)}</td>
                                <td>
                                    {sug.mensagem_usuario ? (
                                        <div className={styles.mensagem}>
                                            {sug.mensagem_usuario}
                                        </div>
                                    ) : (
                                        <span className="text-muted">-</span>
                                    )}
                                </td>
                                <td>
                                    <div className={styles.actionButtons}>
                                        <Button
                                            variant="success"
                                            size="sm"
                                            onClick={() => handleAprovar(sug)}
                                        >
                                            <i className="fas fa-check me-1"></i>
                                            Aprovar
                                        </Button>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => handleRejeitar(sug)}
                                        >
                                            <i className="fas fa-times me-1"></i>
                                            Rejeitar
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}

            {/* Modal Aprovar */}
            <Modal show={showAprovarModal} onHide={() => !isProcessing && setShowAprovarModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Aprovar Sugestão</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {sugestaoSelecionada && (
                        <>
                            <Alert variant="info">
                                Você está aprovando a adição do item <strong>{sugestaoSelecionada.nome_item}</strong> ao catálogo global.
                            </Alert>
                            <Form.Group>
                                <Form.Label>Mensagem ao usuário (opcional)</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    value={mensagemAdmin}
                                    onChange={(e) => setMensagemAdmin(e.target.value)}
                                    placeholder="Ex: Item aprovado e adicionado ao catálogo!"
                                    disabled={isProcessing}
                                />
                            </Form.Group>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAprovarModal(false)} disabled={isProcessing}>
                        Cancelar
                    </Button>
                    <Button variant="success" onClick={confirmarAprovacao} disabled={isProcessing}>
                        {isProcessing ? (
                            <>
                                <Spinner as="span" animation="border" size="sm" className="me-2" />
                                Aprovando...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-check me-1"></i>
                                Confirmar Aprovação
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal Rejeitar */}
            <Modal show={showRejeitarModal} onHide={() => !isProcessing && setShowRejeitarModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Rejeitar Sugestão</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {sugestaoSelecionada && (
                        <>
                            <Alert variant="warning">
                                Você está rejeitando a sugestão do item <strong>{sugestaoSelecionada.nome_item}</strong>.
                            </Alert>
                            <Form.Group>
                                <Form.Label>Motivo da rejeição *</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    value={mensagemAdmin}
                                    onChange={(e) => setMensagemAdmin(e.target.value)}
                                    placeholder="Explique o motivo da rejeição..."
                                    disabled={isProcessing}
                                    required
                                />
                                <Form.Text className="text-muted">
                                    Campo obrigatório ao rejeitar.
                                </Form.Text>
                            </Form.Group>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowRejeitarModal(false)} disabled={isProcessing}>
                        Cancelar
                    </Button>
                    <Button variant="danger" onClick={confirmarRejeicao} disabled={isProcessing}>
                        {isProcessing ? (
                            <>
                                <Spinner as="span" animation="border" size="sm" className="me-2" />
                                Rejeitando...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-times me-1"></i>
                                Confirmar Rejeição
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default GerenciarSugestoes;
