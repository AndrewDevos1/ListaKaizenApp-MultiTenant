import React, { useState, useEffect } from 'react';
import { Button, Modal, Form, Spinner, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import ResponsiveTable from '../../components/ResponsiveTable';

interface Item {
    id: number;
    nome: string;
    unidade_medida: string;
    fornecedor_id: number;
    fornecedor?: {
        id: number;
        nome: string;
    };
}

interface Fornecedor {
    id: number;
    nome: string;
}

const ItemManagement: React.FC = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
    const [currentItem, setCurrentItem] = useState<Partial<Item> | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        setError('');
        try {
            console.log('[ItemManagement] Buscando dados...');
            console.log('[ItemManagement] Token presente:', !!localStorage.getItem('accessToken'));

            const [itemsRes, fornecedoresRes] = await Promise.all([
                api.get('/v1/items'),
                api.get('/v1/fornecedores')
            ]);

            console.log('[ItemManagement] Itens recebidos:', itemsRes.data?.length || 0);
            console.log('[ItemManagement] Fornecedores recebidos:', fornecedoresRes.data?.length || 0);

            setItems(itemsRes.data);
            setFornecedores(fornecedoresRes.data);
        } catch (err: any) {
            console.error('[ItemManagement] Erro completo:', err);
            console.error('[ItemManagement] Status:', err.response?.status);
            console.error('[ItemManagement] Dados:', err.response?.data);
            setError(`Falha ao carregar dados: ${err.response?.data?.error || err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleShowModal = (item?: Item) => {
        if (item) {
            setCurrentItem(item);
            setIsEditing(true);
        } else {
            setCurrentItem({ nome: '', unidade_medida: '', fornecedor_id: undefined });
            setIsEditing(false);
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setCurrentItem(null);
    };

    const handleShowDeleteModal = (item: Item) => {
        setItemToDelete(item);
        setShowDeleteModal(true);
    };

    const handleCloseDeleteModal = () => {
        setItemToDelete(null);
        setShowDeleteModal(false);
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        try {
            await api.delete(`/v1/items/${itemToDelete.id}`);
            fetchData(); // Refresca a lista
            handleCloseDeleteModal();
        } catch (err) {
            setError('Falha ao deletar o item.');
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentItem?.nome || !currentItem?.unidade_medida || !currentItem?.fornecedor_id) return;

        const apiCall = isEditing
            ? api.put(`/v1/items/${currentItem.id}`, currentItem)
            : api.post('/v1/items', currentItem);

        try {
            await apiCall;
            fetchData();
            handleCloseModal();
        } catch (err) {
            setError('Falha ao salvar o item.');
        }
    };

    return (
        <div>
            <h2>Gestão de Itens</h2>
            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            <Button variant="primary" onClick={() => handleShowModal()} className="mb-3">
                <FontAwesomeIcon icon={faPlus} className="me-2" />Adicionar Item
            </Button>

            {isLoading ? (
                <div className="text-center p-4">
                    <Spinner animation="border" />
                </div>
            ) : (
                <ResponsiveTable
                    data={items}
                    columns={[
                        { header: '#', accessor: 'id' },
                        { header: 'Nome', accessor: 'nome' },
                        { header: 'Unidade de Medida', accessor: 'unidade_medida', mobileLabel: 'Unidade' },
                        {
                            header: 'Fornecedor',
                            accessor: (item: Item) => item.fornecedor?.nome || fornecedores.find(f => f.id === item.fornecedor_id)?.nome || 'N/A'
                        }
                    ]}
                    keyExtractor={(item) => item.id.toString()}
                    renderActions={(item) => (
                        <>
                            <Button variant="warning" size="sm" onClick={() => handleShowModal(item)} className="me-1">
                                <FontAwesomeIcon icon={faEdit} className="me-1" />Editar
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => handleShowDeleteModal(item)}>
                                <FontAwesomeIcon icon={faTrash} className="me-1" />Excluir
                            </Button>
                        </>
                    )}
                    emptyMessage="Nenhum item cadastrado."
                />
            )}

            {/* Modal de Adicionar/Editar */}
            <Modal show={showModal} onHide={handleCloseModal}>
                <Modal.Header closeButton>
                    <Modal.Title>{isEditing ? 'Editar Item' : 'Adicionar Novo Item'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleFormSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>Nome do Item</Form.Label>
                            <Form.Control type="text" placeholder="Ex: Tomate" value={currentItem?.nome || ''} onChange={e => setCurrentItem({...currentItem, nome: e.target.value})} required />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Unidade de Medida</Form.Label>
                            <Form.Control type="text" placeholder="Ex: Kg, Un, Lt" value={currentItem?.unidade_medida || ''} onChange={e => setCurrentItem({...currentItem, unidade_medida: e.target.value})} required />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Fornecedor</Form.Label>
                            <Form.Select value={currentItem?.fornecedor_id || ''} onChange={e => setCurrentItem({...currentItem, fornecedor_id: parseInt(e.target.value, 10)})} required>
                                <option value="" disabled>Selecione um fornecedor</option>
                                {fornecedores.map(f => (<option key={f.id} value={f.id}>{f.nome}</option>))}
                            </Form.Select>
                        </Form.Group>
                        <div className="d-grid gap-2">
                            <Button variant="primary" type="submit">{isEditing ? 'Salvar Alterações' : 'Adicionar Item'}</Button>
                            <Button variant="secondary" onClick={handleCloseModal}>Cancelar</Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>

            {/* Modal de Confirmação de Exclusão */}
            <Modal show={showDeleteModal} onHide={handleCloseDeleteModal}>
                <Modal.Header closeButton>
                    <Modal.Title>Confirmar Exclusão</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Tem certeza que deseja excluir o item <strong>{itemToDelete?.nome}</strong>?
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseDeleteModal}>Cancelar</Button>
                    <Button variant="danger" onClick={handleDelete}>Excluir</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default ItemManagement;
