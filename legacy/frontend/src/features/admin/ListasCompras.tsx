/**
 * Listas de Compras - Gerenciamento de listas
 *
 * Esta página permite criar, visualizar, editar e deletar listas de compras
 */

import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Modal, Form, Alert, Dropdown, Badge, Spinner } from 'react-bootstrap';
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
    faTrashAlt,
    faUndo,
    faClipboardList,
    faSearch,
    faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { formatarDataBrasiliaSemHora, formatarDataHoraBrasilia } from '../../utils/dateFormatter';
import styles from './ListasCompras.module.css';
import SeletorItensUnificado from './SeletorItensUnificado';
import { useAuth } from '../../context/AuthContext';

// Interfaces TypeScript
interface Area {
    id: number;
    nome: string;
}

interface Restaurante {
    id: number;
    nome: string;
}

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
    data_delecao?: string | null;
    fornecedor_id?: number;
    fornecedor?: Fornecedor;
    categoria?: string;
    telefone_whatsapp?: string;
    area_id?: number | null;
    area_nome?: string | null;
    colaboradores?: Array<{id: number; nome: string}>;
    itens?: ListaItem[]; // Preview dos itens
    itens_nomes?: string[]; // Todos os nomes dos itens ativos (para busca)
}

interface ListaFormData {
    nome: string;
    descricao: string;
    fornecedor_id: string;
    categoria: string;
    telefone_whatsapp: string;
    area_id: number | '';
    restaurante_id: number | '';
}


interface Usuario {
    id: number;
    nome: string;
    email: string;
    role: string;
}

