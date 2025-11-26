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
    faTruck,
    faTag,
    faPhone,
    faEye,
    faUsersCog,
    faInfoCircle,
    faBoxOpen,
    faDownload,
    faUpload,
} from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import styles from './ListasCompras.module.css';

// Interfaces TypeScript
interface Fornecedor {
    id: number;
    nome: string;
    contato?: string;
}

interface ListaItem {
    id: number;
    nome: string;
    unidade: string;
    quantidade_atual?: number;
    quantidade_minima?: number;
}

interface Lista {
    id: number;
    nome: string;
    descricao: string | null;
    data_criacao: string; // ISO date string
    fornecedor_id?: number;
    fornecedor?: Fornecedor;
    categoria?: string;
    telefone_whatsapp?: string;
    colaboradores?: Array<{id: number; nome: string}>;
    itens?: ListaItem[]; // Preview dos itens
}

interface ListaFormData {
    nome: string;
    descricao: string;
    fornecedor_id: string;
    categoria: string;
    telefone_whatsapp: string;
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
    const [showViewModal, setShowViewModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [editingLista, setEditingLista] = useState<Lista | null>(null);
    const [deletingLista, setDeletingLista] = useState<Lista | null>(null);
    const [assigningLista, setAssigningLista] = useState<Lista | null>(null);
    const [viewingLista, setViewingLista] = useState<Lista | null>(null);
    const [viewingItens, setViewingItens] = useState<ListaItem[]>([]);
    const [loadingViewItens, setLoadingViewItens] = useState(false);

    // Estado para importar nova lista
    const [importNome, setImportNome] = useState('');
    const [importDescricao, setImportDescricao] = useState('');
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importLoading, setImportLoading] = useState(false);

    // Estado para form data
    const resetFormData = (): ListaFormData => ({
        nome: '',
        descricao: '',
        fornecedor_id: '',
        categoria: '',
        telefone_whatsapp: '',
    });

    const [formData, setFormData] = useState<ListaFormData>(resetFormData());

    // Estados para atribuição de colaboradores
    const [allUsers, setAllUsers] = useState<Usuario[]>([]);
    const [selectedCollaborators, setSelectedCollaborators] = useState<number[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [assigningLoading, setAssigningLoading] = useState(false);

    // Buscar prévia dos itens de uma lista (primeiros 3)
    const fetchListaPreview = async (listaId: number): Promise<ListaItem[]> => {
        try {
            const response = await api.get(`/admin/listas/${listaId}/lista-mae`);
            const itens = response.data.itens || [];
            return itens.slice(0, 3); // Retorna apenas os primeiros 3
        } catch (err) {
            console.error(`Erro ao buscar prévia da lista ${listaId}:`, err);
            return [];
        }
    };

    // Buscar listas do backend
    const fetchListas = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get('/v1/listas');
            const listasData: Lista[] = response.data;

            // Buscar prévia dos itens de cada lista (em paralelo)
            const listasComPreviews = await Promise.all(
                listasData.map(async (lista) => {
                    const itensPreview = await fetchListaPreview(lista.id);
                    return {
                        ...lista,
                        itens: itensPreview
                    };
                })
            );

            setListas(listasComPreviews);
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
        setFormData(resetFormData());
        setShowModal(true);
    };

