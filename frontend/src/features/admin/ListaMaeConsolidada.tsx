/**
 * Lista Mãe Consolidada - Visão do Administrador
 *
 * Exibe todos os itens de uma lista com:
 * - Última quantidade reportada
 * - Estoque mínimo
 * - Pedido calculado automaticamente
 * - Informações de quem submeteu e quando
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Button, Table, Alert, Row, Col, Badge, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft,
    faDownload,
    faFileExport,
    faExclamationTriangle,
    faCheckCircle,
    faClipboardList,
    faChevronRight
} from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import styles from './ListaMaeConsolidada.module.css';

// Interfaces
interface ItemConsolidado {
    estoque_id: number;
    item_id: number;
    item_nome: string;
    item_unidade: string;
    fornecedor_id: number;
    fornecedor_nome: string;
    quantidade_minima: number;
    quantidade_atual: number;
    pedido: number;
    data_ultima_submissao: string | null;
    usuario_ultima_submissao: {
        id: number;
        nome: string;
    } | null;
}

interface ListaMae {
    lista_id: number;
    lista_nome: string;
    lista_descricao: string;
    data_criacao: string;
    itens: ItemConsolidado[];
    total_itens: number;
    total_em_falta: number;
    total_pedido: number;
}

const ListaMaeConsolidada: React.FC = () => {
    const { listaId } = useParams<{ listaId: string }>();
    const navigate = useNavigate();

    const [listaMae, setListaMae] = useState<ListaMae | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterByPedido, setFilterByPedido] = useState(false);

    // Carregar lista consolidada
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
            setError(err.response?.data?.error || 'Erro ao carregar lista mãe consolidada');
            console.error('Erro:', err);
        } finally {
            setLoading(false);
        }
    };

    // Filtrar itens
    const filteredItems = useMemo(() => {
        if (!listaMae) return [];

        let filtered = listaMae.itens.filter(item =>
            item.item_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.fornecedor_nome.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (filterByPedido) {
            filtered = filtered.filter(item => item.pedido > 0);
        }

        return filtered;
    }, [listaMae, searchTerm, filterByPedido]);

    // Formatar data
    const formatarData = (data: string | null): string => {
        if (!data) return '-';
        try {
            return new Date(data).toLocaleString('pt-BR');
        } catch {
            return '-';
        }
    };

    // Exportar para texto (para copiar ao WhatsApp, etc)
    const handleExport = () => {
        if (!listaMae) return;

        const itemsParaExportar = filterByPedido
            ? filteredItems.filter(item => item.pedido > 0)
            : filteredItems;

        let texto = `LISTA: ${listaMae.lista_nome}\n`;
        texto += `Data: ${new Date().toLocaleString('pt-BR')}\n`;
        texto += `\nITENS PARA PEDIR:\n`;
        texto += `${'='.repeat(50)}\n\n`;

        // Agrupar por fornecedor
        const porFornecedor = itemsParaExportar.reduce((acc, item) => {
            const fornecedor = item.fornecedor_nome || 'Sem fornecedor';
            if (!acc[fornecedor]) {
                acc[fornecedor] = [];
            }
            acc[fornecedor].push(item);
            return acc;
        }, {} as Record<string, ItemConsolidado[]>);

        Object.entries(porFornecedor).forEach(([fornecedor, itens]) => {
            texto += `📦 ${fornecedor}:\n`;
            itens.forEach(item => {
                texto += `  • ${item.item_nome} - ${item.pedido.toFixed(2)} ${item.item_unidade}\n`;
            });
            texto += `\n`;
        });

        // Copiar para clipboard
        navigator.clipboard.writeText(texto).then(() => {
            alert('✅ Conteúdo copiado para a área de transferência!');
        });
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
                <Col md={3}>
                    <Card className={styles.statsCard}>
                        <Card.Body className="text-center">
                            <h3 className={styles.statValue}>{listaMae.total_itens}</h3>
                            <p className={styles.statLabel}>Total de Itens</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className={`${styles.statsCard} ${styles.alertCard}`}>
                        <Card.Body className="text-center">
                            <h3 className={styles.statValue}>{listaMae.total_em_falta}</h3>
                            <p className={styles.statLabel}>Itens em Falta</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className={`${styles.statsCard} ${styles.dangerCard}`}>
                        <Card.Body className="text-center">
                            <h3 className={styles.statValue}>{listaMae.total_pedido.toFixed(0)}</h3>
                            <p className={styles.statLabel}>Total de Pedido</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
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

            {/* Controles */}
            <Row className="mb-4 g-2">
                <Col md={8}>
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="🔍 Buscar por item ou fornecedor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </Col>
                <Col md={4} className={styles.buttonGroup}>
                    <Button
                        variant={filterByPedido ? 'danger' : 'outline-danger'}
                        size="sm"
                        onClick={() => setFilterByPedido(!filterByPedido)}
                    >
                        {filterByPedido ? '✓ Apenas Pedidos' : 'Ver Tudo'}
                    </Button>
                    <Button
                        variant="success"
                        size="sm"
                        onClick={handleExport}
                        disabled={filteredItems.filter(i => i.pedido > 0).length === 0}
                    >
                        <FontAwesomeIcon icon={faDownload} /> Exportar
                    </Button>
                </Col>
            </Row>

            {/* Tabela */}
            <div className={styles.tableWrapper}>
                <Table striped bordered hover responsive className={styles.table}>
                    <thead>
                        <tr className={styles.tableHeader}>
                            <th>Item</th>
                            <th className="text-center">Unidade</th>
                            <th className="text-center">Qtd. Mín.</th>
                            <th className="text-center">Qtd. Atual</th>
                            <th className="text-center">Pedido</th>
                            <th>Fornecedor</th>
                            <th>Última Submissão</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredItems.length > 0 ? filteredItems.map(item => (
                            <tr key={item.estoque_id} className={item.pedido > 0 ? styles.warningRow : ''}>
                                <td className={styles.itemCell}>
                                    <strong>{item.item_nome}</strong>
                                </td>
                                <td className="text-center">
                                    <Badge bg="light" text="dark">{item.item_unidade}</Badge>
                                </td>
                                <td className="text-center">
                                    <Badge bg="secondary">{item.quantidade_minima.toFixed(2)}</Badge>
                                </td>
                                <td className="text-center">
                                    {item.quantidade_atual.toFixed(2)}
                                </td>
                                <td className="text-center">
                                    {item.pedido > 0 ? (
                                        <Badge bg="danger" className={styles.pedidoBadge}>
                                            {item.pedido.toFixed(2)}
                                        </Badge>
                                    ) : (
                                        <Badge bg="success">0</Badge>
                                    )}
                                </td>
                                <td>
                                    <small>{item.fornecedor_nome || '-'}</small>
                                </td>
                                <td className={styles.submissaoCell}>
                                    {item.usuario_ultima_submissao ? (
                                        <small>
                                            <strong>{item.usuario_ultima_submissao.nome}</strong>
                                            <br />
                                            <span className="text-muted">
                                                {formatarData(item.data_ultima_submissao)}
                                            </span>
                                        </small>
                                    ) : (
                                        <small className="text-muted">-</small>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={7} className="text-center text-muted py-5">
                                    Nenhum item encontrado
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
