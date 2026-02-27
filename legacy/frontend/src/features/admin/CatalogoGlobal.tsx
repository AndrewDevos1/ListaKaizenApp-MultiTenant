import React, { useState, useEffect, useCallback } from 'react';
import { Table, Spinner, Alert, Badge, Form, InputGroup, Button, Modal } from 'react-bootstrap';
import api from '../../services/api';
import { formatarDataBrasiliaSemHora } from '../../utils/dateFormatter';
import styles from './CatalogoGlobal.module.css';
import { useAuth } from '../../context/AuthContext';

interface CatalogoItem {
    id: number;
    nome: string;
    unidade: string;
    total_listas: number;
    criado_em: string | null;
    atualizado_em: string | null;
}

interface CatalogoResponse {
    itens: CatalogoItem[];
    total: number;
}

interface Restaurante {
    id: number;
    nome: string;
}

const CatalogoGlobal: React.FC = () => {
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    const [itens, setItens] = useState<CatalogoItem[]>([]);
    const [filteredItens, setFilteredItens] = useState<CatalogoItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showEditModal, setShowEditModal] = useState(false);
    const [itemEditando, setItemEditando] = useState<CatalogoItem | null>(null);
    const [nomeEdit, setNomeEdit] = useState('');
    const [unidadeEdit, setUnidadeEdit] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [nomeNovo, setNomeNovo] = useState('');
    const [unidadeNova, setUnidadeNova] = useState('');
    const [restaurantes, setRestaurantes] = useState<Restaurante[]>([]);
    const [restauranteSelecionado, setRestauranteSelecionado] = useState<string>('all');

    const fetchRestaurantes = useCallback(async () => {
        try {
            const response = await api.get('/admin/restaurantes');
            setRestaurantes(response.data.restaurantes || []);
        } catch (err: any) {
            console.error('[CatalogoGlobal] Erro ao carregar restaurantes:', err);
            setError(err.response?.data?.error || 'Erro ao carregar restaurantes.');
        }
    }, []);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            console.log('[CatalogoGlobal] Buscando catálogo...');
            const params = isSuperAdmin && restauranteSelecionado !== 'all'
                ? { restaurante_id: restauranteSelecionado }
                : undefined;
            const response = await api.get<CatalogoResponse>('/admin/catalogo-global', { params });
            console.log('[CatalogoGlobal] Resposta:', response.data);

            const itensData = response.data.itens || [];
            setItens(itensData);
            setFilteredItens(itensData);
        } catch (err: any) {
            console.error('[CatalogoGlobal] Erro:', err);
            setError(`Falha ao carregar catálogo: ${err.response?.data?.error || err.message}`);
            setItens([]);
            setFilteredItens([]);
        } finally {
            setIsLoading(false);
        }
    }, [isSuperAdmin, restauranteSelecionado]);

    useEffect(() => {
        if (isSuperAdmin) {
            fetchRestaurantes();
        }
    }, [isSuperAdmin, fetchRestaurantes]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (!itens || !Array.isArray(itens)) {
            setFilteredItens([]);
            return;
        }

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

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return formatarDataBrasiliaSemHora(dateStr);
    };

    const handleEditClick = (item: CatalogoItem) => {
        setItemEditando(item);
        setNomeEdit(item.nome);
        setUnidadeEdit(item.unidade);
        setShowEditModal(true);
    };

    const handleCloseModal = () => {
        setShowEditModal(false);
        setItemEditando(null);
        setNomeEdit('');
        setUnidadeEdit('');
        setError('');
    };

    const handleSaveEdit = async () => {
        if (!itemEditando) return;

        if (!nomeEdit.trim()) {
            setError('Nome do item é obrigatório.');
            return;
        }
        if (!unidadeEdit.trim()) {
            setError('Unidade é obrigatória.');
            return;
        }

        setIsSaving(true);
        setError('');
        try {
            await api.put(`/admin/catalogo-global/${itemEditando.id}`, {
                nome: nomeEdit.trim(),
                unidade: unidadeEdit.trim()
            });

            // Atualiza a lista local
            const updatedItens = itens.map(item =>
                item.id === itemEditando.id
                    ? { ...item, nome: nomeEdit.trim(), unidade: unidadeEdit.trim() }
                    : item
            );
            setItens(updatedItens);
            setFilteredItens(updatedItens.filter(item =>
                item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.unidade.toLowerCase().includes(searchTerm.toLowerCase())
            ));

            handleCloseModal();
        } catch (err: any) {
            console.error('[CatalogoGlobal] Erro ao salvar:', err);
            setError(err.response?.data?.error || 'Erro ao atualizar item.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddItem = async () => {
        if (!nomeNovo.trim()) {
            setError('Nome do item é obrigatório.');
            return;
        }
        if (!unidadeNova.trim()) {
            setError('Unidade é obrigatória.');
            return;
        }
        if (isSuperAdmin && restauranteSelecionado === 'all') {
            setError('Selecione um restaurante para adicionar o item.');
            return;
        }

        setIsSaving(true);
        setError('');
        try {
            const payload: Record<string, any> = {
                nome: nomeNovo.trim(),
                unidade: unidadeNova.trim()
            };
            if (isSuperAdmin) {
                payload.restaurante_id = Number(restauranteSelecionado);
            }
            const response = await api.post('/admin/catalogo-global', payload);

            const novoItem = response.data.item;
            const updatedItens = [...itens, novoItem];
            setItens(updatedItens);
            setFilteredItens(updatedItens);

            setShowAddModal(false);
            setNomeNovo('');
            setUnidadeNova('');
        } catch (err: any) {
            console.error('[CatalogoGlobal] Erro ao criar item:', err);
            setError(err.response?.data?.error || 'Erro ao criar item.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCloseAddModal = () => {
        setShowAddModal(false);
        setNomeNovo('');
        setUnidadeNova('');
        setError('');
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className="mb-2">Catálogo Global de Itens</h2>
                <p className="text-muted mb-0">
                    Este catálogo contém todos os itens cadastrados no sistema.
                    Itens são adicionados automaticamente quando você importa listas.
                </p>
            </div>

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <Button
                    variant="success"
                    onClick={() => setShowAddModal(true)}
                >
                    <i className="fas fa-plus me-2"></i>
                    Adicionar Item
                </Button>
                {isSuperAdmin && (
                    <Form.Select
                        aria-label="Selecionar restaurante"
                        value={restauranteSelecionado}
                        onChange={(e) => setRestauranteSelecionado(e.target.value)}
                        style={{ maxWidth: 320 }}
                    >
                        <option value="all">Todos os restaurantes</option>
                        {restaurantes.map((restaurante) => (
                            <option key={restaurante.id} value={restaurante.id}>
                                {restaurante.nome}
                            </option>
                        ))}
                    </Form.Select>
                )}
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
                        <th>Listas Vinculadas</th>
                        <th>Cadastrado em</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {isLoading ? (
                        <tr>
                            <td colSpan={6} className="text-center py-4">
                                <Spinner animation="border" />
                                <p className="mt-2 mb-0">Carregando catálogo...</p>
                            </td>
                        </tr>
                    ) : filteredItens.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="text-center py-4 text-muted">
                                {searchTerm ? 'Nenhum item encontrado com esse termo.' : 'Nenhum item no catálogo.'}
                            </td>
                        </tr>
                    ) : filteredItens.map((item, index) => (
                        <tr key={item.id}>
                            <td>{index + 1}</td>
                            <td>{item.nome}</td>
                            <td>{item.unidade}</td>
                            <td>
                                <Badge bg={item.total_listas > 0 ? 'success' : 'secondary'}>
                                    {item.total_listas} lista(s)
                                </Badge>
                            </td>
                            <td>{formatDate(item.criado_em)}</td>
                            <td>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => handleEditClick(item)}
                                >
                                    <i className="fas fa-edit me-1"></i>
                                    Editar
                                </Button>
                            </td>
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
                        {searchTerm ? 'Nenhum item encontrado com esse termo.' : 'Nenhum item no catálogo.'}
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
                        <div className={styles.cardRow}>
                            <span className={styles.cardLabel}>Listas</span>
                            <span className={styles.cardValue}>
                                <Badge bg={item.total_listas > 0 ? 'success' : 'secondary'}>
                                    {item.total_listas} lista(s)
                                </Badge>
                            </span>
                        </div>
                        <div className={styles.cardRow}>
                            <span className={styles.cardLabel}>Cadastrado</span>
                            <span className={styles.cardValue}>{formatDate(item.criado_em)}</span>
                        </div>
                        <div className={styles.cardRow}>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleEditClick(item)}
                                className="w-100"
                            >
                                <i className="fas fa-edit me-1"></i>
                                Editar Item
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal de Edição */}
            <Modal show={showEditModal} onHide={handleCloseModal}>
                <Modal.Header closeButton>
                    <Modal.Title>Editar Item do Catálogo</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Nome do Item</Form.Label>
                            <Form.Control
                                type="text"
                                value={nomeEdit}
                                onChange={(e) => setNomeEdit(e.target.value)}
                                placeholder="Ex: Arroz Integral"
                                disabled={isSaving}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Unidade</Form.Label>
                            <Form.Control
                                type="text"
                                value={unidadeEdit}
                                onChange={(e) => setUnidadeEdit(e.target.value)}
                                placeholder="Ex: kg, un, litro"
                                disabled={isSaving}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseModal} disabled={isSaving}>
                        Cancelar
                    </Button>
                    <Button variant="primary" onClick={handleSaveEdit} disabled={isSaving}>
                        {isSaving ? (
                            <>
                                <Spinner as="span" animation="border" size="sm" className="me-2" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-save me-1"></i>
                                Salvar
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal de Adicionar Item */}
            <Modal show={showAddModal} onHide={handleCloseAddModal}>
                <Modal.Header closeButton>
                    <Modal.Title>Adicionar Novo Item ao Catálogo</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Nome do Item *</Form.Label>
                            <Form.Control
                                type="text"
                                value={nomeNovo}
                                onChange={(e) => setNomeNovo(e.target.value)}
                                placeholder="Ex: Arroz Integral"
                                disabled={isSaving}
                                autoFocus
                            />
                            <Form.Text className="text-muted">
                                O nome deve ser único no sistema.
                            </Form.Text>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Unidade *</Form.Label>
                            <Form.Control
                                type="text"
                                value={unidadeNova}
                                onChange={(e) => setUnidadeNova(e.target.value)}
                                placeholder="Ex: kg, un, litro"
                                disabled={isSaving}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseAddModal} disabled={isSaving}>
                        Cancelar
                    </Button>
                    <Button variant="success" onClick={handleAddItem} disabled={isSaving}>
                        {isSaving ? (
                            <>
                                <Spinner as="span" animation="border" size="sm" className="me-2" />
                                Criando...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-plus me-1"></i>
                                Criar Item
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default CatalogoGlobal;
