import React, { useState, useEffect } from 'react';
import { Table, Spinner, Alert, Badge, Form, InputGroup, Button, Modal } from 'react-bootstrap';
import api from '../../services/api';
import styles from './VisualizarCatalogo.module.css';

interface ItemCatalogo {
    id: number;
    nome: string;
    unidade: string;
}

const VisualizarCatalogo: React.FC = () => {
    const [itens, setItens] = useState<ItemCatalogo[]>([]);
    const [filteredItens, setFilteredItens] = useState<ItemCatalogo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Estados para modal de sugestão
    const [showSugestaoModal, setShowSugestaoModal] = useState(false);
    const [nomeItem, setNomeItem] = useState('');
    const [unidade, setUnidade] = useState('');
    const [mensagem, setMensagem] = useState('');
    const [isSending, setIsSending] = useState(false);

    const fetchItens = async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await api.get('/auth/itens-globais');
            const itensData = response.data.itens || response.data;
            setItens(itensData);
            setFilteredItens(itensData);
        } catch (err: any) {
            console.error('[VisualizarCatalogo] Erro:', err);
            setError('Erro ao carregar catálogo.');
            setItens([]);
            setFilteredItens([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchItens();
    }, []);

    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredItens(itens);
        } else {
            const term = searchTerm.toLowerCase();
            setFilteredItens(itens.filter(item =>
                item.nome.toLowerCase().includes(term) ||
                item.unidade.toLowerCase().includes(term)
            ));
        }
    }, [searchTerm, itens]);

    const handleSugerirItem = async () => {
        if (!nomeItem.trim()) {
            setError('Nome do item é obrigatório.');
            return;
        }
        if (!unidade.trim()) {
            setError('Unidade é obrigatória.');
            return;
        }

        setIsSending(true);
        setError('');
        try {
            await api.post('/auth/sugestoes', {
                nome_item: nomeItem.trim(),
                unidade: unidade.trim(),
                quantidade: 1,
                mensagem_usuario: mensagem.trim() || undefined
            });

            alert('✅ Sugestão enviada com sucesso! O administrador irá analisá-la.');
            setShowSugestaoModal(false);
            setNomeItem('');
            setUnidade('');
            setMensagem('');
        } catch (err: any) {
            console.error('[VisualizarCatalogo] Erro ao enviar sugestão:', err);
            setError(err.response?.data?.error || 'Erro ao enviar sugestão.');
        } finally {
            setIsSending(false);
        }
    };

    const handleCloseSugestaoModal = () => {
        setShowSugestaoModal(false);
        setNomeItem('');
        setUnidade('');
        setMensagem('');
        setError('');
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className="mb-2">Catálogo Global de Itens</h2>
                <p className="text-muted mb-0">
                    Visualize todos os itens disponíveis no sistema.
                </p>
            </div>

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

            <div className="d-flex justify-content-between align-items-center mb-3">
                <Button
                    variant="primary"
                    onClick={() => setShowSugestaoModal(true)}
                >
                    <i className="fas fa-lightbulb me-2"></i>
                    Sugerir Novo Item
                </Button>
            </div>

            <InputGroup className={styles.searchBox}>
                <InputGroup.Text>
                    <i className="fas fa-search"></i>
                </InputGroup.Text>
                <Form.Control
                    type="text"
                    placeholder="Buscar item..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </InputGroup>

            <div className={styles.badges}>
                <Badge bg="info" className="me-2">
                    Total: {itens.length} itens
                </Badge>
                {searchTerm && (
                    <Badge bg="secondary">
                        Exibindo: {filteredItens.length} itens
                    </Badge>
                )}
            </div>

            {/* Tabela Desktop */}
            <Table striped bordered hover responsive className={styles.tableDesktop}>
                <thead className="table-dark">
                    <tr>
                        <th>#</th>
                        <th>Nome</th>
                        <th>Unidade</th>
                    </tr>
                </thead>
                <tbody>
                    {isLoading ? (
                        <tr>
                            <td colSpan={3} className="text-center py-4">
                                <Spinner animation="border" />
                                <p className="mt-2 mb-0">Carregando catálogo...</p>
                            </td>
                        </tr>
                    ) : filteredItens.length === 0 ? (
                        <tr>
                            <td colSpan={3} className="text-center py-4 text-muted">
                                {searchTerm ? 'Nenhum item encontrado.' : 'Nenhum item no catálogo.'}
                            </td>
                        </tr>
                    ) : filteredItens.map((item, index) => (
                        <tr key={item.id}>
                            <td>{index + 1}</td>
                            <td>{item.nome}</td>
                            <td>{item.unidade}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            {/* Cards Mobile */}
            <div className={styles.cardsMobile}>
                {isLoading ? (
                    <div className={styles.loadingState}>
                        <Spinner animation="border" />
                        <p className="mt-2 mb-0">Carregando catálogo...</p>
                    </div>
                ) : filteredItens.length === 0 ? (
                    <div className={styles.emptyState}>
                        {searchTerm ? 'Nenhum item encontrado.' : 'Nenhum item no catálogo.'}
                    </div>
                ) : filteredItens.map((item, index) => (
                    <div key={item.id} className={styles.itemCard}>
                        <div className={styles.cardRow}>
                            <span className={styles.cardLabel}>#</span>
                            <span className={styles.cardValue}>{index + 1}</span>
                        </div>
                        <div className={styles.cardRow}>
                            <span className={styles.cardLabel}>Nome</span>
                            <span className={styles.cardValue}><strong>{item.nome}</strong></span>
                        </div>
                        <div className={styles.cardRow}>
                            <span className={styles.cardLabel}>Unidade</span>
                            <span className={styles.cardValue}>{item.unidade}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal de Sugestão */}
            <Modal show={showSugestaoModal} onHide={handleCloseSugestaoModal}>
                <Modal.Header closeButton>
                    <Modal.Title>Sugerir Novo Item</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Alert variant="info">
                        <i className="fas fa-info-circle me-2"></i>
                        Sua sugestão será enviada ao administrador para aprovação.
                    </Alert>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Nome do Item *</Form.Label>
                            <Form.Control
                                type="text"
                                value={nomeItem}
                                onChange={(e) => setNomeItem(e.target.value)}
                                placeholder="Ex: Luva de Segurança"
                                disabled={isSending}
                                autoFocus
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Unidade *</Form.Label>
                            <Form.Control
                                type="text"
                                value={unidade}
                                onChange={(e) => setUnidade(e.target.value)}
                                placeholder="Ex: par, un, kg"
                                disabled={isSending}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Mensagem (Opcional)</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={mensagem}
                                onChange={(e) => setMensagem(e.target.value)}
                                placeholder="Explique por que este item deve ser adicionado..."
                                disabled={isSending}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseSugestaoModal} disabled={isSending}>
                        Cancelar
                    </Button>
                    <Button variant="primary" onClick={handleSugerirItem} disabled={isSending}>
                        {isSending ? (
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
        </div>
    );
};

export default VisualizarCatalogo;
