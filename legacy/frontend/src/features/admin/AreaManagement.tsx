import React, { useState, useEffect } from 'react';
import { Button, Modal, Form, Spinner, Alert, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faList, faUsers, faEdit, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import ResponsiveTable from '../../components/ResponsiveTable';

interface Area {
    id: number;
    nome: string;
}

interface Colaborador {
    id: number;
    nome: string;
    email: string;
}

interface ListaSimples {
    id: number;
    nome: string;
    area_id?: number | null;
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
    const [searchTerm, setSearchTerm] = useState('');

    // Estados para gestão de colaboradores da área
    const [showColabModal, setShowColabModal] = useState(false);
    const [colabArea, setColabArea] = useState<Area | null>(null);
    const [allCollaborators, setAllCollaborators] = useState<Colaborador[]>([]);
    const [selectedColabIds, setSelectedColabIds] = useState<number[]>([]);
    const [loadingColab, setLoadingColab] = useState(false);
    const [savingColab, setSavingColab] = useState(false);
    const [colabError, setColabError] = useState('');
    const [colabSuccess, setColabSuccess] = useState('');

    // Estados para gestão de listas da área
    const [showListasModal, setShowListasModal] = useState(false);
    const [listasArea, setListasArea] = useState<Area | null>(null);
    const [allListas, setAllListas] = useState<ListaSimples[]>([]);
    const [selectedListaIds, setSelectedListaIds] = useState<number[]>([]);
    const [loadingListas, setLoadingListas] = useState(false);
    const [savingListas, setSavingListas] = useState(false);
    const [listasError, setListasError] = useState('');
    const [listasSuccess, setListasSuccess] = useState('');

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

    // Colaboradores da área
    const handleOpenColabModal = async (area: Area) => {
        setColabArea(area);
        setColabError('');
        setColabSuccess('');
        setLoadingColab(true);
        setShowColabModal(true);

        try {
            const [usersRes, areaColabRes] = await Promise.all([
                api.get('/admin/users'),
                api.get(`/v1/areas/${area.id}/colaboradores`)
            ]);

            const colaborators = usersRes.data.filter((u: any) => u.role === 'COLLABORATOR');
            setAllCollaborators(colaborators);

            const assigned: number[] = (areaColabRes.data.colaboradores || []).map((c: Colaborador) => c.id);
            setSelectedColabIds(assigned);
        } catch (err) {
            setColabError('Falha ao carregar colaboradores.');
        } finally {
            setLoadingColab(false);
        }
    };

    const handleCloseColabModal = () => {
        setShowColabModal(false);
        setColabArea(null);
        setAllCollaborators([]);
        setSelectedColabIds([]);
        setColabError('');
        setColabSuccess('');
    };

    const handleToggleColab = (userId: number) => {
        setSelectedColabIds(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleSaveColab = async () => {
        if (!colabArea) return;
        setSavingColab(true);
        setColabError('');
        try {
            await api.post(`/v1/areas/${colabArea.id}/colaboradores`, {
                colaborador_ids: selectedColabIds
            });
            setColabSuccess('Colaboradores atualizados com sucesso!');
            setTimeout(() => handleCloseColabModal(), 1500);
        } catch (err: any) {
            setColabError(err.response?.data?.error || 'Falha ao salvar colaboradores.');
        } finally {
            setSavingColab(false);
        }
    };

    // Listas da área
    const handleOpenListasModal = async (area: Area) => {
        setListasArea(area);
        setListasError('');
        setListasSuccess('');
        setLoadingListas(true);
        setShowListasModal(true);

        try {
            const [todasRes, areaListasRes] = await Promise.all([
                api.get('/v1/listas'),
                api.get(`/v1/areas/${area.id}/listas`)
            ]);

            setAllListas(todasRes.data);

            const vinculadas: number[] = (areaListasRes.data || []).map((l: ListaSimples) => l.id);
            setSelectedListaIds(vinculadas);
        } catch (err) {
            setListasError('Falha ao carregar listas.');
        } finally {
            setLoadingListas(false);
        }
    };

    const handleCloseListasModal = () => {
        setShowListasModal(false);
        setListasArea(null);
        setAllListas([]);
        setSelectedListaIds([]);
        setListasError('');
        setListasSuccess('');
    };

    const handleToggleLista = (listaId: number) => {
        setSelectedListaIds(prev =>
            prev.includes(listaId) ? prev.filter(id => id !== listaId) : [...prev, listaId]
        );
    };

    const handleSaveListas = async () => {
        if (!listasArea) return;
        setSavingListas(true);
        setListasError('');
        try {
            await api.post(`/v1/areas/${listasArea.id}/listas`, {
                lista_ids: selectedListaIds
            });
            setListasSuccess('Listas atualizadas com sucesso!');
            setTimeout(() => handleCloseListasModal(), 1500);
        } catch (err: any) {
            setListasError(err.response?.data?.error || 'Falha ao salvar listas.');
        } finally {
            setSavingListas(false);
        }
    };

    const filteredAreas = areas.filter(area =>
        area.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <h2>Gestão de Áreas</h2>
            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            <Button variant="primary" onClick={() => handleShowModal()} className="mb-3">
                <FontAwesomeIcon icon={faPlus} className="me-2" />Adicionar Área
            </Button>

            <Form.Group className="mb-3">
                <Form.Control
                    type="text"
                    placeholder="Pesquisar por nome..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </Form.Group>

            {isLoading ? (
                <div className="text-center p-4">
                    <Spinner animation="border" />
                </div>
            ) : (
                <ResponsiveTable
                    data={filteredAreas}
                    columns={[
                        { header: '#', accessor: 'id' },
                        { header: 'Nome', accessor: 'nome' }
                    ]}
                    keyExtractor={(area) => area.id.toString()}
                    renderActions={(area) => (
                        <>
                            <Button variant="success" size="sm" onClick={() => handleOpenListasModal(area)} className="me-1" title="Gerenciar Listas">
                                <FontAwesomeIcon icon={faList} className="me-1" />Listas
                            </Button>
                            <Button variant="info" size="sm" onClick={() => handleOpenColabModal(area)} className="me-1" title="Gerenciar Colaboradores">
                                <FontAwesomeIcon icon={faUsers} className="me-1" />Membros
                            </Button>
                            <Button variant="warning" size="sm" onClick={() => handleShowModal(area)} className="me-1" title="Editar">
                                <FontAwesomeIcon icon={faEdit} className="me-1" />Editar
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => handleShowDeleteModal(area)} title="Excluir">
                                <FontAwesomeIcon icon={faTrash} className="me-1" />Excluir
                            </Button>
                        </>
                    )}
                    emptyMessage="Nenhuma área encontrada."
                />
            )}

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

            {/* Modal de Colaboradores da Área */}
            <Modal show={showColabModal} onHide={handleCloseColabModal}>
                <Modal.Header closeButton>
                    <Modal.Title>Colaboradores — {colabArea?.nome}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {colabError && <Alert variant="danger">{colabError}</Alert>}
                    {colabSuccess && <Alert variant="success">{colabSuccess}</Alert>}
                    {loadingColab ? (
                        <div className="text-center p-3">
                            <Spinner animation="border" size="sm" /> Carregando...
                        </div>
                    ) : (
                        <>
                            <p className="text-muted mb-3">
                                Selecione os colaboradores desta área. Ao criar uma nova lista vinculada a esta área, eles serão adicionados automaticamente.
                            </p>
                            {allCollaborators.length === 0 ? (
                                <Alert variant="info">Nenhum colaborador disponível.</Alert>
                            ) : (
                                allCollaborators.map(colab => (
                                    <div key={colab.id} className="d-flex align-items-center mb-2">
                                        <Form.Check
                                            type="checkbox"
                                            id={`colab-${colab.id}`}
                                            checked={selectedColabIds.includes(colab.id)}
                                            onChange={() => handleToggleColab(colab.id)}
                                            label={
                                                <span>
                                                    {colab.nome}{' '}
                                                    <Badge bg="secondary" style={{fontSize: '0.7rem'}}>{colab.email}</Badge>
                                                </span>
                                            }
                                        />
                                    </div>
                                ))
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseColabModal}>Cancelar</Button>
                    <Button variant="primary" onClick={handleSaveColab} disabled={savingColab || loadingColab}>
                        {savingColab ? <><Spinner animation="border" size="sm" /> Salvando...</> : 'Salvar'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal de Listas da Área */}
            <Modal show={showListasModal} onHide={handleCloseListasModal}>
                <Modal.Header closeButton>
                    <Modal.Title>Listas — {listasArea?.nome}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {listasError && <Alert variant="danger">{listasError}</Alert>}
                    {listasSuccess && <Alert variant="success">{listasSuccess}</Alert>}
                    {loadingListas ? (
                        <div className="text-center p-3">
                            <Spinner animation="border" size="sm" /> Carregando...
                        </div>
                    ) : (
                        <>
                            <p className="text-muted mb-3">
                                Selecione as listas que pertencem a esta área.
                            </p>
                            {allListas.length === 0 ? (
                                <Alert variant="info">Nenhuma lista disponível.</Alert>
                            ) : (
                                allListas.map(lista => (
                                    <div key={lista.id} className="d-flex align-items-center mb-2">
                                        <Form.Check
                                            type="checkbox"
                                            id={`lista-${lista.id}`}
                                            checked={selectedListaIds.includes(lista.id)}
                                            onChange={() => handleToggleLista(lista.id)}
                                            label={lista.nome}
                                        />
                                    </div>
                                ))
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseListasModal}>Cancelar</Button>
                    <Button variant="primary" onClick={handleSaveListas} disabled={savingListas || loadingListas}>
                        {savingListas ? <><Spinner animation="border" size="sm" /> Salvando...</> : 'Salvar'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default AreaManagement;
