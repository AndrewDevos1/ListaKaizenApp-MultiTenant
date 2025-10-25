/**
 * Listas de Compras - Gerenciamento de listas
 *
 * Esta página permite criar, visualizar, editar e deletar listas de compras
 */

import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Modal, Form, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faShoppingCart,
    faArrowLeft,
    faPlus,
    faEdit,
    faTrash,
    faListAlt,
    faUsers,
    faCalendar,
    faCheckCircle,
    faExclamationCircle,
} from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import styles from './ListasCompras.module.css';

// Interfaces TypeScript
interface Lista {
    id: number;
    nome: string;
    descricao: string | null;
    data_criacao: string; // ISO date string
    colaboradores?: Array<{id: number; nome: string}>;
}

interface ListaFormData {
    nome: string;
    descricao: string;
}

interface Usuario {
    id: number;
    nome: string;
    email: string;
    role: string;
}

const ListasCompras: React.FC = () => {
    // Estados principais
    const [listas, setListas] = useState<Lista[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Estados dos modals
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [editingLista, setEditingLista] = useState<Lista | null>(null);
    const [deletingLista, setDeletingLista] = useState<Lista | null>(null);
    const [assigningLista, setAssigningLista] = useState<Lista | null>(null);
    const [formData, setFormData] = useState<ListaFormData>({nome: '', descricao: ''});

    // Estados para atribuição de colaboradores
    const [allUsers, setAllUsers] = useState<Usuario[]>([]);
    const [selectedCollaborators, setSelectedCollaborators] = useState<number[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [assigningLoading, setAssigningLoading] = useState(false);

    // Buscar listas do backend
    const fetchListas = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get('/v1/listas');
            setListas(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao carregar listas');
            console.error('Erro ao buscar listas:', err);
        } finally {
            setLoading(false);
        }
    };

    // useEffect para carregar listas na montagem
    useEffect(() => {
        fetchListas();
    }, []);

    // Funções do modal de criar/editar
    const handleOpenCreateModal = () => {
        setEditingLista(null);
        setFormData({nome: '', descricao: ''});
        setShowModal(true);
    };

    const handleOpenEditModal = (lista: Lista) => {
        setEditingLista(lista);
        setFormData({
            nome: lista.nome,
            descricao: lista.descricao || ''
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingLista(null);
        setFormData({nome: '', descricao: ''});
        setError(null);
    };

    const handleSubmit = async () => {
        try {
            if (!formData.nome.trim()) {
                setError('O nome da lista é obrigatório');
                return;
            }

            if (editingLista) {
                // UPDATE
                await api.put(`/v1/listas/${editingLista.id}`, formData);
                setSuccessMessage('Lista atualizada com sucesso!');
            } else {
                // CREATE
                await api.post('/v1/listas', formData);
                setSuccessMessage('Lista criada com sucesso!');
            }

            handleCloseModal();
            fetchListas(); // Recarregar listas

            // Limpar mensagem após 3 segundos
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao salvar lista');
        }
    };

    // Funções do modal de deletar
    const handleOpenDeleteModal = (lista: Lista) => {
        setDeletingLista(lista);
        setShowDeleteModal(true);
    };

    const handleCloseDeleteModal = () => {
        setShowDeleteModal(false);
        setDeletingLista(null);
    };

    const handleConfirmDelete = async () => {
        if (!deletingLista) return;

        try {
            await api.delete(`/v1/listas/${deletingLista.id}`);
            setSuccessMessage('Lista deletada com sucesso!');
            handleCloseDeleteModal();
            fetchListas(); // Recarregar listas

            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao deletar lista');
            handleCloseDeleteModal();
        }
    };

    // Funções para atribuição de colaboradores
    const fetchAllUsers = async () => {
        try {
            setLoadingUsers(true);
            const response = await api.get('/admin/users');
            // Filtrar apenas usuários com role COLLABORATOR
            const collaborators = response.data.filter((user: Usuario) => user.role === 'COLLABORATOR');
            setAllUsers(collaborators);
        } catch (err: any) {
            console.error('Erro ao buscar usuários:', err);
            setError('Erro ao carregar colaboradores');
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleOpenAssignModal = async (lista: Lista) => {
        setAssigningLista(lista);
        await fetchAllUsers();

        // Pré-selecionar colaboradores já atribuídos
        const assignedIds = lista.colaboradores?.map(c => c.id) || [];
        setSelectedCollaborators(assignedIds);

        setShowAssignModal(true);
    };

    const handleCloseAssignModal = () => {
        setShowAssignModal(false);
        setAssigningLista(null);
        setSelectedCollaborators([]);
        setAllUsers([]);
        setError(null);
    };

    const handleToggleCollaborator = (userId: number) => {
        setSelectedCollaborators(prev => {
            if (prev.includes(userId)) {
                return prev.filter(id => id !== userId);
            } else {
                return [...prev, userId];
            }
        });
    };

    const handleConfirmAssign = async () => {
        if (!assigningLista) return;

        try {
            setAssigningLoading(true);
            await api.post(`/v1/listas/${assigningLista.id}/assign`, {
                colaborador_ids: selectedCollaborators
            });
            setSuccessMessage('Colaboradores atribuídos com sucesso!');
            handleCloseAssignModal();
            fetchListas(); // Recarregar listas

            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao atribuir colaboradores');
        } finally {
            setAssigningLoading(false);
        }
    };

    return (
        <div className={styles.pageWrapper}>
            <Container fluid>
                {/* Header com botão voltar */}
                <div className={styles.pageHeader}>
                    <div>
                        <Link to="/admin" className={styles.backButton}>
                            <FontAwesomeIcon icon={faArrowLeft} />
                            Voltar ao Dashboard
                        </Link>
                        <h1 className={styles.pageTitle}>
                            <FontAwesomeIcon icon={faShoppingCart} style={{ marginRight: '1rem', color: '#f9b115' }} />
                            Listas de Compras
                        </h1>
                        <p className={styles.pageSubtitle}>
                            Gerencie suas listas de compras
                        </p>
                    </div>
                    <Button
                        variant="success"
                        size="lg"
                        onClick={handleOpenCreateModal}
                        className={styles.addButton}
                    >
                        <FontAwesomeIcon icon={faPlus} style={{ marginRight: '0.5rem' }} />
                        Adicionar Lista
                    </Button>
                </div>

                {/* Alertas de sucesso e erro */}
                {successMessage && (
                    <Alert variant="success" dismissible onClose={() => setSuccessMessage(null)}>
                        <FontAwesomeIcon icon={faCheckCircle} style={{marginRight: '0.5rem'}} />
                        {successMessage}
                    </Alert>
                )}

                {error && !showModal && (
                    <Alert variant="danger" dismissible onClose={() => setError(null)}>
                        <FontAwesomeIcon icon={faExclamationCircle} style={{marginRight: '0.5rem'}} />
                        {error}
                    </Alert>
                )}

                {/* Loading spinner */}
                {loading && (
                    <div className={styles.loadingSpinner}>
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Carregando...</span>
                        </div>
                        <p>Carregando listas...</p>
                    </div>
                )}

                {/* Estado vazio */}
                {!loading && listas.length === 0 && (
                    <div className={styles.emptyState}>
                        <FontAwesomeIcon icon={faListAlt} size="3x" style={{color: '#ccc', marginBottom: '1rem'}} />
                        <h3>Nenhuma lista encontrada</h3>
                        <p>Clique em "Adicionar Lista" para criar sua primeira lista</p>
                    </div>
                )}

                {/* Grid com os cards */}
                {!loading && listas.length > 0 && (
                    <div className={styles.listasGrid}>
                        {listas.map((lista) => (
                            <Card key={lista.id} className={`${styles.listaCard} ${styles.cardLista}`}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.cardIcon}>
                                        <FontAwesomeIcon icon={faListAlt} />
                                    </div>
                                    <div className={styles.cardActions}>
                                        <Button
                                            variant="link"
                                            size="sm"
                                            onClick={() => handleOpenEditModal(lista)}
                                            className={styles.actionButton}
                                            title="Editar"
                                        >
                                            <FontAwesomeIcon icon={faEdit} />
                                        </Button>
                                        <Button
                                            variant="link"
                                            size="sm"
                                            onClick={() => handleOpenDeleteModal(lista)}
                                            className={`${styles.actionButton} ${styles.deleteButton}`}
                                            title="Deletar"
                                        >
                                            <FontAwesomeIcon icon={faTrash} />
                                        </Button>
                                    </div>
                                </div>
                                <div className={styles.cardContent}>
                                    <h3 className={styles.cardTitulo}>{lista.nome}</h3>
                                    <p className={styles.cardDescricao}>
                                        {lista.descricao || 'Sem descrição'}
                                    </p>
                                    <div className={styles.cardInfo}>
                                        <span className={styles.infoItem}>
                                            <FontAwesomeIcon icon={faUsers} style={{marginRight: '0.25rem'}} />
                                            <strong>{lista.colaboradores?.length || 0}</strong> colaboradores
                                        </span>
                                        <span className={styles.infoItem}>
                                            <FontAwesomeIcon icon={faCalendar} style={{marginRight: '0.25rem'}} />
                                            {new Date(lista.data_criacao).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                </div>
                                <div className={styles.cardFooter}>
                                    <Button
                                        variant="outline-primary"
                                        className={styles.cardButton}
                                        onClick={() => handleOpenEditModal(lista)}
                                    >
                                        Ver Detalhes
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        className={styles.cardButton}
                                        onClick={() => handleOpenAssignModal(lista)}
                                        title="Atribuir colaboradores a esta lista"
                                    >
                                        <FontAwesomeIcon icon={faUsers} style={{marginRight: '0.5rem'}} />
                                        Atribuir
                                    </Button>
                                    <Link to={`/admin/listas/${lista.id}/gerenciar-itens`}>
                                        <Button
                                            variant="warning"
                                            className={styles.cardButton}
                                        >
                                            <FontAwesomeIcon icon={faEdit} style={{marginRight: '0.5rem'}} />
                                            Gerenciar Itens
                                        </Button>
                                    </Link>
                                    <Link to={`/admin/listas/${lista.id}/lista-mae`}>
                                        <Button
                                            variant="info"
                                            className={styles.cardButton}
                                        >
                                            <FontAwesomeIcon icon={faShoppingCart} style={{marginRight: '0.5rem'}} />
                                            Lista Mãe
                                        </Button>
                                    </Link>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Modal Criar/Editar */}
                <Modal show={showModal} onHide={handleCloseModal}>
                    <Modal.Header closeButton>
                        <Modal.Title>
                            {editingLista ? 'Editar Lista' : 'Nova Lista'}
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {error && (
                            <Alert variant="danger" dismissible onClose={() => setError(null)}>
                                {error}
                            </Alert>
                        )}
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label>Nome *</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Ex: Lista Semanal"
                                    value={formData.nome}
                                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                                    required
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Descrição</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    placeholder="Descreva o propósito desta lista..."
                                    value={formData.descricao}
                                    onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                                />
                            </Form.Group>
                        </Form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseModal}>
                            Cancelar
                        </Button>
                        <Button variant="primary" onClick={handleSubmit}>
                            {editingLista ? 'Salvar Alterações' : 'Criar Lista'}
                        </Button>
                    </Modal.Footer>
                </Modal>

                {/* Modal Deletar */}
                <Modal show={showDeleteModal} onHide={handleCloseDeleteModal}>
                    <Modal.Header closeButton>
                        <Modal.Title>Confirmar Deleção</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <p>Tem certeza que deseja deletar a lista <strong>{deletingLista?.nome}</strong>?</p>
                        <p className="text-danger">Esta ação não pode ser desfeita.</p>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseDeleteModal}>
                            Cancelar
                        </Button>
                        <Button variant="danger" onClick={handleConfirmDelete}>
                            Deletar
                        </Button>
                    </Modal.Footer>
                </Modal>

                {/* Modal Atribuir Colaboradores */}
                <Modal show={showAssignModal} onHide={handleCloseAssignModal} size="lg">
                    <Modal.Header closeButton>
                        <Modal.Title>
                            <FontAwesomeIcon icon={faUsers} style={{marginRight: '0.5rem'}} />
                            Atribuir Colaboradores - {assigningLista?.nome}
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {error && (
                            <Alert variant="danger" dismissible onClose={() => setError(null)}>
                                {error}
                            </Alert>
                        )}

                        {loadingUsers ? (
                            <div className="text-center my-4">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Carregando...</span>
                                </div>
                                <p className="mt-2">Carregando colaboradores...</p>
                            </div>
                        ) : allUsers.length === 0 ? (
                            <Alert variant="info">
                                Nenhum colaborador disponível. Crie usuários com role COLLABORATOR primeiro.
                            </Alert>
                        ) : (
                            <div style={{maxHeight: '400px', overflowY: 'auto'}}>
                                {allUsers.map((user) => (
                                    <Form.Check
                                        key={user.id}
                                        type="checkbox"
                                        id={`user-${user.id}`}
                                        label={`${user.nome} (${user.email})`}
                                        checked={selectedCollaborators.includes(user.id)}
                                        onChange={() => handleToggleCollaborator(user.id)}
                                        className="mb-2"
                                    />
                                ))}
                            </div>
                        )}

                        {allUsers.length > 0 && selectedCollaborators.length > 0 && (
                            <Alert variant="success" className="mt-3">
                                <strong>{selectedCollaborators.length}</strong> colaborador(es) selecionado(s)
                            </Alert>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            variant="secondary"
                            onClick={handleCloseAssignModal}
                            disabled={assigningLoading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleConfirmAssign}
                            disabled={assigningLoading || loadingUsers}
                        >
                            {assigningLoading ? 'Salvando...' : 'Salvar Atribuições'}
                        </Button>
                    </Modal.Footer>
                </Modal>
            </Container>
        </div>
    );
};

export default ListasCompras;
