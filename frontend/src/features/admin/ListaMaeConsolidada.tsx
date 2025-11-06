/**
 * Lista Mãe Consolidada - Visão do Administrador (Simplificada)
 *
 * Tabela simples para gerenciar itens de uma lista:
 * - Nome, Unidade, Qtd Atual, Qtd Mínima
 * - Pedido é calculado automaticamente (qtd_min - qtd_atual)
 * - Admin pode adicionar, editar e deletar itens
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Button, Table, Alert, Row, Col, Badge, Spinner, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft,
    faExclamationTriangle,
    faClipboardList,
    faPlus,
    faEdit,
    faTrash
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
    itens: ListaMaeItem[];
    total_itens: number;
}

const ListaMaeConsolidada: React.FC = () => {
    const { listaId } = useParams<{ listaId: string }>();
    const navigate = useNavigate();

    const [listaMae, setListaMae] = useState<ListaMae | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    useEffect(() => {
        if (listaId) {
            fetchListaMae();
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

    const handleAdicionarItem = async () => {
        if (!novoItem.nome || !novoItem.unidade) {
            setError('Preencha nome e unidade do item');
            return;
        }

        try {
            console.log('[LISTA MAE] Adicionando item:', novoItem);
            const response = await api.post(`/admin/listas/${listaId}/mae-itens`, novoItem);
            console.log('[LISTA MAE] Item adicionado com sucesso:', response.data);

            // Adiciona o item retornado pela API à lista local
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
        } catch (err: any) {
            console.error('[LISTA MAE] Erro completo:', err);
            console.error('[LISTA MAE] Response data:', err.response?.data);
            console.error('[LISTA MAE] Response status:', err.response?.status);
            setError(err.response?.data?.error || err.message || 'Erro ao adicionar item');
        }
    };

    const handleEditarItem = async (item: ListaMaeItem) => {
        if (!item.id) return;

        try {
            // Envia apenas os campos editáveis, sem enviar 'pedido' (calculado no servidor)
            const dataToSend = {
                nome: item.nome,
                unidade: item.unidade,
                quantidade_atual: item.quantidade_atual,
                quantidade_minima: item.quantidade_minima
            };

            const response = await api.put(`/admin/listas/${listaId}/mae-itens/${item.id}`, dataToSend);
            const updatedItem = response.data;

            // Atualiza o item na lista local COM os dados retornados pelo servidor (inclui pedido recalculado)
            if (listaMae) {
                setListaMae({
                    ...listaMae,
                    itens: listaMae.itens.map(i => i.id === item.id ? updatedItem : i)
                });
            }

            setEditandoId(null);
            setItemEditando(null);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao editar item');
        }
    };

    const handleDeletarItem = async (itemId: number) => {
        if (!window.confirm('Tem certeza que deseja remover este item?')) return;

        try {
            await api.delete(`/admin/listas/${listaId}/mae-itens/${itemId}`);

            // Remove o item da lista local
            if (listaMae) {
                setListaMae({
                    ...listaMae,
                    itens: listaMae.itens.filter(i => i.id !== itemId),
                    total_itens: listaMae.total_itens - 1
                });
            }

            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao remover item');
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
            </div>

            {/* Alertas */}
            {error && (
                <Alert variant="danger" onClose={() => setError(null)} dismissible>
                    <FontAwesomeIcon icon={faExclamationTriangle} /> {error}
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
                            <small className="text-muted">Criada em</small>
                            <p className={styles.statDate}>
                                {new Date(listaMae.data_criacao).toLocaleDateString('pt-BR')}
                            </p>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Tabela */}
            <div className={styles.tableWrapper}>
                <Table striped bordered hover responsive className={styles.table}>
                    <thead>
                        <tr className={styles.tableHeader}>
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
                                <td colSpan={6} className="text-center text-muted py-5">
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
        </Container>
    );
};

export default ListaMaeConsolidada;
