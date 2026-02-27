import React, { useEffect, useState } from 'react';
import { Alert, Button, Form, InputGroup, Modal, Spinner, Table } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import styles from './CatalogoGlobal.module.css';

interface ItemRegional {
    id: number;
    nome: string;
    unidade_medida: string;
    fornecedor_id: number;
    fornecedor_nome: string;
}

interface Lista {
    id: number;
    nome: string;
}

const ItensRegionais: React.FC = () => {
    const [itens, setItens] = useState<ItemRegional[]>([]);
    const [filteredItens, setFilteredItens] = useState<ItemRegional[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ItemRegional | null>(null);
    const [listas, setListas] = useState<Lista[]>([]);
    const [listaSelecionadaId, setListaSelecionadaId] = useState('');
    const [listasLoading, setListasLoading] = useState(false);
    const [addingItem, setAddingItem] = useState(false);

    const normalizeTexto = (valor: string) =>
        valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    const fetchItens = async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await api.get('/admin/itens-regionais');
            const itensData = response.data?.itens || [];
            setItens(itensData);
            setFilteredItens(itensData);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Falha ao carregar itens regionais.');
            setItens([]);
            setFilteredItens([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchListas = async () => {
        try {
            setListasLoading(true);
            const response = await api.get('/v1/listas');
            const listasResponse = response.data || [];
            setListas(listasResponse);
            if (!listaSelecionadaId && listasResponse.length > 0) {
                setListaSelecionadaId(String(listasResponse[0].id));
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao carregar listas.');
        } finally {
            setListasLoading(false);
        }
    };

    useEffect(() => {
        fetchItens();
    }, []);

    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredItens(itens);
            return;
        }
        const termo = normalizeTexto(searchTerm);
        setFilteredItens(
            itens.filter((item) =>
                normalizeTexto(item.nome).includes(termo) ||
                normalizeTexto(item.fornecedor_nome).includes(termo)
            )
        );
    }, [searchTerm, itens]);

    const handleOpenAddModal = (item: ItemRegional) => {
        setSelectedItem(item);
        setShowAddModal(true);
        if (listas.length === 0 && !listasLoading) {
            fetchListas();
        }
    };

    const handleCloseAddModal = () => {
        setShowAddModal(false);
        setSelectedItem(null);
    };

    const handleAdicionarNaLista = async () => {
        if (!selectedItem || !listaSelecionadaId) {
            setError('Selecione uma lista para adicionar o item.');
            return;
        }

        try {
            setAddingItem(true);
            setError('');
            const response = await api.post(
                `/admin/listas/${listaSelecionadaId}/itens?skip_if_exists=1`,
                {
                    itens: [
                        {
                            id: `fornecedor_${selectedItem.id}`,
                            quantidade_minima: 1
                        }
                    ]
                }
            );
            const data = response.data || {};
            if (data.errors && data.errors.length > 0) {
                setError(data.errors[0].error || 'Erro ao adicionar item na lista.');
                return;
            }

            const mensagem = data.resultados?.[0]?.message || 'Item adicionado à lista.';
            setSuccessMessage(mensagem);
            setShowAddModal(false);
            setSelectedItem(null);
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao adicionar item na lista.');
        } finally {
            setAddingItem(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className="mb-2">Itens Regionais</h2>
                <p className="text-muted">
                    Itens disponibilizados pelos fornecedores regionais.
                </p>
            </div>

            {error && (
                <Alert variant="danger" dismissible onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {successMessage && (
                <Alert variant="success" dismissible onClose={() => setSuccessMessage('')}>
                    {successMessage}
                </Alert>
            )}

            <div className={styles.searchBox}>
                <InputGroup>
                    <InputGroup.Text>
                        <FontAwesomeIcon icon={faSearch} />
                    </InputGroup.Text>
                    <Form.Control
                        type="text"
                        placeholder="Buscar por item ou fornecedor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </InputGroup>
            </div>

            {isLoading ? (
                <div className={styles.loadingState}>
                    <Spinner animation="border" />
                    <p className="mt-2">Carregando itens...</p>
                </div>
            ) : filteredItens.length === 0 ? (
                <div className={styles.emptyState}>
                    Nenhum item regional encontrado.
                </div>
            ) : (
                <div className={styles.tableDesktop}>
                    <Table striped bordered hover responsive>
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Unidade</th>
                                <th>Fornecedor</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItens.map((item) => (
                                <tr key={item.id}>
                                    <td><strong>{item.nome}</strong></td>
                                    <td>{item.unidade_medida}</td>
                                    <td>{item.fornecedor_nome}</td>
                                    <td>
                                        <Button
                                            size="sm"
                                            variant="success"
                                            onClick={() => handleOpenAddModal(item)}
                                            title="Adicionar item na lista"
                                        >
                                            <FontAwesomeIcon icon={faPlus} />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>
            )}

            {/* Modal Adicionar Item em Lista */}
            <Modal show={showAddModal} onHide={handleCloseAddModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Adicionar item na lista</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="mb-3">
                        <strong>Item:</strong> {selectedItem?.nome || '-'}
                    </p>
                    {listasLoading ? (
                        <div className="text-center py-3">
                            <Spinner animation="border" />
                        </div>
                    ) : listas.length === 0 ? (
                        <Alert variant="info">Nenhuma lista encontrada.</Alert>
                    ) : (
                        <Form.Group>
                            <Form.Label>Lista de destino</Form.Label>
                            <Form.Select
                                value={listaSelecionadaId}
                                onChange={(e) => setListaSelecionadaId(e.target.value)}
                            >
                                {listas.map((lista) => (
                                    <option key={lista.id} value={String(lista.id)}>
                                        {lista.nome}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseAddModal}>
                        Cancelar
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleAdicionarNaLista}
                        disabled={addingItem || listasLoading || listas.length === 0}
                    >
                        {addingItem ? 'Adicionando...' : 'Adicionar'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default ItensRegionais;
