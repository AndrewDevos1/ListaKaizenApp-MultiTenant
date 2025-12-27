import React, { useState } from 'react';
import { Modal, Form, Button, Spinner, Alert } from 'react-bootstrap';
import api from '../services/api';

interface SugerirItemModalProps {
    show: boolean;
    onHide: () => void;
    listaId: number;
    listaNome: string;
    onSucessoEnvio: () => void;
}

const SugerirItemModal: React.FC<SugerirItemModalProps> = ({
    show,
    onHide,
    listaId,
    listaNome,
    onSucessoEnvio
}) => {
    const [nomeItem, setNomeItem] = useState('');
    const [unidade, setUnidade] = useState('');
    const [quantidade, setQuantidade] = useState('');
    const [mensagem, setMensagem] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleClose = () => {
        setNomeItem('');
        setUnidade('');
        setQuantidade('');
        setMensagem('');
        setError('');
        onHide();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!nomeItem.trim()) {
            setError('Nome do item é obrigatório.');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post('/auth/sugestoes', {
                lista_id: listaId,
                nome_item: nomeItem.trim(),
                unidade: unidade.trim() || 'un',
                quantidade: quantidade ? parseFloat(quantidade) : 1,
                mensagem_usuario: mensagem.trim()
            });

            onSucessoEnvio();
            handleClose();
        } catch (err: any) {
            console.error('[SugerirItem] Erro:', err);
            setError(err.response?.data?.error || 'Erro ao enviar sugestão.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Sugerir Novo Item</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                
                <Alert variant="info">
                    <i className="fas fa-info-circle me-2"></i>
                    Você está sugerindo um item para a lista <strong>{listaNome}</strong>. 
                    O administrador irá analisar sua solicitação.
                </Alert>

                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                        <Form.Label>Nome do Item *</Form.Label>
                        <Form.Control
                            type="text"
                            value={nomeItem}
                            onChange={(e) => setNomeItem(e.target.value)}
                            placeholder="Ex: Farinha de Trigo Integral"
                            disabled={isSubmitting}
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Unidade (opcional)</Form.Label>
                        <Form.Control
                            type="text"
                            value={unidade}
                            onChange={(e) => setUnidade(e.target.value)}
                            placeholder="Ex: kg, un, litro, pacote (opcional)"
                            disabled={isSubmitting}
                        />
                        <Form.Text className="text-muted">
                            Se não informar, o admin definirá a unidade.
                        </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Quantidade Desejada (opcional)</Form.Label>
                        <Form.Control
                            type="number"
                            step="0.01"
                            value={quantidade}
                            onChange={(e) => setQuantidade(e.target.value)}
                            placeholder="Ex: 5 (opcional)"
                            disabled={isSubmitting}
                        />
                        <Form.Text className="text-muted">
                            Se não informar, o admin definirá a quantidade.
                        </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Mensagem ao Administrador (opcional)</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            value={mensagem}
                            onChange={(e) => setMensagem(e.target.value)}
                            placeholder="Explique por que este item é necessário..."
                            disabled={isSubmitting}
                        />
                        <Form.Text className="text-muted">
                            Use este campo para justificar a necessidade do item.
                        </Form.Text>
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
                    Cancelar
                </Button>
                <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                            <Spinner as="span" animation="border" size="sm" className="me-2" />
                            Enviando...
                        </>
                    ) : (
                        <>
                            <i className="fas fa-paper-plane me-1"></i>
                            Enviar Sugestão
                        </>
                    )}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default SugerirItemModal;
