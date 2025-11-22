import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Table, Button, Modal, Form, Spinner, Alert } from 'react-bootstrap';
import api from '../../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import styles from './FornecedorDetalhes.module.css';

interface Fornecedor {
    id: number;
    nome: string;
    contato: string;
    meio_envio: string;
    responsavel?: string;
    observacao?: string;
    listas?: Lista[];
}

interface Lista {
    id: number;
    nome: string;
    descricao?: string;
}

const FornecedorManagement: React.FC = () => {
    const navigate = useNavigate();
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
    const [listas, setListas] = useState<Lista[]>([]);
    const [currentFornecedor, setCurrentFornecedor] = useState<Partial<Fornecedor> | null>(null);
    const [selectedListIds, setSelectedListIds] = useState<Set<number>>(new Set());
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

    const fetchListas = async () => {
        try {
            const response = await api.get('/v1/listas');
            setListas(response.data);
        } catch (err) {
            console.error('Falha ao carregar as listas:', err);
        }
    };

    useEffect(() => {
        fetchFornecedores();
        fetchListas();
    }, []);

    const handleShowModal = (fornecedor?: Fornecedor) => {
        if (fornecedor) {
            setCurrentFornecedor(fornecedor);
            setIsEditing(true);
            // Se editando, carrega as listas já atribuídas
            const listasIds = new Set(fornecedor.listas?.map(l => l.id) || []);
            setSelectedListIds(listasIds);
        } else {
            setCurrentFornecedor({ nome: '', contato: '', meio_envio: '', responsavel: '', observacao: '' });
            setIsEditing(false);
            setSelectedListIds(new Set());
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

    const toggleListSelection = (listaId: number) => {
        const newSet = new Set(selectedListIds);
        if (newSet.has(listaId)) {
            newSet.delete(listaId);
        } else {
            newSet.add(listaId);
        }
        setSelectedListIds(newSet);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentFornecedor?.nome) return;

        const fornecedorData = {
            ...currentFornecedor,
            lista_ids: Array.from(selectedListIds)
        };

        const apiCall = isEditing
            ? api.put(`/v1/fornecedores/${currentFornecedor.id}`, fornecedorData)
            : api.post('/v1/fornecedores', fornecedorData);

        try {
            await apiCall;
            fetchFornecedores();
            handleCloseModal();
        } catch (err) {
            setError('Falha ao salvar o fornecedor.');
        }
    };

    return (
        <div style={{ padding: '2rem 0' }}>
            <Link to="/admin" className={styles.backLink} style={{ marginBottom: '1.5rem', display: 'inline-block' }}>
                <FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: '0.5rem' }} />
                Voltar
            </Link>
            <h2 style={{ marginTop: '1.5rem' }}>Gestão de Fornecedores</h2>
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
                        <th>Responsável</th>
                        <th>Observações</th>
                        <th>Lista</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {isLoading ? (
                        <tr>
                            <td colSpan={8} className="text-center"><Spinner animation="border" /></td>
                        </tr>
                    ) : fornecedores.map(f => (
                        <tr key={f.id}>
                            <td>{f.id}</td>
                            <td>{f.nome}</td>
                            <td>{f.contato}</td>
                            <td>{f.meio_envio}</td>
                            <td>{f.responsavel || '-'}</td>
                            <td title={f.observacao || ''}>{f.observacao ? (f.observacao.length > 50 ? f.observacao.substring(0, 50) + '...' : f.observacao) : '-'}</td>
                            <td>{f.listas && f.listas.length > 0 ? f.listas.map(l => l.nome).join(', ') : '-'}</td>
                            <td>
                                <Button variant="info" onClick={() => navigate(`/admin/fornecedores/${f.id}/detalhes`)} className="me-2">
                                    <i className="fas fa-eye me-1"></i>Ver Detalhes
                                </Button>
                                <Button variant="warning" onClick={() => handleShowModal(f)} className="me-2">
                                    <i className="fas fa-edit me-1"></i>Editar
                                </Button>
                                <Button variant="danger" onClick={() => handleShowDeleteModal(f)}>
                                    <i className="fas fa-trash me-1"></i>Deletar
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
                        <Form.Group className="mb-3">
                            <Form.Label>Responsável</Form.Label>
                            <Form.Control type="text" placeholder="Ex: João Silva" value={currentFornecedor?.responsavel || ''} onChange={e => setCurrentFornecedor({...currentFornecedor, responsavel: e.target.value})} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Observações (máximo 600 caracteres)</Form.Label>
                            <Form.Control as="textarea" rows={4} placeholder="Ex: Notas sobre o fornecedor..." value={currentFornecedor?.observacao || ''} onChange={e => setCurrentFornecedor({...currentFornecedor, observacao: e.target.value.substring(0, 600)})} maxLength={600} />
                            <small className="text-muted">{(currentFornecedor?.observacao || '').length}/600 caracteres</small>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Listas Atribuídas</Form.Label>
                            <div style={{ border: '1px solid #ced4da', borderRadius: '0.375rem', padding: '0.75rem', maxHeight: '200px', overflowY: 'auto' }}>
                                {listas.length === 0 ? (
                                    <p className="text-muted mb-0">Nenhuma lista disponível</p>
                                ) : (
                                    listas.map(lista => (
                                        <Form.Check
                                            key={lista.id}
                                            type="checkbox"
                                            id={`lista-${lista.id}`}
                                            label={lista.nome}
                                            checked={selectedListIds.has(lista.id)}
                                            onChange={() => toggleListSelection(lista.id)}
                                            className="mb-2"
                                        />
                                    ))
                                )}
                            </div>
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