const ListasCompras: React.FC = () => {
    const navigate = useNavigate();
    const { user: authUser } = useAuth();
    const isSuperAdmin = authUser?.role === 'SUPER_ADMIN';

    // Estado de restaurantes (para Super Admin)
    const [restaurantes, setRestaurantes] = useState<Restaurante[]>([]);

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
    const [importTexto, setImportTexto] = useState('');
    const [importLoading, setImportLoading] = useState(false);

    // Estado para lixeira
    const [showTrashModal, setShowTrashModal] = useState(false);
    const [deletedListas, setDeletedListas] = useState<Lista[]>([]);
    const [selectedTrashIds, setSelectedTrashIds] = useState<number[]>([]);
    const [loadingTrash, setLoadingTrash] = useState(false);

    // Estado das áreas disponíveis
    const [areas, setAreas] = useState<Area[]>([]);

    // Estado do filtro por área
    const [selectedAreaFilter, setSelectedAreaFilter] = useState<number | null>(null);

    // Estado da busca textual
    const [searchTerm, setSearchTerm] = useState('');

    // Estado para modal de vincular área
    const [showAreaModal, setShowAreaModal] = useState(false);
    const [areaingLista, setAreaingLista] = useState<Lista | null>(null);
    const [selectedAreaId, setSelectedAreaId] = useState<number | ''>('');
    const [savingArea, setSavingArea] = useState(false);

    // Estado para form data
    const resetFormData = (): ListaFormData => ({
        nome: '',
        descricao: '',
        fornecedor_id: '',
        categoria: '',
        telefone_whatsapp: '',
        area_id: '',
        restaurante_id: '',
    });

    const [formData, setFormData] = useState<ListaFormData>(resetFormData());

    // Estados para seleção de itens do catálogo
    const [selectedItens, setSelectedItens] = useState<Map<string, string>>(new Map());
    const [showItensTab, setShowItensTab] = useState(false);

    // Estados para atribuição de colaboradores
    const [allUsers, setAllUsers] = useState<Usuario[]>([]);
    const [selectedCollaborators, setSelectedCollaborators] = useState<number[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [assigningLoading, setAssigningLoading] = useState(false);

    // Estados para seleção de colaboradores no modal de criação
    const [createCollaborators, setCreateCollaborators] = useState<number[]>([]);
    const [loadingCreateColab, setLoadingCreateColab] = useState(false);

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

    // Buscar áreas disponíveis
    const fetchAreas = async () => {
        try {
            const response = await api.get('/v1/areas');
            setAreas(response.data);
        } catch (err) {
            console.error('Erro ao buscar áreas:', err);
        }
    };

    // Buscar restaurantes (apenas Super Admin)
    const fetchRestaurantes = async () => {
        try {
            const response = await api.get('/admin/restaurantes');
            setRestaurantes(response.data || []);
        } catch (err) {
            console.error('Erro ao buscar restaurantes:', err);
        }
    };

    // useEffect para carregar listas e áreas na montagem
    useEffect(() => {
        fetchListas();
        fetchAreas();
        if (isSuperAdmin) {
            fetchRestaurantes();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSuperAdmin]);

    // Funções do modal de criar/editar
    const handleOpenCreateModal = () => {
        setEditingLista(null);
        setFormData(resetFormData());
        setSelectedItens(new Map());
        setShowItensTab(false);
        setCreateCollaborators([]);
        fetchAllUsers();
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
            area_id: lista.area_id ?? '',
            restaurante_id: '',
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingLista(null);
        setFormData(resetFormData());
        setSelectedItens(new Map());
        setShowItensTab(false);
        setCreateCollaborators([]);
        setError(null);
    };

    const handleCreateAreaChange = async (value: string) => {
        const newAreaId = value === '' ? '' : Number(value);
        setFormData(prev => ({...prev, area_id: newAreaId}));

        if (newAreaId === '') {
            setCreateCollaborators([]);
            return;
        }
        try {
            setLoadingCreateColab(true);
            const res = await api.get(`/v1/areas/${newAreaId}/colaboradores`);
            const ids = (res.data.colaboradores || []).map((c: any) => c.id);
            setCreateCollaborators(ids);
        } catch {
            // silently ignore
        } finally {
            setLoadingCreateColab(false);
        }
    };

    const handleSubmit = async () => {
        try {
            if (!formData.nome.trim()) {
                setError('O nome da lista é obrigatório');
                return;
            }

            if (isSuperAdmin && !editingLista && !formData.restaurante_id) {
                setError('Selecione um restaurante para a lista');
                return;
            }

            if (editingLista) {
                // UPDATE
                await api.put(`/v1/listas/${editingLista.id}`, formData);
                setSuccessMessage('Lista atualizada com sucesso!');
            } else {
                // CREATE - Incluir itens selecionados
                const itens = Array.from(selectedItens.entries()).map(([id, quantidadeMinimaStr]) => {
                    const quantidadeMinimaParsed = quantidadeMinimaStr === '' ? 0 : parseFloat(quantidadeMinimaStr);
                    const quantidade_minima = Number.isNaN(quantidadeMinimaParsed) ? 0 : quantidadeMinimaParsed;
                    return {
                        id,
                        quantidade_minima
                    };
                });
                const payload = {
                    ...formData,
                    itens,
                    colaborador_ids: createCollaborators
                };
                await api.post('/v1/listas', payload);
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
        setImportTexto('');
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

        // Validar que OU arquivo OU texto foi fornecido (mas não ambos vazios)
        if (!importFile && !importTexto.trim()) {
            setError('Selecione um arquivo CSV ou cole o conteúdo de texto direto');
            return;
        }

        try {
            setImportLoading(true);
            const formData = new FormData();
            formData.append('nome', importNome);
            formData.append('descricao', importDescricao);

            // Adicionar arquivo OU texto (prioridade: arquivo se ambos forem preenchidos)
            if (importFile) {
                formData.append('file', importFile);
            } else if (importTexto.trim()) {
                formData.append('texto', importTexto);
            }

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

    // Funções da lixeira
    const fetchDeletedListas = async () => {
        try {
            setLoadingTrash(true);
            const response = await api.get('/admin/listas/deleted');
            setDeletedListas(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao buscar listas deletadas');
            setTimeout(() => setError(null), 3000);
        } finally {
            setLoadingTrash(false);
        }
    };

    const handleToggleTrashSelection = (listaId: number) => {
        setSelectedTrashIds(prev => {
            if (prev.includes(listaId)) {
                return prev.filter(id => id !== listaId);
            } else {
                return [...prev, listaId];
            }
        });
    };

    const handleSelectAllTrash = () => {
        if (selectedTrashIds.length === deletedListas.length) {
            setSelectedTrashIds([]);
        } else {
            setSelectedTrashIds(deletedListas.map(l => l.id));
        }
    };

    const handleRestoreLista = async (listaId: number) => {
        try {
            await api.post(`/admin/listas/${listaId}/restore`);
            setSuccessMessage('Lista restaurada com sucesso!');
            fetchDeletedListas();
            fetchListas();
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao restaurar lista');
            setTimeout(() => setError(null), 3000);
        }
    };

    const handlePermanentDelete = async (listaId: number) => {
        if (!window.confirm('Tem certeza que deseja deletar PERMANENTEMENTE esta lista? Esta ação não pode ser desfeita!')) {
            return;
        }

        try {
            await api.delete(`/admin/listas/${listaId}/permanent-delete`);
            setSuccessMessage('Lista deletada permanentemente!');
            fetchDeletedListas();
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao deletar lista');
            setTimeout(() => setError(null), 3000);
        }
    };

    const handlePermanentDeleteBatch = async () => {
        if (selectedTrashIds.length === 0) {
            setError('Selecione ao menos uma lista para deletar');
            setTimeout(() => setError(null), 3000);
            return;
        }

        if (!window.confirm(`Tem certeza que deseja deletar PERMANENTEMENTE ${selectedTrashIds.length} lista(s)? Esta ação não pode ser desfeita!`)) {
            return;
        }

        try {
            await api.post('/admin/listas/permanent-delete-batch', {
                lista_ids: selectedTrashIds
            });
            setSuccessMessage(`${selectedTrashIds.length} lista(s) deletada(s) permanentemente!`);
            setSelectedTrashIds([]);
            fetchDeletedListas();
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao deletar listas');
            setTimeout(() => setError(null), 3000);
        }
    };

    const handleCloseTrashModal = () => {
        setShowTrashModal(false);
        setSelectedTrashIds([]);
    };

    // Funções do modal de vincular área
    const handleOpenAreaModal = (lista: Lista) => {
        setAreaingLista(lista);
        setSelectedAreaId(lista.area_id ?? '');
        setShowAreaModal(true);
    };

    const handleCloseAreaModal = () => {
        setShowAreaModal(false);
        setAreaingLista(null);
        setSelectedAreaId('');
        setError(null);
    };

    const handleSaveArea = async () => {
        if (!areaingLista) return;
        try {
            setSavingArea(true);
            await api.put(`/v1/listas/${areaingLista.id}`, {
                area_id: selectedAreaId === '' ? null : selectedAreaId
            });
            setSuccessMessage('Área vinculada com sucesso!');
            handleCloseAreaModal();
            fetchListas();
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao vincular área');
        } finally {
            setSavingArea(false);
        }
    };

    const normalizeText = (text: string): string =>
        text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const listasFiltradas = listas
        .filter(l => selectedAreaFilter === null || l.area_id === selectedAreaFilter)
        .filter(l => {
            if (!searchTerm) return true;
            const termo = normalizeText(searchTerm);
            const nomeMatch = normalizeText(l.nome).includes(termo);
            const itemMatch = (l.itens_nomes ?? []).some(n => normalizeText(n).includes(termo));
            return nomeMatch || itemMatch;
        });

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
                        <Button
                            variant="secondary"
                            size="lg"
                            onClick={() => {
                                setShowTrashModal(true);
                                fetchDeletedListas();
                            }}
                            className={styles.iconButton}
                            title="Ver Lixeira"
                        >
                            <FontAwesomeIcon icon={faTrashAlt} />
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

                {/* Campo de busca */}
                <div style={{ marginBottom: '1rem', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#6c757d', pointerEvents: 'none' }}>
                        <FontAwesomeIcon icon={faSearch} />
                    </span>
                    <Form.Control
                        type="text"
                        placeholder="Buscar por nome da lista ou item..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ paddingLeft: '2.2rem', paddingRight: searchTerm ? '2.2rem' : undefined }}
                    />
                    {searchTerm && (
                        <Button
                            variant="link"
                            size="sm"
                            onClick={() => setSearchTerm('')}
                            style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: '#6c757d', padding: 0 }}
                            aria-label="Limpar busca"
                        >
                            <FontAwesomeIcon icon={faTimes} />
                        </Button>
                    )}
                </div>

                {/* Filtro por área */}
                {areas.length > 0 && (
                    <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <Button
                            variant={selectedAreaFilter === null ? 'primary' : 'outline-primary'}
                            size="sm"
                            onClick={() => setSelectedAreaFilter(null)}
                        >
                            Todas
                        </Button>
                        {areas.map(area => (
                            <Button
                                key={area.id}
                                variant={selectedAreaFilter === area.id ? 'primary' : 'outline-primary'}
                                size="sm"
                                onClick={() => setSelectedAreaFilter(selectedAreaFilter === area.id ? null : area.id)}
                            >
                                {area.nome}
                            </Button>
                        ))}
                    </div>
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
                {!loading && listasFiltradas.length === 0 && (
                    <div className={styles.emptyState}>
                        <FontAwesomeIcon icon={faListAlt} size="3x" style={{color: '#ccc', marginBottom: '1rem'}} />
                        <h3>{searchTerm ? 'Nenhuma lista encontrada' : selectedAreaFilter !== null ? 'Nenhuma lista nesta área' : 'Nenhuma lista encontrada'}</h3>
                        <p>{searchTerm ? 'Nenhuma lista ou item corresponde à busca' : selectedAreaFilter !== null ? 'Tente selecionar outra área ou "Todas"' : 'Clique em "Adicionar Lista" para criar sua primeira lista'}</p>
                    </div>
                )}

                {/* Grid com os cards */}
                {!loading && listasFiltradas.length > 0 && (
                    <div className={styles.listasGrid}>
                        {listasFiltradas.map((lista) => (
                            <Card key={lista.id} className={`${styles.listaCard} ${styles.cardLista}`}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.cardIcon}>
                                        <FontAwesomeIcon icon={faListAlt} />
                                    </div>
                                    <div className={styles.cardActions}>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            className={styles.actionPrimary}
                                            onClick={() => navigate(`/collaborator/listas/${lista.id}/estoque`)}
                                        >
                                            <FontAwesomeIcon icon={faClipboardList} /> Preencher
                                        </Button>
                                        <Dropdown align="end">
                                            <Dropdown.Toggle
                                                variant="outline-secondary"
                                                size="sm"
                                                className={styles.actionDropdown}
                                            >
                                                Acoes
                                            </Dropdown.Toggle>
                                            <Dropdown.Menu className={styles.actionMenu}>
                                                <Dropdown.Item onClick={() => handleOpenViewModal(lista)}>
                                                    <FontAwesomeIcon icon={faEye} /> Ver itens
                                                </Dropdown.Item>
                                                <Dropdown.Item onClick={() => navigate(`/admin/listas/${lista.id}/lista-mae`)}>
                                                    <FontAwesomeIcon icon={faShoppingCart} /> Lista mae
                                                </Dropdown.Item>
                                                <Dropdown.Item onClick={() => handleOpenAssignModal(lista)}>
                                                    <FontAwesomeIcon icon={faUsersCog} /> Atribuir colaboradores
                                                </Dropdown.Item>
                                                <Dropdown.Item onClick={() => handleOpenAreaModal(lista)}>
                                                    <FontAwesomeIcon icon={faTag} /> Vincular Área
                                                </Dropdown.Item>
                                                <Dropdown.Item onClick={() => handleExportCSV(lista)}>
                                                    <FontAwesomeIcon icon={faUpload} /> Exportar CSV
                                                </Dropdown.Item>
                                                <Dropdown.Item onClick={() => handleOpenEditModal(lista)}>
                                                    <FontAwesomeIcon icon={faEdit} /> Editar
                                                </Dropdown.Item>
                                                <Dropdown.Divider />
                                                <Dropdown.Item
                                                    className={styles.actionDanger}
                                                    onClick={() => handleOpenDeleteModal(lista)}
                                                >
                                                    <FontAwesomeIcon icon={faTrash} /> Deletar
                                                </Dropdown.Item>
                                            </Dropdown.Menu>
                                        </Dropdown>
                                    </div>
                                </div>
                                <div className={styles.cardContent}>
                                    <h3 className={styles.cardTitulo}>{lista.nome}</h3>

                                    {/* Área */}
                                    {lista.area_nome && (
                                        <div className="mb-2">
                                            <Badge bg="secondary">{lista.area_nome}</Badge>
                                        </div>
                                    )}

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
                                            {formatarDataBrasiliaSemHora(lista.data_criacao)}
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
                <Modal show={showModal} onHide={handleCloseModal} size="lg">
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
                        
                        {/* Abas - apenas ao criar nova lista */}
                        {!editingLista && (
                            <div className="mb-3">
                                <div className="btn-group w-100" role="group">
                                    <button
                                        type="button"
                                        className={`btn ${!showItensTab ? 'btn-primary' : 'btn-outline-secondary'}`}
                                        onClick={() => setShowItensTab(false)}
                                    >
                                        <FontAwesomeIcon icon={faInfoCircle} /> Informações
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn ${showItensTab ? 'btn-primary' : 'btn-outline-secondary'}`}
                                        onClick={() => setShowItensTab(true)}
                                    >
                                        <FontAwesomeIcon icon={faBoxOpen} /> Itens ({selectedItens.size})
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {/* Aba de Informações */}
                        {(!editingLista && !showItensTab) || editingLista ? (
                            <Form>
                                {isSuperAdmin && !editingLista && (
                                    <Form.Group className="mb-3">
                                        <Form.Label>Restaurante *</Form.Label>
                                        <Form.Select
                                            value={formData.restaurante_id}
                                            onChange={(e) => setFormData({...formData, restaurante_id: e.target.value === '' ? '' : Number(e.target.value)})}
                                            required
                                        >
                                            <option value="">Selecione um restaurante</option>
                                            {restaurantes.map(r => (
                                                <option key={r.id} value={r.id}>{r.nome}</option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                )}
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
                                <Form.Group className="mb-3">
                                    <Form.Label>Descrição</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        placeholder="Descrição da lista (opcional)"
                                        value={formData.descricao}
                                        onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label>Área</Form.Label>
                                    <Form.Select
                                        value={formData.area_id}
                                        onChange={(e) => editingLista
                                            ? setFormData({...formData, area_id: e.target.value === '' ? '' : Number(e.target.value)})
                                            : handleCreateAreaChange(e.target.value)
                                        }
                                    >
                                        <option value="">Nenhuma</option>
                                        {areas.map(a => (
                                            <option key={a.id} value={a.id}>{a.nome}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                                {!editingLista && (
                                    <Form.Group className="mb-3">
                                        <Form.Label>Colaboradores</Form.Label>
                                        {loadingCreateColab || loadingUsers ? (
                                            <div><Spinner size="sm" animation="border" /> Carregando...</div>
                                        ) : allUsers.length === 0 ? (
                                            <small className="text-muted">Nenhum colaborador disponível</small>
                                        ) : (
                                            <div style={{maxHeight: '200px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '4px', padding: '0.5rem'}}>
                                                {allUsers.map(user => (
                                                    <Form.Check
                                                        key={user.id}
                                                        type="checkbox"
                                                        id={`create-colab-${user.id}`}
                                                        label={`${user.nome} (${user.email})`}
                                                        checked={createCollaborators.includes(user.id)}
                                                        onChange={() => setCreateCollaborators(prev =>
                                                            prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id]
                                                        )}
                                                        className="mb-1"
                                                    />
                                                ))}
                                            </div>
                                        )}
                                        {createCollaborators.length > 0 && (
                                            <small className="text-success">{createCollaborators.length} colaborador(es) selecionado(s)</small>
                                        )}
                                    </Form.Group>
                                )}
                            </Form>
                        ) : null}
                        
                        {/* Aba de Itens - apenas ao criar */}
                        {!editingLista && showItensTab && (
                            <div>
                                <Alert variant="info">
                                    <FontAwesomeIcon icon={faInfoCircle} /> Selecione os itens que deseja adicionar à lista
                                </Alert>

                                <SeletorItensUnificado
                                    selectedItems={selectedItens}
                                    onToggleItem={(item, quantidadeMinima) => {
                                        const newMap = new Map(selectedItens);
                                        if (quantidadeMinima === null) {
                                            newMap.delete(item.id);
                                        } else {
                                            newMap.set(item.id, quantidadeMinima);
                                        }
                                        setSelectedItens(newMap);
                                    }}
                                />
                            </div>
                        )}
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

                {/* Modal Vincular Área */}
                <Modal show={showAreaModal} onHide={handleCloseAreaModal}>
                    <Modal.Header closeButton>
                        <Modal.Title>
                            <FontAwesomeIcon icon={faTag} style={{marginRight: '0.5rem'}} />
                            Vincular Área — {areaingLista?.nome}
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {error && (
                            <Alert variant="danger" dismissible onClose={() => setError(null)}>
                                {error}
                            </Alert>
                        )}
                        <Form.Group>
                            <Form.Label>Área</Form.Label>
                            <Form.Select
                                value={selectedAreaId}
                                onChange={(e) => setSelectedAreaId(e.target.value === '' ? '' : Number(e.target.value))}
                            >
                                <option value="">Nenhuma (remover vínculo)</option>
                                {areas.map(a => (
                                    <option key={a.id} value={a.id}>{a.nome}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseAreaModal} disabled={savingArea}>
                            Cancelar
                        </Button>
                        <Button variant="primary" onClick={handleSaveArea} disabled={savingArea}>
                            {savingArea ? 'Salvando...' : 'Salvar'}
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
                                <Form.Label>Arquivo CSV (Opcional)</Form.Label>
                                <Form.Control
                                    type="file"
                                    accept=".csv"
                                    onChange={handleImportFileSelect}
                                />
                                <Form.Text className="text-muted">
                                    <strong>Obrigatório:</strong> coluna 'nome'<br/>
                                    <strong>Opcionais:</strong> unidade, quantidade_atual, quantidade_minima
                                </Form.Text>
                            </Form.Group>

                            {importFile && (
                                <Alert variant="success" className="mb-3">
                                    <FontAwesomeIcon icon={faCheckCircle} style={{marginRight: '0.5rem'}} />
                                    Arquivo selecionado: <strong>{importFile.name}</strong>
                                </Alert>
                            )}

                            <div className="text-center mb-3">
                                <small className="text-muted" style={{display: 'block', padding: '0.5rem 0'}}>
                                    <strong>OU</strong>
                                </small>
                            </div>

                            <Form.Group className="mb-3">
                                <Form.Label>Cole o Conteúdo da Lista (Opcional)</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={6}
                                    placeholder="Cole aqui os nomes dos itens (um por linha) ou conteúdo em formato CSV"
                                    value={importTexto}
                                    onChange={(e) => setImportTexto(e.target.value)}
                                />
                                <Form.Text className="text-muted">
                                    <strong>Simples:</strong> um item por linha (nome apenas)<br/>
                                    <strong>CSV:</strong> nome,unidade,quantidade_atual,quantidade_minima (apenas nome é obrigatório)
                                </Form.Text>
                            </Form.Group>

                            {importTexto.trim() && (
                                <Alert variant="success" className="mb-3">
                                    <FontAwesomeIcon icon={faCheckCircle} style={{marginRight: '0.5rem'}} />
                                    Texto carregado: <strong>{importTexto.trim().split('\n').length} linha(s)</strong>
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
                            disabled={importLoading || !importNome.trim() || (!importFile && !importTexto.trim())}
                        >
                            {importLoading ? 'Importando...' : 'Importar Lista'}
                        </Button>
                    </Modal.Footer>
                </Modal>

                {/* Modal Lixeira */}
                <Modal show={showTrashModal} onHide={handleCloseTrashModal} size="lg">
                    <Modal.Header closeButton>
                        <Modal.Title>
                            <FontAwesomeIcon icon={faTrashAlt} style={{marginRight: '0.5rem'}} />
                            Lixeira - Listas Excluídas
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {loadingTrash ? (
                            <div className="text-center my-4">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Carregando...</span>
                                </div>
                                <p className="mt-2">Carregando listas...</p>
                            </div>
                        ) : deletedListas.length === 0 ? (
                            <Alert variant="info">
                                <FontAwesomeIcon icon={faCheckCircle} style={{marginRight: '0.5rem'}} />
                                A lixeira está vazia.
                            </Alert>
                        ) : (
                            <>
                                <div className="mb-3 d-flex justify-content-between align-items-center">
                                    <Form.Check
                                        type="checkbox"
                                        label={`Selecionar todas (${deletedListas.length})`}
                                        checked={selectedTrashIds.length === deletedListas.length && deletedListas.length > 0}
                                        onChange={handleSelectAllTrash}
                                    />
                                    {selectedTrashIds.length > 0 && (
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={handlePermanentDeleteBatch}
                                        >
                                            <FontAwesomeIcon icon={faTrash} style={{marginRight: '0.5rem'}} />
                                            Deletar {selectedTrashIds.length} selecionada(s) permanentemente
                                        </Button>
                                    )}
                                </div>
                                <div className="table-responsive">
                                    <table className="table table-hover">
                                        <thead>
                                            <tr>
                                                <th style={{width: '50px'}}></th>
                                                <th>Nome da Lista</th>
                                                <th>Data de Exclusão</th>
                                                <th className="text-center">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {deletedListas.map((lista) => (
                                                <tr key={lista.id}>
                                                    <td>
                                                        <Form.Check
                                                            type="checkbox"
                                                            checked={selectedTrashIds.includes(lista.id)}
                                                            onChange={() => handleToggleTrashSelection(lista.id)}
                                                        />
                                                    </td>
                                                    <td><strong>{lista.nome}</strong></td>
                                                    <td>
                                                        {lista.data_delecao ? formatarDataHoraBrasilia(lista.data_delecao) : '-'}
                                                    </td>
                                                    <td className="text-center">
                                                        <Button
                                                            variant="success"
                                                            size="sm"
                                                            onClick={() => handleRestoreLista(lista.id)}
                                                            className="me-2"
                                                            title="Restaurar lista"
                                                        >
                                                            <FontAwesomeIcon icon={faUndo} />
                                                        </Button>
                                                        <Button
                                                            variant="danger"
                                                            size="sm"
                                                            onClick={() => handlePermanentDelete(lista.id)}
                                                            title="Deletar permanentemente"
                                                        >
                                                            <FontAwesomeIcon icon={faTrash} />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseTrashModal}>
                            Fechar
                        </Button>
                    </Modal.Footer>
                </Modal>
            </Container>
        </div>
    );
};

export default ListasCompras;
