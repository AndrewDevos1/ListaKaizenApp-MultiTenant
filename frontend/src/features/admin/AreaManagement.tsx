import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Spinner, Alert } from 'react-bootstrap';
import api from '../../services/api';
import Layout from '../../components/Layout';

interface Area {
    id: number;
    nome: string;
}

const AreaManagement: React.FC = () => {
    const [areas, setAreas] = useState<Area[]>([]);
    const [currentArea, setCurrentArea] = useState<Partial<Area> | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [areaToDelete, setAreaToDelete] = useState<Area | null>(null);

    const fetchAreas = async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await api.get('/v1/areas');
            setAreas(response.data);
        } catch (err) {
            setError('Falha ao carregar as áreas.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAreas();
    }, []);

    const handleShowModal = (area?: Area) => {
        if (area) {
            setCurrentArea(area);
            setIsEditing(true);
        } else {
            setCurrentArea({ nome: '' });
            setIsEditing(false);
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setCurrentArea(null);
    };

    const handleShowDeleteModal = (area: Area) => {
        setAreaToDelete(area);
        setShowDeleteModal(true);
    };

    const handleCloseDeleteModal = () => {
        setAreaToDelete(null);
        setShowDeleteModal(false);
    };

    const handleDelete = async () => {
        if (!areaToDelete) return;
        try {
            await api.delete(`/v1/areas/${areaToDelete.id}`);
            fetchAreas();
            handleCloseDeleteModal();
        } catch (err) {
            setError('Falha ao deletar a área.');
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentArea?.nome) return;

        const apiCall = isEditing
            ? api.put(`/v1/areas/${currentArea.id}`, currentArea)
            : api.post('/v1/areas', currentArea);

        try {
            await apiCall;
            fetchAreas();
            handleCloseModal();
        } catch (err) {
            setError('Falha ao salvar a área.');
        }
    };

    return (
        <Layout title="Gestão de Áreas">
            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            <Button variant="primary" onClick={() => handleShowModal()} className="mb-3">
                <i className="fas fa-plus me-2"></i>Adicionar Área
            </Button>

            <Table striped bordered hover responsive>
                <thead className="table-dark">
                    <tr>
                        <th>#</th>
                        <th>Nome</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {isLoading ? (
                        <tr>
                            <td colSpan={3} className="text-center"><Spinner animation="border" /></td>
                        </tr>
                    ) : areas.map(area => (
                        <tr key={area.id}>
                            <td>{area.id}</td>
                            <td>{area.nome}</td>
                            <td>
                                <Button variant="warning" size="sm" onClick={() => handleShowModal(area)}>
                                    <i className="fas fa-edit"></i>
                                </Button>
                                <Button variant="danger" size="sm" onClick={() => handleShowDeleteModal(area)} className="ms-2">
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
                    <Modal.Title>{isEditing ? 'Editar Área' : 'Adicionar Nova Área'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleFormSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>Nome da Área</Form.Label>
                            <Form.Control type="text" placeholder="Ex: Cozinha, Bar" value={currentArea?.nome || ''} onChange={e => setCurrentArea({...currentArea, nome: e.target.value})} required />
                        </Form.Group>
                        <div className="d-grid gap-2">
                            <Button variant="primary" type="submit">{isEditing ? 'Salvar Alterações' : 'Adicionar Área'}</Button>
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
                    Tem certeza que deseja excluir a área <strong>{areaToDelete?.nome}</strong>?
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseDeleteModal}>Cancelar</Button>
                    <Button variant="danger" onClick={handleDelete}>Excluir</Button>
                </Modal.Footer>
            </Modal>
        </Layout>
    );
};

export default AreaManagement;