    const handleOpenEditModal = (lista: Lista) => {
        setEditingLista(lista);
        setFormData({
            nome: lista.nome,
            descricao: lista.descricao || '',
            fornecedor_id: lista.fornecedor_id?.toString() || '',
            categoria: lista.categoria || '',
            telefone_whatsapp: lista.telefone_whatsapp || '',
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingLista(null);
        setFormData(resetFormData());
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

    // Funções do modal de visualização de itens
    const handleOpenViewModal = async (lista: Lista) => {
        setViewingLista(lista);
        setShowViewModal(true);
        setLoadingViewItens(true);

        try {
            const response = await api.get(`/admin/listas/${lista.id}/lista-mae`);
            setViewingItens(response.data.itens || []);
        } catch (err: any) {
            console.error('Erro ao buscar itens:', err);
            setError('Erro ao carregar itens da lista');
            setViewingItens([]);
        } finally {
            setLoadingViewItens(false);
        }
    };

    const handleCloseViewModal = () => {
        setShowViewModal(false);
        setViewingLista(null);
        setViewingItens([]);
        setError(null);
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

    // Funções do modal de importar nova lista
    const handleCloseImportModal = () => {
        setShowImportModal(false);
        setImportNome('');
        setImportDescricao('');
        setImportFile(null);
        setError(null);
    };

    const handleImportFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.name.endsWith('.csv')) {
                setError('Por favor, selecione um arquivo CSV');
                setTimeout(() => setError(null), 3000);
                return;
            }
            setImportFile(file);
        }
    };

    const handleConfirmImport = async () => {
        if (!importNome.trim()) {
            setError('Nome da lista é obrigatório');
            return;
        }

        if (!importFile) {
            setError('Selecione um arquivo CSV');
            return;
        }

        try {
            setImportLoading(true);
            const formData = new FormData();
            formData.append('nome', importNome);
            formData.append('descricao', importDescricao);
            formData.append('file', importFile);

            await api.post('/admin/listas/create-from-csv', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            setSuccessMessage('Lista importada e criada com sucesso!');
            handleCloseImportModal();
            fetchListas(); // Recarregar listas
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao importar lista');
        } finally {
            setImportLoading(false);
        }
    };

    // Função de exportar CSV
    const handleExportCSV = async (lista: Lista) => {
        try {
            const response = await api.get(`/admin/listas/${lista.id}/export-csv`, {
                responseType: 'blob'
            });

            // Criar link de download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // Obter nome do arquivo do header ou usar padrão
            const contentDisposition = response.headers['content-disposition'];
            let filename = `${lista.nome}_backup.csv`;
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }

            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            setSuccessMessage('Lista exportada com sucesso!');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao exportar lista');
            setTimeout(() => setError(null), 3000);
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
                    <div className={styles.headerActions}>
                        <Button
                            variant="success"
                            size="lg"
                            onClick={handleOpenCreateModal}
                            className={styles.iconButton}
                            title="Adicionar Nova Lista"
                        >
                            <FontAwesomeIcon icon={faPlus} />
                        </Button>
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={() => setShowImportModal(true)}
                            className={styles.iconButton}
                            title="Importar Nova Lista (CSV)"
                        >
                            <FontAwesomeIcon icon={faDownload} />
                        </Button>
                    </div>
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
                                            onClick={() => handleOpenViewModal(lista)}
                                            className={styles.actionButton}
                                            title="Ver Todos os Itens"
                                        >
                                            <FontAwesomeIcon icon={faEye} />
                                        </Button>
                                        <Link to={`/admin/listas/${lista.id}/lista-mae`} title="Lista Mãe">
                                            <Button
                                                variant="link"
                                                size="sm"
                                                className={styles.actionButton}
                                            >
                                                <FontAwesomeIcon icon={faShoppingCart} />
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="link"
                                            size="sm"
                                            onClick={() => handleOpenAssignModal(lista)}
                                            className={styles.actionButton}
                                            title="Atribuir Colaboradores"
                                        >
                                            <FontAwesomeIcon icon={faUsersCog} />
                                        </Button>
                                        <Button
                                            variant="link"
                                            size="sm"
                                            onClick={() => handleExportCSV(lista)}
                                            className={styles.actionButton}
                                            title="Exportar Lista (CSV)"
                                        >
                                            <FontAwesomeIcon icon={faUpload} />
                                        </Button>
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

                                    {/* Fornecedor */}
                                    {lista.fornecedor && (
                                        <p className={styles.cardMetadata}>
                                            <FontAwesomeIcon icon={faTruck} style={{marginRight: '0.5rem', color: '#f9b115'}} />
                                            <strong>Fornecedor:</strong> {lista.fornecedor.nome}
                                        </p>
                                    )}

                                    {/* Categoria */}
                                    {lista.categoria && (
                                        <p className={styles.cardMetadata}>
                                            <FontAwesomeIcon icon={faTag} style={{marginRight: '0.5rem', color: '#667eea'}} />
                                            <strong>Categoria:</strong> {lista.categoria}
                                        </p>
                                    )}

                                    {/* WhatsApp */}
                                    {lista.telefone_whatsapp && (
                                        <p className={styles.cardMetadata}>
                                            <FontAwesomeIcon icon={faPhone} style={{marginRight: '0.5rem', color: '#25d366'}} />
                                            <strong>WhatsApp:</strong> {lista.telefone_whatsapp}
                                        </p>
                                    )}

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

                                    {/* Prévia dos Itens */}
                                    {lista.itens && lista.itens.length > 0 && (
                                        <div style={{
                                            marginTop: '1rem',
                                            padding: '0.75rem',
                                            backgroundColor: '#f8f9fa',
                                            borderRadius: '8px',
                                            border: '1px solid #e9ecef'
                                        }}>
                                            <div style={{
                                                fontSize: '0.85rem',
                                                fontWeight: 600,
                                                marginBottom: '0.5rem',
                                                color: '#495057',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}>
                                                <FontAwesomeIcon icon={faBoxOpen} style={{color: '#667eea'}} />
                                                Primeiros itens:
                                            </div>
                                            {lista.itens.map((item, idx) => (
                                                <div key={item.id} style={{
                                                    fontSize: '0.8rem',
                                                    padding: '0.25rem 0',
                                                    color: '#6c757d',
                                                    borderBottom: idx < lista.itens!.length - 1 ? '1px dotted #dee2e6' : 'none'
                                                }}>
                                                    <strong>{item.nome}</strong>
                                                    <span style={{marginLeft: '0.5rem', fontSize: '0.75rem'}}>
                                                        ({item.unidade})
                                                    </span>
                                                    {item.quantidade_minima !== undefined && item.quantidade_atual !== undefined && (
                                                        <span style={{
                                                            marginLeft: '0.5rem',
                                                            fontSize: '0.75rem',
                                                            color: item.quantidade_atual < item.quantidade_minima ? '#dc3545' : '#28a745'
                                                        }}>
                                                            {item.quantidade_atual}/{item.quantidade_minima}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                            {/* Indicador se há mais itens */}
                                            <div style={{
                                                marginTop: '0.5rem',
                                                fontSize: '0.75rem',
                                                color: '#6c757d',
                                                fontStyle: 'italic',
                                                textAlign: 'center'
                                            }}>
                                                <FontAwesomeIcon icon={faEye} style={{marginRight: '0.3rem'}} />
                                                Clique no olho para ver todos os itens
                                            </div>
                                        </div>
                                    )}
                                    {lista.itens && lista.itens.length === 0 && (
                                        <div style={{
                                            marginTop: '1rem',
                                            padding: '0.75rem',
                                            backgroundColor: '#fff3cd',
                                            borderRadius: '8px',
                                            border: '1px solid #ffc107',
                                            fontSize: '0.85rem',
                                            color: '#856404',
                                            textAlign: 'center'
                                        }}>
                                            <FontAwesomeIcon icon={faInfoCircle} style={{marginRight: '0.5rem'}} />
                                            Nenhum item cadastrado
                                        </div>
                                    )}
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
                                <Form.Label>Nome da Lista *</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Ex: Lista Semanal"
                                    value={formData.nome}
                                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                                    required
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

                {/* Modal Visualizar Itens */}
                <Modal show={showViewModal} onHide={handleCloseViewModal} size="lg">
                    <Modal.Header closeButton>
                        <Modal.Title>
                            <FontAwesomeIcon icon={faEye} style={{marginRight: '0.5rem'}} />
                            Itens da Lista - {viewingLista?.nome}
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {loadingViewItens ? (
                            <div className="text-center my-4">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Carregando...</span>
                                </div>
                                <p className="mt-2">Carregando itens...</p>
                            </div>
                        ) : viewingItens.length === 0 ? (
                            <Alert variant="info">
                                <FontAwesomeIcon icon={faBoxOpen} style={{marginRight: '0.5rem'}} />
                                Esta lista ainda não possui itens cadastrados.
                            </Alert>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-striped table-hover">
                                    <thead style={{
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: 'white'
                                    }}>
                                        <tr>
                                            <th>#</th>
                                            <th>Nome do Item</th>
                                            <th>Unidade</th>
                                            <th className="text-center">Qtd. Mínima</th>
                                            <th className="text-center">Qtd. Atual</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {viewingItens.map((item, index) => (
                                            <tr key={item.id}>
                                                <td>{index + 1}</td>
                                                <td>
                                                    <strong>{item.nome}</strong>
                                                </td>
                                                <td>
                                                    <span className="badge bg-secondary">{item.unidade}</span>
                                                </td>
                                                <td className="text-center">
                                                    {item.quantidade_minima !== undefined ? item.quantidade_minima : '-'}
                                                </td>
                                                <td className="text-center">
                                                    {item.quantidade_atual !== undefined ? (
                                                        <span className={`badge ${
                                                            item.quantidade_minima !== undefined &&
                                                            item.quantidade_atual < item.quantidade_minima
                                                                ? 'bg-danger'
                                                                : 'bg-success'
                                                        }`}>
                                                            {item.quantidade_atual}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="mt-3 text-muted">
                                    <small>
                                        <FontAwesomeIcon icon={faInfoCircle} style={{marginRight: '0.5rem'}} />
                                        Total: <strong>{viewingItens.length}</strong> {viewingItens.length === 1 ? 'item' : 'itens'}
                                    </small>
                                </div>
                            </div>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseViewModal}>
                            Fechar
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

                {/* Modal Importar Nova Lista */}
                <Modal show={showImportModal} onHide={handleCloseImportModal}>
                    <Modal.Header closeButton>
                        <Modal.Title>
                            <FontAwesomeIcon icon={faDownload} style={{marginRight: '0.5rem'}} />
                            Importar Nova Lista (CSV)
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
                                <Form.Label>Nome da Lista *</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Digite o nome da lista"
                                    value={importNome}
                                    onChange={(e) => setImportNome(e.target.value)}
                                    required
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Descrição (Opcional)</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    placeholder="Descreva o propósito desta lista"
                                    value={importDescricao}
                                    onChange={(e) => setImportDescricao(e.target.value)}
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Arquivo CSV *</Form.Label>
                                <Form.Control
                                    type="file"
                                    accept=".csv"
                                    onChange={handleImportFileSelect}
                                    required
                                />
                                <Form.Text className="text-muted">
                                    O arquivo deve conter as colunas: nome, unidade, quantidade_atual, quantidade_minima
                                </Form.Text>
                            </Form.Group>

                            {importFile && (
                                <Alert variant="info">
                                    <FontAwesomeIcon icon={faCheckCircle} style={{marginRight: '0.5rem'}} />
                                    Arquivo selecionado: <strong>{importFile.name}</strong>
                                </Alert>
                            )}
                        </Form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            variant="secondary"
                            onClick={handleCloseImportModal}
                            disabled={importLoading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleConfirmImport}
                            disabled={importLoading || !importNome.trim() || !importFile}
                        >
                            {importLoading ? 'Importando...' : 'Importar Lista'}
                        </Button>
                    </Modal.Footer>
                </Modal>
            </Container>
        </div>
    );
};

export default ListasCompras;
