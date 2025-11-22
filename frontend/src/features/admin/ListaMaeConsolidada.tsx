/**
 * Lista Mãe Consolidada - Visão do Administrador
 *
 * Tabela para gerenciar itens de uma lista:
 * - Nome, Unidade, Qtd Atual, Qtd Mínima
 * - Pedido é calculado automaticamente (qtd_min - qtd_atual)
 * - Admin pode adicionar, editar e deletar itens
 * - NOVO: Selecionar múltiplos itens e atribuir fornecedor para gerar pedidos
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Button, Table, Alert, Row, Col, Badge, Spinner, Form, Modal } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft,
    faExclamationTriangle,
    faClipboardList,
    faPlus,
    faEdit,
    faTrash,
    faCheck,
    faTruck
} from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import styles from './ListaMaeConsolidada.module.css';

// Interface do Item
interface ListaMaeItem {
    id?: number;
    nome: string;
    unidade: 'Kg' | 'Litro' | 'Unidade';
    quantidade_atual: number;
    quantidade_minima: number;
    pedido?: number;
}

interface ListaMae {
    lista_id: number;
    lista_nome: string;
    lista_descricao: string;
    data_criacao: string;
    fornecedores: Fornecedor[];
    itens: ListaMaeItem[];
    total_itens: number;
}

interface Fornecedor {
    id: number;
    nome: string;
    contato?: string;
    meio_envio?: string;
    responsavel?: string;
    observacao?: string;
}

const ListaMaeConsolidada: React.FC = () => {
    const { listaId } = useParams<{ listaId: string }>();
    const navigate = useNavigate();

    const [listaMae, setListaMae] = useState<ListaMae | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Estado para adicionar novo item
    const [novoItem, setNovoItem] = useState<ListaMaeItem>({
        nome: '',
        unidade: 'Kg',
        quantidade_atual: 0,
        quantidade_minima: 0
    });

    // Estado para edição inline
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [itemEditando, setItemEditando] = useState<ListaMaeItem | null>(null);

    // Estado para seleção e atribuição de fornecedor
    const [itensSelecionados, setItensSelecionados] = useState<Set<number>>(new Set());
    const [todosVerificados, setTodosVerificados] = useState(false);
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
    const [fornecedorSelecionado, setFornecedorSelecionado] = useState<number | null>(null);
    const [mostrarModalFornecedor, setMostrarModalFornecedor] = useState(false);
    const [carregandoPedidos, setCarregandoPedidos] = useState(false);

    useEffect(() => {
        if (listaId) {
            fetchListaMae();
            fetchFornecedores();
        }
    }, [listaId]);

    const fetchListaMae = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get<ListaMae>(`/admin/listas/${listaId}/lista-mae`);
            setListaMae(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao carregar lista mãe');
            console.error('Erro:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchFornecedores = async () => {
        try {
            const response = await api.get<Fornecedor[]>('/admin/fornecedores');
            setFornecedores(response.data);
        } catch (err: any) {
            console.error('Erro ao carregar fornecedores:', err);
        }
    };

    const handleAdicionarItem = async () => {
        if (!novoItem.nome || !novoItem.unidade) {
            setError('Preencha nome e unidade do item');
            return;
        }

        try {
            console.log('[LISTA MAE] Adicionando item:', novoItem);
            const response = await api.post(`/admin/listas/${listaId}/mae-itens`, novoItem);
            console.log('[LISTA MAE] Item adicionado com sucesso:', response.data);

            if (listaMae) {
                setListaMae({
                    ...listaMae,
                    itens: [...listaMae.itens, response.data],
                    total_itens: listaMae.total_itens + 1
                });
            }

            setNovoItem({
                nome: '',
                unidade: 'Kg',
                quantidade_atual: 0,
                quantidade_minima: 0
            });
            setError(null);
            setSuccess('Item adicionado com sucesso!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            console.error('[LISTA MAE] Erro completo:', err);
            setError(err.response?.data?.error || err.message || 'Erro ao adicionar item');
        }
    };

    const handleEditarItem = async (item: ListaMaeItem) => {
        if (!item.id) return;

        try {
            const dataToSend = {
                nome: item.nome,
                unidade: item.unidade,
                quantidade_atual: item.quantidade_atual,
                quantidade_minima: item.quantidade_minima
            };

            const response = await api.put(`/admin/listas/${listaId}/mae-itens/${item.id}`, dataToSend);
            const updatedItem = response.data;

            if (listaMae) {
                setListaMae({
                    ...listaMae,
                    itens: listaMae.itens.map(i => i.id === item.id ? updatedItem : i)
                });
            }

            setEditandoId(null);
            setItemEditando(null);
            setError(null);
            setSuccess('Item atualizado com sucesso!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao editar item');
        }
    };

    const handleDeletarItem = async (itemId: number) => {
        if (!window.confirm('Tem certeza que deseja remover este item?')) return;

        try {
            await api.delete(`/admin/listas/${listaId}/mae-itens/${itemId}`);

            if (listaMae) {
                setListaMae({
                    ...listaMae,
                    itens: listaMae.itens.filter(i => i.id !== itemId),
                    total_itens: listaMae.total_itens - 1
                });
            }

            // Remove da seleção se estava selecionado
            const novosSelecionados = new Set(itensSelecionados);
            novosSelecionados.delete(itemId);
            setItensSelecionados(novosSelecionados);

            setError(null);
            setSuccess('Item removido com sucesso!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao remover item');
        }
    };

    // Funções para checkbox
    const toggleItemSelecionado = (itemId: number | undefined) => {
        if (!itemId) return;

        const novosSelecionados = new Set(itensSelecionados);
        if (novosSelecionados.has(itemId)) {
            novosSelecionados.delete(itemId);
        } else {
            novosSelecionados.add(itemId);
        }
        setItensSelecionados(novosSelecionados);
    };

    const toggleTodosSelecionados = () => {
        if (todosVerificados || itensSelecionados.size > 0) {
            setItensSelecionados(new Set());
            setTodosVerificados(false);
        } else {
            const todosIds = new Set(listaMae?.itens.map(item => item.id).filter(id => id !== undefined) as number[]);
            setItensSelecionados(todosIds);
            setTodosVerificados(true);
        }
    };

    // Gerar pedidos
    const handleAtribuirFornecedor = async () => {
        if (!fornecedorSelecionado) {
            setError('Selecione um fornecedor');
            return;
        }

        if (itensSelecionados.size === 0) {
            setError('Selecione pelo menos um item');
            return;
        }

        try {
            setCarregandoPedidos(true);
            setError(null);

            const response = await api.post(
                `/admin/listas/${listaId}/atribuir-fornecedor`,
                {
                    item_ids: Array.from(itensSelecionados),
                    fornecedor_id: fornecedorSelecionado
                }
            );

            setSuccess(`${response.data.total_pedidos} pedido(s) criado(s) com sucesso!`);

            // Limpar seleção
            setItensSelecionados(new Set());
            setTodosVerificados(false);
            setFornecedorSelecionado(null);
            setMostrarModalFornecedor(false);

            // Recarregar lista
            fetchListaMae();

            setTimeout(() => setSuccess(null), 5000);
        } catch (err: any) {
            console.error('Erro ao atribuir fornecedor:', err);
            setError(err.response?.data?.error || 'Erro ao gerar pedidos');
        } finally {
            setCarregandoPedidos(false);
        }
    };

    const calcularPedido = (qtdMin: number, qtdAtual: number) => {
        return Math.max(0, qtdMin - qtdAtual);
    };

    if (loading) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Carregando...</span>
                </Spinner>
            </Container>
        );
    }

    if (!listaMae) {
        return (
            <Container className={`py-4 ${styles.container}`}>
                <Alert variant="danger">
                    <FontAwesomeIcon icon={faExclamationTriangle} /> Lista não encontrada
                </Alert>
                <Button onClick={() => navigate('/admin/listas-compras')} variant="outline-secondary">
                    <FontAwesomeIcon icon={faArrowLeft} /> Voltar
                </Button>
            </Container>
        );
    }

    const fornecedorNome = fornecedores.find(f => f.id === fornecedorSelecionado)?.nome;

    return (
        <Container fluid className={`py-4 ${styles.container}`}>
            {/* Header */}
            <div className={styles.header}>
                <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => navigate('/admin/listas-compras')}
                    className="mb-3"
                >
                    <FontAwesomeIcon icon={faArrowLeft} /> Voltar
                </Button>

                <h1 className={styles.title}>
                    <FontAwesomeIcon icon={faClipboardList} /> Lista Mãe Consolidada
                </h1>
                <h2 className={styles.subtitle}>{listaMae.lista_nome}</h2>
                {listaMae.lista_descricao && (
                    <p className="text-muted">{listaMae.lista_descricao}</p>
                )}

                {/* Seção de Fornecedores */}
                {listaMae.fornecedores && listaMae.fornecedores.length > 0 && (
                    <div style={{ marginTop: '2rem', borderTop: '1px solid #e0e0e0', paddingTop: '1.5rem' }}>
                        <h4 style={{ marginBottom: '1rem', fontWeight: 'bold' }}>
                            Fornecedores Atribuídos ({listaMae.fornecedores.length})
                        </h4>
                        <Row>
                            {listaMae.fornecedores.map((fornecedor) => (
                                <Col key={fornecedor.id} md={6} className="mb-3">
                                    <Card style={{ height: '100%', backgroundColor: '#f9f9f9' }}>
                                        <Card.Body>
                                            <h5 style={{ marginBottom: '0.5rem', color: '#2c3e50' }}>
                                                {fornecedor.nome}
                                            </h5>
                                            {fornecedor.responsavel && (
                                                <p style={{ marginBottom: '0.3rem', fontSize: '0.9rem' }}>
                                                    <strong>Responsável:</strong> {fornecedor.responsavel}
                                                </p>
                                            )}
                                            {fornecedor.contato && (
                                                <p style={{ marginBottom: '0.3rem', fontSize: '0.9rem' }}>
                                                    <strong>Contato:</strong> {fornecedor.contato}
                                                </p>
                                            )}
                                            {fornecedor.meio_envio && (
                                                <p style={{ marginBottom: '0.3rem', fontSize: '0.9rem' }}>
                                                    <strong>Meio de Envio:</strong> {fornecedor.meio_envio}
                                                </p>
                                            )}
                                            {fornecedor.observacao && (
                                                <p style={{ marginTop: '0.5rem', marginBottom: '0', fontSize: '0.9rem', color: '#666', fontStyle: 'italic' }}>
                                                    <strong>Obs:</strong> {fornecedor.observacao}
                                                </p>
                                            )}
                                        </Card.Body>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    </div>
                )}
            </div>

            {/* Alertas */}
            {error && (
                <Alert variant="danger" onClose={() => setError(null)} dismissible>
                    <FontAwesomeIcon icon={faExclamationTriangle} /> {error}
                </Alert>
            )}
            {success && (
                <Alert variant="success" onClose={() => setSuccess(null)} dismissible>
                    <FontAwesomeIcon icon={faCheck} /> {success}
                </Alert>
            )}

            {/* Resumo */}
            <Row className="mb-4 g-3">
                <Col md={4}>
                    <Card className={styles.statsCard}>
                        <Card.Body className="text-center">
                            <h3 className={styles.statValue}>{listaMae.total_itens}</h3>
                            <p className={styles.statLabel}>Total de Itens</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className={styles.statsCard}>
                        <Card.Body className="text-center">
                            <h3 className={styles.statValue}>{itensSelecionados.size}</h3>
                            <p className={styles.statLabel}>Itens Selecionados</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className={styles.statsCard}>
                        <Card.Body className="text-center">
                            <small className="text-muted">Criada em</small>
                            <p className={styles.statDate}>
                                {new Date(listaMae.data_criacao).toLocaleDateString('pt-BR')}
                            </p>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Barra de Ações */}
            {itensSelecionados.size > 0 && (
                <Row className="mb-3">
                    <Col>
                        <Card className="bg-light">
                            <Card.Body className="py-2">
                                <Row className="align-items-center">
                                    <Col>
                                        <strong>{itensSelecionados.size} item(ns) selecionado(s)</strong>
                                    </Col>
                                    <Col className="text-end">
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={() => setMostrarModalFornecedor(true)}
                                        >
                                            <FontAwesomeIcon icon={faTruck} /> Atribuir Fornecedor
                                        </Button>
                                        <Button
                                            variant="outline-secondary"
                                            size="sm"
                                            onClick={() => {
                                                setItensSelecionados(new Set());
                                                setTodosVerificados(false);
                                            }}
                                            className="ms-2"
                                        >
                                            Limpar Seleção
                                        </Button>
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Tabela */}
            <div className={styles.tableWrapper}>
                <Table striped bordered hover responsive className={styles.table}>
                    <thead>
                        <tr className={styles.tableHeader}>
                            <th style={{ width: '40px' }}>
                                <input
                                    type="checkbox"
                                    checked={todosVerificados}
                                    onChange={toggleTodosSelecionados}
                                    title="Selecionar todos"
                                />
                            </th>
                            <th>Nome</th>
                            <th className="text-center" style={{ width: '100px' }}>Unidade</th>
                            <th className="text-center" style={{ width: '120px' }}>Qtd Atual</th>
                            <th className="text-center" style={{ width: '120px' }}>Qtd Mín</th>
                            <th className="text-center" style={{ width: '100px' }}>Pedido</th>
                            <th className="text-center" style={{ width: '100px' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Linha para adicionar novo item */}
                        <tr className={styles.addItemRow}>
                            <td>-</td>
                            <td>
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    placeholder="Nome do item"
                                    value={novoItem.nome}
                                    onChange={(e) => setNovoItem({ ...novoItem, nome: e.target.value })}
                                />
                            </td>
                            <td>
                                <select
                                    className="form-select form-select-sm"
                                    value={novoItem.unidade}
                                    onChange={(e) => setNovoItem({ ...novoItem, unidade: e.target.value as 'Kg' | 'Litro' | 'Unidade' })}
                                >
                                    <option value="Kg">Kg</option>
                                    <option value="Litro">Litro</option>
                                    <option value="Unidade">Unidade</option>
                                </select>
                            </td>
                            <td>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="form-control form-control-sm"
                                    placeholder="0"
                                    value={novoItem.quantidade_atual}
                                    onChange={(e) => setNovoItem({ ...novoItem, quantidade_atual: parseFloat(e.target.value) || 0 })}
                                />
                            </td>
                            <td>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="form-control form-control-sm"
                                    placeholder="0"
                                    value={novoItem.quantidade_minima}
                                    onChange={(e) => setNovoItem({ ...novoItem, quantidade_minima: parseFloat(e.target.value) || 0 })}
                                />
                            </td>
                            <td className="text-center">
                                <Badge bg="info">
                                    {calcularPedido(novoItem.quantidade_minima, novoItem.quantidade_atual)}
                                </Badge>
                            </td>
                            <td className="text-center">
                                <Button
                                    variant="success"
                                    size="sm"
                                    onClick={handleAdicionarItem}
                                    title="Adicionar item"
                                >
                                    <FontAwesomeIcon icon={faPlus} />
                                </Button>
                            </td>
                        </tr>

                        {/* Itens salvos */}
                        {listaMae.itens && listaMae.itens.length > 0 ? (
                            listaMae.itens.map((item) => (
                                <tr key={item.id} className={item.pedido && item.pedido > 0 ? styles.warningRow : ''}>
                                    <td className="text-center">
                                        <input
                                            type="checkbox"
                                            checked={item.id ? itensSelecionados.has(item.id) : false}
                                            onChange={() => toggleItemSelecionado(item.id)}
                                        />
                                    </td>
                                    {editandoId === item.id && itemEditando ? (
                                        <>
                                            <td>
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    value={itemEditando.nome}
                                                    onChange={(e) => setItemEditando({ ...itemEditando, nome: e.target.value })}
                                                />
                                            </td>
                                            <td>
                                                <select
                                                    className="form-select form-select-sm"
                                                    value={itemEditando.unidade}
                                                    onChange={(e) => setItemEditando({ ...itemEditando, unidade: e.target.value as 'Kg' | 'Litro' | 'Unidade' })}
                                                >
                                                    <option value="Kg">Kg</option>
                                                    <option value="Litro">Litro</option>
                                                    <option value="Unidade">Unidade</option>
                                                </select>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="form-control form-control-sm"
                                                    value={itemEditando.quantidade_atual}
                                                    onChange={(e) => setItemEditando({ ...itemEditando, quantidade_atual: parseFloat(e.target.value) || 0 })}
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    className="form-control form-control-sm"
                                                    value={itemEditando.quantidade_minima}
                                                    onChange={(e) => setItemEditando({ ...itemEditando, quantidade_minima: parseFloat(e.target.value) || 0 })}
                                                />
                                            </td>
                                            <td className="text-center">
                                                <Badge bg="info">
                                                    {calcularPedido(itemEditando.quantidade_minima, itemEditando.quantidade_atual)}
                                                </Badge>
                                            </td>
                                            <td className="text-center">
                                                <Button
                                                    variant="success"
                                                    size="sm"
                                                    onClick={() => handleEditarItem(itemEditando)}
                                                    className="me-2"
                                                    title="Salvar"
                                                >
                                                    ✓
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => {
                                                        setEditandoId(null);
                                                        setItemEditando(null);
                                                    }}
                                                    title="Cancelar"
                                                >
                                                    ✕
                                                </Button>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td>{item.nome}</td>
                                            <td className="text-center">
                                                <Badge bg="light" text="dark">{item.unidade}</Badge>
                                            </td>
                                            <td className="text-center">{item.quantidade_atual.toFixed(2)}</td>
                                            <td className="text-center">
                                                <Badge bg="secondary">{item.quantidade_minima.toFixed(2)}</Badge>
                                            </td>
                                            <td className="text-center">
                                                {item.pedido && item.pedido > 0 ? (
                                                    <Badge bg="danger">{item.pedido.toFixed(2)}</Badge>
                                                ) : (
                                                    <Badge bg="success">0</Badge>
                                                )}
                                            </td>
                                            <td className="text-center">
                                                <Button
                                                    variant="outline-primary"
                                                    size="sm"
                                                    onClick={() => {
                                                        setEditandoId(item.id || null);
                                                        setItemEditando({ ...item });
                                                    }}
                                                    className="me-2"
                                                    title="Editar"
                                                >
                                                    <FontAwesomeIcon icon={faEdit} />
                                                </Button>
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    onClick={() => item.id && handleDeletarItem(item.id)}
                                                    title="Deletar"
                                                >
                                                    <FontAwesomeIcon icon={faTrash} />
                                                </Button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} className="text-center text-muted py-5">
                                    Nenhum item adicionado ainda
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </div>

            {/* Ações finais */}
            <div className={styles.actions}>
                <Button variant="outline-secondary" onClick={() => navigate('/admin/listas-compras')}>
                    <FontAwesomeIcon icon={faArrowLeft} /> Voltar para Listas
                </Button>
            </div>

            {/* Modal de Seleção de Fornecedor */}
            <Modal show={mostrarModalFornecedor} onHide={() => setMostrarModalFornecedor(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FontAwesomeIcon icon={faTruck} /> Atribuir Fornecedor
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label><strong>Fornecedor</strong></Form.Label>
                            <Form.Select
                                value={fornecedorSelecionado || ''}
                                onChange={(e) => setFornecedorSelecionado(e.target.value ? parseInt(e.target.value) : null)}
                            >
                                <option value="">-- Selecione um fornecedor --</option>
                                {fornecedores.map(f => (
                                    <option key={f.id} value={f.id}>
                                        {f.nome}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label><strong>Itens a Pedir ({itensSelecionados.size})</strong></Form.Label>
                            <div className="bg-light p-3 rounded" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                {listaMae?.itens
                                    .filter(item => item.id && itensSelecionados.has(item.id))
                                    .map(item => (
                                        <div key={item.id} className="mb-2 pb-2 border-bottom">
                                            <div>
                                                <strong>{item.nome}</strong> - {item.unidade}
                                            </div>
                                            <small className="text-muted">
                                                Pedido: {Math.max(0, item.quantidade_minima - item.quantidade_atual).toFixed(2)} {item.unidade}
                                            </small>
                                        </div>
                                    ))}
                            </div>
                        </Form.Group>

                        {fornecedorNome && (
                            <Alert variant="info">
                                <strong>Confirmar:</strong> Criar pedido(s) para <strong>{fornecedorNome}</strong>?
                            </Alert>
                        )}
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setMostrarModalFornecedor(false)}>
                        Cancelar
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleAtribuirFornecedor}
                        disabled={!fornecedorSelecionado || carregandoPedidos}
                    >
                        {carregandoPedidos ? (
                            <>
                                <Spinner as="span" animation="border" size="sm" className="me-2" />
                                Criando Pedidos...
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faCheck} /> Confirmar
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default ListaMaeConsolidada;
