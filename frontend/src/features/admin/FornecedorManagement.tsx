import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Modal, Form, Spinner, Alert } from 'react-bootstrap';
import api from '../../services/api';

interface Fornecedor {
    id: number;
    nome: string;
    contato: string;
    meio_envio: string;
}

const FornecedorManagement: React.FC = () => {
    const navigate = useNavigate();
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
    const [currentFornecedor, setCurrentFornecedor] = useState<Partial<Fornecedor> | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [fornecedorToDelete, setFornecedorToDelete] = useState<Fornecedor | null>(null);

    const fetchFornecedores = async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await api.get('/v1/fornecedores');
            setFornecedores(response.data);
        } catch (err) {
            setError('Falha ao carregar os fornecedores.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchFornecedores();
    }, []);

    const handleShowModal = (fornecedor?: Fornecedor) => {
        if (fornecedor) {
            setCurrentFornecedor(fornecedor);
            setIsEditing(true);
        } else {
            setCurrentFornecedor({ nome: '', contato: '', meio_envio: '' });
            setIsEditing(false);
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setCurrentFornecedor(null);
    };

    const handleShowDeleteModal = (fornecedor: Fornecedor) => {
        setFornecedorToDelete(fornecedor);
        setShowDeleteModal(true);
    };

    const handleCloseDeleteModal = () => {
        setFornecedorToDelete(null);
        setShowDeleteModal(false);
    };

    const handleDelete = async () => {
        if (!fornecedorToDelete) return;
        try {
            await api.delete(`/v1/fornecedores/${fornecedorToDelete.id}`);
            fetchFornecedores();
            handleCloseDeleteModal();
        } catch (err) {
            setError('Falha ao deletar o fornecedor.');
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentFornecedor?.nome) return;

        const apiCall = isEditing
            ? api.put(`/v1/fornecedores/${currentFornecedor.id}`, currentFornecedor)
            : api.post('/v1/fornecedores', currentFornecedor);

        try {
            await apiCall;
            fetchFornecedores();
            handleCloseModal();
        } catch (err) {
            setError('Falha ao salvar o fornecedor.');
        }
    };

    return (
        <div>
            <h2>Gestão de Fornecedores</h2>
            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            <Button variant="primary" onClick={() => handleShowModal()} className="mb-3">
                <i className="fas fa-plus me-2"></i>Adicionar Fornecedor
            </Button>

            <Table striped bordered hover responsive>
                <thead className="table-dark">
                    <tr>
                        <th>#</th>
                        <th>Nome</th>
                        <th>Contato</th>
                        <th>Meio de Envio</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {isLoading ? (
                        <tr>
                            <td colSpan={5} className="text-center"><Spinner animation="border" /></td>
                        </tr>
                    ) : fornecedores.map(f => (
                        <tr key={f.id}>
                            <td>{f.id}</td>
                            <td>{f.nome}</td>
                            <td>{f.contato}</td>
                            <td>{f.meio_envio}</td>
                            <td>
                                <Button variant="info" size="sm" onClick={() => navigate(`/admin/fornecedores/${f.id}/detalhes`)} className="me-2">
                                    <i className="fas fa-eye"></i>
                                </Button>
                                <Button variant="warning" size="sm" onClick={() => handleShowModal(f)} className="me-2">
                                    <i className="fas fa-edit"></i>
                                </Button>
                                <Button variant="danger" size="sm" onClick={() => handleShowDeleteModal(f)}>
                                    <i className="fas fa-trash"></i>
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            {/* Modal de Adicionar/Editar */}
            <Modal show={showModal} onHide={handleCloseModal}>
                <Modal.Header closeButton>
                    <Modal.Title>{isEditing ? 'Editar Fornecedor' : 'Adicionar Novo Fornecedor'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleFormSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>Nome do Fornecedor</Form.Label>
                            <Form.Control type="text" placeholder="Ex: Fornecedor ABC" value={currentFornecedor?.nome || ''} onChange={e => setCurrentFornecedor({...currentFornecedor, nome: e.target.value})} required />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Contato</Form.Label>
                            <Form.Control type="text" placeholder="Ex: email@exemplo.com ou (99) 99999-9999" value={currentFornecedor?.contato || ''} onChange={e => setCurrentFornecedor({...currentFornecedor, contato: e.target.value})} required />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Meio de Envio</Form.Label>
                            <Form.Control type="text" placeholder="Ex: Email, WhatsApp" value={currentFornecedor?.meio_envio || ''} onChange={e => setCurrentFornecedor({...currentFornecedor, meio_envio: e.target.value})} required />
                        </Form.Group>
                        <div className="d-grid gap-2">
                            <Button variant="primary" type="submit">{isEditing ? 'Salvar Alterações' : 'Adicionar Fornecedor'}</Button>
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
                    Tem certeza que deseja excluir o fornecedor <strong>{fornecedorToDelete?.nome}</strong>?
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseDeleteModal}>Cancelar</Button>
                    <Button variant="danger" onClick={handleDelete}>Excluir</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default FornecedorManagement;
