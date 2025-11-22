/**
 * Fornecedor Detalhes - Gestão de itens e estoques por fornecedor
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Container, Card, Table, Button, Modal, Form, Alert, Spinner, Row, Col, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faEdit, faBox, faPhone, faPencil, faCheckCircle, faExclamationCircle, faClipboardList } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
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

interface Item {
    id: number;
    nome: string;
    unidade_medida: string;
    fornecedor_id: number;
}

interface Estoque {
    id: number;
    item_id: number;
    quantidade_atual: number;
    quantidade_minima: number;
    pedido: number;
    area_id: number;
    area?: {
        id: number;
        nome: string;
    };
    item?: Item;
}

const FornecedorDetalhes: React.FC = () => {
    const { fornecedorId } = useParams();
    const navigate = useNavigate();
    const [fornecedor, setFornecedor] = useState<Fornecedor | null>(null);
    const [itens, setItens] = useState<Item[]>([]);
    const [estoques, setEstoques] = useState<{ [key: number]: Estoque[] }>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Estados para modal de editar estoque mínimo
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingEstoque, setEditingEstoque] = useState<Estoque | null>(null);
    const [novoMinimo, setNovoMinimo] = useState('');
    const [editingLoading, setEditingLoading] = useState(false);

    // Estados para modal de exportação
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportType, setExportType] = useState<'por-lista' | 'consolidado'>('consolidado');
    const [exportLoading, setExportLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, [fornecedorId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Buscar fornecedor
            const fornRes = await api.get(`/v1/fornecedores/${fornecedorId}`);
            setFornecedor(fornRes.data);

            // Buscar todos os itens
            const itensRes = await api.get('/v1/items');
            const itensFornecedor = itensRes.data.filter(
                (item: Item) => item.fornecedor_id === Number(fornecedorId)
            );
            setItens(itensFornecedor);

            // Para cada item, buscar estoques
            const estoquesMap: { [key: number]: Estoque[] } = {};
            for (const item of itensFornecedor) {
                try {
                    const estRes = await api.get('/v1/estoques', {
                        params: { item_id: item.id }
                    });
                    estoquesMap[item.id] = estRes.data || [];
                } catch (err) {
                    estoquesMap[item.id] = [];
                }
            }
            setEstoques(estoquesMap);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao carregar dados do fornecedor');
            console.error('Erro ao carregar dados:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleEditarMinimo = (estoque: Estoque) => {
        setEditingEstoque(estoque);
        setNovoMinimo(estoque.quantidade_minima.toString());
        setShowEditModal(true);
    };

    const handleSalvarMinimo = async () => {
        if (!editingEstoque || !novoMinimo) return;

        try {
            setEditingLoading(true);
            await api.put(`/v1/estoques/${editingEstoque.id}`, {
                quantidade_minima: parseFloat(novoMinimo)
            });
            setSuccessMessage('Estoque mínimo atualizado com sucesso!');
            setShowEditModal(false);
            await fetchData();

            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao atualizar estoque mínimo');
            console.error('Erro ao salvar:', err);
        } finally {
            setEditingLoading(false);
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
            const now = new Date().toLocaleDateString('pt-BR');

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
                <h4 className={styles.sectionTitle}>
                    <FontAwesomeIcon icon={faBox} style={{ marginRight: '0.5rem' }} />
                    Itens deste Fornecedor ({itens.length})
                </h4>

                {itens.length === 0 ? (
                    <Alert variant="info">
                        <p className="mb-0">Nenhum item cadastrado para este fornecedor.</p>
                    </Alert>
                ) : (
                    <div className={styles.tableWrapper}>
                        <Table striped bordered hover responsive className={styles.estoquesTable}>
                            <thead className={styles.tableHead}>
                                <tr>
                                    <th>Nome do Item</th>
                                    <th>Unidade</th>
                                    <th>Área</th>
                                    <th className={styles.thNumero}>Estoque Atual</th>
                                    <th className={styles.thNumero}>Estoque Mínimo</th>
                                    <th className={styles.thNumero}>Pedido</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {itens.map(item => {
                                    const itemEstoques = estoques[item.id] || [];

                                    if (itemEstoques.length === 0) {
                                        return (
                                            <tr key={item.id} className={styles.rowSemEstoque}>
                                                <td><strong>{item.nome}</strong></td>
                                                <td>{item.unidade_medida}</td>
                                                <td colSpan={5} className="text-muted">
                                                    Sem estoque cadastrado
                                                </td>
                                            </tr>
                                        );
                                    }

                                    return itemEstoques.map((estoque, idx) => (
                                        <tr key={`${item.id}-${estoque.id}`} className={styles.rowEstoque}>
                                            {idx === 0 && (
                                                <>
                                                    <td rowSpan={itemEstoques.length} className={styles.tdItemNome}>
                                                        <strong>{item.nome}</strong>
                                                    </td>
                                                    <td rowSpan={itemEstoques.length}>{item.unidade_medida}</td>
                                                </>
                                            )}
                                            <td>{estoque.area?.nome || 'Sem área'}</td>
                                            <td className={`${styles.tdNumero} ${styles.tdAtual}`}>
                                                {estoque.quantidade_atual}
                                            </td>
                                            <td className={`${styles.tdNumero} ${styles.tdMinimo}`}>
                                                {estoque.quantidade_minima}
                                            </td>
                                            <td
                                                className={`${styles.tdNumero} ${
                                                    estoque.pedido > 0 ? styles.tdPedidoAtivo : styles.tdPedidoZero
                                                }`}
                                            >
                                                <strong>{estoque.pedido}</strong>
                                            </td>
                                            <td className={styles.tdAcoes}>
                                                <Button
                                                    size="sm"
                                                    variant="warning"
                                                    onClick={() => handleEditarMinimo(estoque)}
                                                    title="Editar estoque mínimo"
                                                >
                                                    <FontAwesomeIcon icon={faPencil} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ));
                                })}
                            </tbody>
                        </Table>
                    </div>
                )}
            </div>

            {/* Modal Editar Estoque Mínimo */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FontAwesomeIcon icon={faEdit} style={{ marginRight: '0.5rem' }} />
                        Editar Estoque Mínimo
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>
                                <strong>Item:</strong> {editingEstoque?.item?.nome}
                            </Form.Label>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>
                                <strong>Estoque Atual:</strong> {editingEstoque?.quantidade_atual}
                            </Form.Label>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Quantidade Mínima *</Form.Label>
                            <Form.Control
                                type="number"
                                step="0.01"
                                value={novoMinimo}
                                onChange={(e) => setNovoMinimo(e.target.value)}
                                placeholder="Digite a quantidade mínima"
                                required
                            />
                        </Form.Group>
                        {editingEstoque && (
                            <Form.Group className="mb-3">
                                <Form.Label className={styles.pedidoPreview}>
                                    <strong>Pedido (calculado automaticamente):</strong>{' '}
                                    {Math.max(parseFloat(novoMinimo || '0') - editingEstoque.quantidade_atual, 0)}
                                </Form.Label>
                            </Form.Group>
                        )}
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={editingLoading}>
                        Cancelar
                    </Button>
                    <Button variant="primary" onClick={handleSalvarMinimo} disabled={editingLoading || !novoMinimo}>
                        {editingLoading ? 'Salvando...' : 'Salvar'}
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
