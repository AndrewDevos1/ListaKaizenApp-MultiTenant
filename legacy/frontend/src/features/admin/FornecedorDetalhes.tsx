/**
 * Fornecedor Detalhes - Gestão de itens e vinculo com listas
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Container, Card, Table, Button, Modal, Form, Alert, Spinner, Row, Col, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faBox, faPlus, faCheckCircle, faExclamationCircle, faClipboardList } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import { formatarDataBrasiliaSemHora } from '../../utils/dateFormatter';
import styles from './FornecedorDetalhes.module.css';

interface Fornecedor {
    id: number;
    nome: string;
    contato: string;
    meio_envio: string;
    responsavel?: string;
    observacao?: string;
    listas?: {
        id: number;
        nome: string;
    }[];
}

interface Lista {
    id: number;
    nome: string;
}

interface Item {
    id: number;
    nome: string;
    unidade_medida: string;
    fornecedor_id: number;
}

const FornecedorDetalhes: React.FC = () => {
    const { fornecedorId } = useParams();
    const navigate = useNavigate();
    const [fornecedor, setFornecedor] = useState<Fornecedor | null>(null);
    const [itens, setItens] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Estados para modal de adicionar item na lista
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [listas, setListas] = useState<Lista[]>([]);
    const [listaSelecionadaId, setListaSelecionadaId] = useState('');
    const [listasLoading, setListasLoading] = useState(false);
    const [addingItem, setAddingItem] = useState(false);

    // Estados para modal de exportação
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportType, setExportType] = useState<'por-lista' | 'consolidado'>('consolidado');
    const [exportLoading, setExportLoading] = useState(false);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fornecedorId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await api.get(`/v1/fornecedores/${fornecedorId}/detalhes-estoque`);
            const data = response.data || {};

            setFornecedor(data.fornecedor || null);
            setItens(data.itens || []);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao carregar dados do fornecedor');
            console.error('Erro ao carregar dados:', err);
        } finally {
            setLoading(false);
        }
    };

    const normalizeTexto = (valor: string) =>
        valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    const itensFiltrados = useMemo(() => {
        if (!searchTerm.trim()) {
            return itens;
        }
        const termo = normalizeTexto(searchTerm);
        return itens.filter((item) => normalizeTexto(item.nome).includes(termo));
    }, [itens, searchTerm]);

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

    const handleOpenAddModal = (item: Item) => {
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
            setError(null);
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
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao adicionar item na lista.');
        } finally {
            setAddingItem(false);
        }
    };

    const convertToCSV = (data: any[], headers: string[]): string => {
        const csv = [headers.join(',')];
        data.forEach(row => {
            csv.push(headers.map(header => `"${row[header] || ''}"`).join(','));
        });
        return csv.join('\n');
    };

    const handleExportPedidos = async () => {
        if (!fornecedor) return;

        try {
            setExportLoading(true);
            const endpoint = exportType === 'por-lista'
                ? `/v1/fornecedores/${fornecedor.id}/pedidos-por-lista`
                : `/v1/fornecedores/${fornecedor.id}/pedidos-consolidados`;

            const response = await api.get(endpoint);
            const data = response.data;

            let csvContent = '';
            const now = formatarDataBrasiliaSemHora(new Date().toISOString());

            if (exportType === 'consolidado') {
                // Exportação consolidada
                csvContent = `Pedidos Consolidados - ${data.fornecedor_nome}\n`;
                csvContent += `Data de Exportação: ${now}\n`;
                csvContent += `Contato: ${data.fornecedor_contato}\n`;
                csvContent += `Meio de Envio: ${data.fornecedor_meio_envio}\n`;
                csvContent += `\n`;
                csvContent += convertToCSV(
                    data.pedidos,
                    ['item_nome', 'quantidade', 'unidade', 'usuario']
                );

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `pedidos_${fornecedor.nome}_consolidado_${now}.csv`;
                link.click();
            } else {
                // Exportação por lista
                for (const listaId in data) {
                    const lista = data[listaId];
                    let listaCsv = `Pedidos - ${lista.lista_nome}\n`;
                    listaCsv += `Data de Exportação: ${now}\n`;
                    listaCsv += `Fornecedor: ${fornecedor.nome}\n`;
                    listaCsv += `\n`;
                    listaCsv += convertToCSV(
                        lista.pedidos,
                        ['item_nome', 'quantidade', 'unidade', 'usuario']
                    );

                    const blob = new Blob([listaCsv], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `pedidos_${lista.lista_nome}_${now}.csv`;
                    link.click();

                    // Pequeno delay entre downloads
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            setShowExportModal(false);
            setSuccessMessage('Pedidos exportados com sucesso!');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao exportar pedidos');
            console.error('Erro ao exportar:', err);
        } finally {
            setExportLoading(false);
        }
    };

    if (loading) {
        return (
            <Container className={styles.container}>
                <div className={styles.loadingSpinner}>
                    <Spinner animation="border" role="status">
                        <span className="visually-hidden">Carregando...</span>
                    </Spinner>
                    <p>Carregando dados do fornecedor...</p>
                </div>
            </Container>
        );
    }

    if (!fornecedor) {
        return (
            <Container className={styles.container}>
                <Alert variant="danger">
                    <FontAwesomeIcon icon={faExclamationCircle} style={{ marginRight: '0.5rem' }} />
                    Fornecedor não encontrado
                </Alert>
                <Link to="/admin/fornecedores">← Voltar para Fornecedores</Link>
            </Container>
        );
    }

    return (
        <Container className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <Link to="/admin/fornecedores" className={styles.backLink}>
                    <FontAwesomeIcon icon={faArrowLeft} style={{ marginRight: '0.5rem' }} />
                    Voltar para Fornecedores
                </Link>
            </div>

            {/* Alertas */}
            {error && (
                <Alert variant="danger" dismissible onClose={() => setError(null)} className="mt-3">
                    <FontAwesomeIcon icon={faExclamationCircle} style={{ marginRight: '0.5rem' }} />
                    {error}
                </Alert>
            )}

            {successMessage && (
                <Alert variant="success" dismissible onClose={() => setSuccessMessage(null)} className="mt-3">
                    <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: '0.5rem' }} />
                    {successMessage}
                </Alert>
            )}

            {/* Card do Fornecedor */}
            <Card className={`${styles.fornecedorCard} mt-4 mb-4`}>
                <Card.Header className={styles.cardHeader}>
                    <div>
                        <h2 className={styles.fornecedorNome}>
                            <FontAwesomeIcon icon={faBox} style={{ marginRight: '0.75rem', color: '#f9b115' }} />
                            {fornecedor.nome}
                        </h2>
                    </div>
                </Card.Header>
                <Card.Body>
                    <Row>
                        <Col md={6}>
                            <p className={styles.fornecedorInfo}>
                                <strong>Contato:</strong> {fornecedor.contato || 'Não informado'}
                            </p>
                        </Col>
                        <Col md={6}>
                            <p className={styles.fornecedorInfo}>
                                <strong>Meio de Envio:</strong> {fornecedor.meio_envio || 'Não informado'}
                            </p>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={6}>
                            <p className={styles.fornecedorInfo}>
                                <strong>Responsável:</strong> {fornecedor.responsavel || 'Não informado'}
                            </p>
                        </Col>
                        <Col md={6}>
                            <div>
                                <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Listas Atribuídas:</strong>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {fornecedor.listas && fornecedor.listas.length > 0 ? (
                                        fornecedor.listas.map(lista => (
                                            <Button
                                                key={lista.id}
                                                variant="info"
                                                size="sm"
                                                onClick={() => navigate(`/admin/listas/${lista.id}/lista-mae`)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <FontAwesomeIcon icon={faClipboardList} style={{ marginRight: '0.5rem' }} />
                                                {lista.nome}
                                            </Button>
                                        ))
                                    ) : (
                                        <Badge bg="secondary">Nenhuma</Badge>
                                    )}
                                </div>
                            </div>
                        </Col>
                    </Row>
                    {fornecedor.observacao && (
                        <Row>
                            <Col md={12}>
                                <p className={styles.fornecedorInfo}>
                                    <strong>Observações:</strong>
                                </p>
                                <p className={styles.observacaoText}>{fornecedor.observacao}</p>
                            </Col>
                        </Row>
                    )}
                </Card.Body>
            </Card>

            {/* Botão de Exportação */}
            <div style={{ marginBottom: '2rem' }}>
                <Button
                    variant="success"
                    onClick={() => setShowExportModal(true)}
                    style={{ marginRight: '1rem' }}
                >
                    <i className="fas fa-download me-2"></i>Exportar Pedidos
                </Button>
            </div>

            {/* Tabela de Itens */}
            <div className={styles.itensSection}>
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3">
                    <h4 className={styles.sectionTitle}>
                        <FontAwesomeIcon icon={faBox} style={{ marginRight: '0.5rem' }} />
                        Itens deste Fornecedor (
                        {searchTerm ? `${itensFiltrados.length} de ${itens.length}` : itens.length})
                    </h4>
                    <Form.Control
                        type="text"
                        placeholder="Buscar item..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ maxWidth: '320px' }}
                    />
                </div>

                {itens.length === 0 ? (
                    <Alert variant="info">
                        <p className="mb-0">Nenhum item cadastrado para este fornecedor.</p>
                    </Alert>
                ) : itensFiltrados.length === 0 ? (
                    <Alert variant="info">
                        <p className="mb-0">Nenhum item encontrado para esse filtro.</p>
                    </Alert>
                ) : (
                    <div className={styles.tableWrapper}>
                        <Table striped bordered hover responsive className={styles.estoquesTable}>
                            <thead className={styles.tableHead}>
                                <tr>
                                    <th>Nome do Item</th>
                                    <th>Unidade</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {itensFiltrados.map((item) => (
                                    <tr key={item.id}>
                                        <td className={styles.tdItemNome}>
                                            <strong>{item.nome}</strong>
                                        </td>
                                        <td>{item.unidade_medida}</td>
                                        <td className={styles.tdAcoes}>
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
            </div>

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

            {/* Modal de Exportação de Pedidos */}
            <Modal show={showExportModal} onHide={() => setShowExportModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i className="fas fa-download me-2"></i>Exportar Pedidos
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="mb-3">Escolha como você deseja exportar os pedidos deste fornecedor:</p>
                    <Form>
                        <Form.Check
                            type="radio"
                            id="consolidado"
                            label="Consolidado - Um arquivo com todos os pedidos"
                            name="exportType"
                            value="consolidado"
                            checked={exportType === 'consolidado'}
                            onChange={(e) => setExportType('consolidado')}
                            className="mb-3"
                        />
                        <Form.Check
                            type="radio"
                            id="por-lista"
                            label="Por Lista - Um arquivo para cada lista atribuída"
                            name="exportType"
                            value="por-lista"
                            checked={exportType === 'por-lista'}
                            onChange={(e) => setExportType('por-lista')}
                        />
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowExportModal(false)} disabled={exportLoading}>
                        Cancelar
                    </Button>
                    <Button variant="success" onClick={handleExportPedidos} disabled={exportLoading}>
                        {exportLoading ? 'Exportando...' : 'Exportar em CSV'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default FornecedorDetalhes;
