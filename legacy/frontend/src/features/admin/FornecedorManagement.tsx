import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Modal, Form, Spinner, Alert } from 'react-bootstrap';
import api from '../../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faFileDownload, faFileUpload, faEye, faEdit, faTrash, faPlus, faBox } from '@fortawesome/free-solid-svg-icons';
import styles from './FornecedorDetalhes.module.css';
import { useAuth } from '../../context/AuthContext';
import ResponsiveTable from '../../components/ResponsiveTable';
import FornecedorItens from './FornecedorItens';

interface Fornecedor {
    id: number;
    nome: string;
    contato: string;
    meio_envio: string;
    responsavel?: string;
    observacao?: string;
    compartilhado_regiao?: boolean;
    listas?: Lista[];
}

interface Lista {
    id: number;
    nome: string;
    descricao?: string;
}

interface Restaurante {
    id: number;
    nome: string;
}

const FornecedorManagement: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
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
    const [carregandoCSV, setCarregandoCSV] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [restaurantes, setRestaurantes] = useState<Restaurante[]>([]);
    const [restauranteSelecionado, setRestauranteSelecionado] = useState<string>('all');
    const [showItensModal, setShowItensModal] = useState(false);
    const [selectedFornecedorForItens, setSelectedFornecedorForItens] = useState<{
        id: number;
        nome: string;
    } | null>(null);
    const [salvandoCompartilhamento, setSalvandoCompartilhamento] = useState<Set<number>>(new Set());

    const fetchFornecedores = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const params = isSuperAdmin && restauranteSelecionado !== 'all'
                ? { restaurante_id: restauranteSelecionado }
                : undefined;
            const response = await api.get('/v1/fornecedores', { params });
            setFornecedores(response.data);
        } catch (err) {
            setError('Falha ao carregar os fornecedores.');
        } finally {
            setIsLoading(false);
        }
    }, [isSuperAdmin, restauranteSelecionado]);

    const fetchListas = async () => {
        try {
            const response = await api.get('/v1/listas');
            setListas(response.data);
        } catch (err) {
            console.error('Falha ao carregar as listas:', err);
        }
    };

    const fetchRestaurantes = async () => {
        try {
            const response = await api.get('/admin/restaurantes');
            setRestaurantes(response.data.restaurantes || []);
        } catch (err: any) {
            console.error('Falha ao carregar restaurantes:', err);
            setError(err.response?.data?.error || 'Falha ao carregar restaurantes.');
        }
    };

    useEffect(() => {
        fetchListas();
    }, []);

    useEffect(() => {
        if (isSuperAdmin) {
            fetchRestaurantes();
        }
    }, [isSuperAdmin]);

    useEffect(() => {
        fetchFornecedores();
    }, [fetchFornecedores]);

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

    const handleToggleCompartilhado = async (fornecedorId: number, novoValor: boolean) => {
        setSalvandoCompartilhamento((prev) => new Set(prev).add(fornecedorId));
        try {
            await api.put(`/v1/fornecedores/${fornecedorId}`, { compartilhado_regiao: novoValor });
            setFornecedores((prev) =>
                prev.map((fornecedor) =>
                    fornecedor.id === fornecedorId
                        ? { ...fornecedor, compartilhado_regiao: novoValor }
                        : fornecedor
                )
            );
        } catch (err) {
            setError('Falha ao atualizar compartilhamento regional.');
        } finally {
            setSalvandoCompartilhamento((prev) => {
                const next = new Set(prev);
                next.delete(fornecedorId);
                return next;
            });
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

        if (isSuperAdmin && !isEditing && restauranteSelecionado === 'all') {
            setError('Selecione um restaurante para adicionar o fornecedor.');
            return;
        }

        const fornecedorData: Record<string, any> = {
            ...currentFornecedor,
            lista_ids: Array.from(selectedListIds)
        };
        if (isSuperAdmin && !isEditing) {
            fornecedorData.restaurante_id = Number(restauranteSelecionado);
        }

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

    const handleExportCSV = async () => {
        setCarregandoCSV(true);
        try {
            const response = await api.get('/v1/fornecedores/export-csv', {
                responseType: 'blob',
                params: isSuperAdmin && restauranteSelecionado !== 'all'
                    ? { restaurante_id: restauranteSelecionado }
                    : undefined
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'fornecedores.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            setError('Falha ao exportar CSV.');
        } finally {
            setCarregandoCSV(false);
        }
    };

    const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (isSuperAdmin && restauranteSelecionado === 'all') {
            setError('Selecione um restaurante para importar o CSV.');
            return;
        }

        setCarregandoCSV(true);
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const csvContent = e.target?.result as string;
                const response = await api.post('/v1/fornecedores/import-csv', csvContent, {
                    headers: {
                        'Content-Type': 'text/csv'
                    },
                    params: isSuperAdmin
                        ? { restaurante_id: restauranteSelecionado }
                        : undefined
                });

                alert(`${response.data.fornecedores_criados} fornecedor(es) criado(s).\n${response.data.fornecedores_duplicados} fornecedor(es) duplicado(s) ignorado(s).`);
                fetchFornecedores();
            } catch (err: any) {
                setError(err.response?.data?.error || 'Falha ao importar CSV.');
            } finally {
                setCarregandoCSV(false);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        };

        reader.readAsText(file);
    };

    return (
        <div style={{ padding: '2rem 0' }}>
            <Link to="/admin" className={styles.backLink} style={{ marginBottom: '1.5rem', display: 'inline-block' }}>
                <FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: '0.5rem' }} />
                Voltar
            </Link>
            <h2 style={{ marginTop: '1.5rem' }}>Gestão de Fornecedores</h2>
            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

            <div className="mb-3 d-flex gap-2 flex-wrap">
                <Button variant="primary" onClick={() => handleShowModal()}>
                    <FontAwesomeIcon icon={faPlus} className="me-2" />Adicionar Fornecedor
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
                <Button
                    variant="success"
                    onClick={handleExportCSV}
                    disabled={carregandoCSV || fornecedores.length === 0}
                >
                    {carregandoCSV ? (
                        <><Spinner animation="border" size="sm" className="me-2" />Exportando...</>
                    ) : (
                        <><FontAwesomeIcon icon={faFileDownload} className="me-2" />Exportar CSV</>
                    )}
                </Button>
                <Button
                    variant="info"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={carregandoCSV}
                >
                    {carregandoCSV ? (
                        <><Spinner animation="border" size="sm" className="me-2" />Importando...</>
                    ) : (
                        <><FontAwesomeIcon icon={faFileUpload} className="me-2" />Importar CSV</>
                    )}
                </Button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImportCSV}
                    accept=".csv"
                    style={{ display: 'none' }}
                />
            </div>

            {isLoading ? (
                <div className="text-center p-4">
                    <Spinner animation="border" />
                </div>
            ) : (
                <ResponsiveTable
                    data={fornecedores}
                    columns={[
                        { header: 'Nome', accessor: 'nome' },
                        { header: 'Contato', accessor: 'contato' },
                        { header: 'Meio de Envio', accessor: 'meio_envio', mobileLabel: 'Envio' },
                        { header: 'Responsável', accessor: (f) => f.responsavel || '-' },
                        {
                            header: 'Observações',
                            accessor: (f) => f.observacao
                                ? (f.observacao.length > 50 ? f.observacao.substring(0, 50) + '...' : f.observacao)
                                : '-',
                            mobileLabel: 'Obs'
                        },
                        {
                            header: 'Lista',
                            accessor: (f) => f.listas && f.listas.length > 0
                                ? f.listas.map((l: Lista) => l.nome).join(', ')
                                : '-'
                        },
                        {
                            header: 'Regional',
                            accessor: (f) => (
                                <Form.Check
                                    type="switch"
                                    id={`fornecedor-regional-${f.id}`}
                                    checked={!!f.compartilhado_regiao}
                                    onChange={(e) => handleToggleCompartilhado(f.id, e.target.checked)}
                                    disabled={salvandoCompartilhamento.has(f.id)}
                                    label=""
                                    aria-label="Compartilhar fornecedor na regiao"
                                    className="mb-0"
                                />
                            ),
                            mobileLabel: 'Regional'
                        }
                    ]}
                    keyExtractor={(f) => f.id.toString()}
                    renderActions={(f) => (
                        <>
                            <Button
                                variant="info"
                                size="sm"
                                onClick={() => navigate(`/admin/fornecedores/${f.id}/detalhes`)}
                                className="me-1"
                            >
                                <FontAwesomeIcon icon={faEye} className="me-1" />Detalhes
                            </Button>
                            <Button
                                variant="warning"
                                size="sm"
                                onClick={() => handleShowModal(f)}
                                className="me-1"
                            >
                                <FontAwesomeIcon icon={faEdit} className="me-1" />Editar
                            </Button>
                            <Button
                                variant="info"
                                size="sm"
                                onClick={() => {
                                    setSelectedFornecedorForItens({ id: f.id, nome: f.nome });
                                    setShowItensModal(true);
                                }}
                                className="me-1"
                                title="Gerenciar Itens"
                            >
                                <FontAwesomeIcon icon={faBox} className="me-1" />Itens
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleShowDeleteModal(f)}
                            >
                                <FontAwesomeIcon icon={faTrash} className="me-1" />Excluir
                            </Button>
                        </>
                    )}
                    emptyMessage="Nenhum fornecedor cadastrado."
                />
            )}

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

            {selectedFornecedorForItens && (
                <FornecedorItens
                    fornecedorId={selectedFornecedorForItens.id}
                    fornecedorNome={selectedFornecedorForItens.nome}
                    show={showItensModal}
                    onHide={() => {
                        setShowItensModal(false);
                        setSelectedFornecedorForItens(null);
                    }}
                />
            )}
        </div>
    );
};

export default FornecedorManagement;
