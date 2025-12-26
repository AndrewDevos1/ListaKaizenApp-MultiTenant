/**
 * Lista Mãe Consolidada - Visão do Administrador
 *
 * Tabela para gerenciar itens de uma lista:
 * - Nome, Unidade, Qtd Atual, Qtd Mínima
 * - Pedido é calculado automaticamente (qtd_min - qtd_atual)
 * - Admin pode adicionar, editar e deletar itens
 * - NOVO: Selecionar múltiplos itens e atribuir fornecedor para gerar pedidos
 */

import React, { useState, useEffect, useRef } from 'react';
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
    faTruck,
    faArrowRight
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
    const [editandoCampo, setEditandoCampo] = useState<{ itemId: number; campo: 'nome' | 'quantidade_minima' } | null>(null);
    const [valorEditando, setValorEditando] = useState<string | number>('');
    
    // Estado para modo de edição em lote
    const [modoEdicaoLote, setModoEdicaoLote] = useState(false);
    const [quantidadesLote, setQuantidadesLote] = useState<{ [key: number]: number }>({});
    
    // Refs para campos editáveis
    const campoEditavelRef = useRef<HTMLInputElement | null>(null);
    const quantidadeLoteRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

    // Estado para seleção e atribuição de fornecedor
    const [itensSelecionados, setItensSelecionados] = useState<Set<number>>(new Set());
    const [todosVerificados, setTodosVerificados] = useState(false);
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
    const [fornecedorSelecionado, setFornecedorSelecionado] = useState<number | null>(null);
    const [mostrarModalFornecedor, setMostrarModalFornecedor] = useState(false);
    const [carregandoPedidos, setCarregandoPedidos] = useState(false);

    // Estado para importação em lote
    const [mostrarModalImportacao, setMostrarModalImportacao] = useState(false);
    const [textoImportacao, setTextoImportacao] = useState('');
    const [carregandoImportacao, setCarregandoImportacao] = useState(false);

    // Estados para filtros e busca
    const [buscaNome, setBuscaNome] = useState('');
    const [filtroUnidade, setFiltroUnidade] = useState('');
    const [filtroPedidoMin, setFiltroPedidoMin] = useState('');
    const [filtroPedidoMax, setFiltroPedidoMax] = useState('');

    useEffect(() => {
        if (listaId) {
            fetchListaMae();
            fetchFornecedores();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            const response = await api.get<Fornecedor[]>('/v1/fornecedores');
            setFornecedores(response.data);
        } catch (err: any) {
            console.error('Erro ao carregar fornecedores:', err);
        }
    };

    const handleAdicionarItem = async () => {
        // Validações do nome
        const nomeTrimmed = novoItem.nome.trim();
        
        if (!nomeTrimmed) {
            setError('O nome do item não pode ser vazio');
            return;
        }
        
        if (/^\d/.test(nomeTrimmed)) {
            setError('O nome do item não pode começar com número');
            return;
        }
        
        if (/^\s/.test(novoItem.nome)) {
            setError('O nome do item não pode começar com espaço');
            return;
        }
        
        if (!novoItem.unidade) {
            setError('Selecione a unidade do item');
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

    // Iniciar edição com duplo clique
    const iniciarEdicao = (itemId: number, campo: 'nome' | 'quantidade_minima', valorAtual: string | number) => {
        setEditandoCampo({ itemId, campo });
        setValorEditando(valorAtual);
        setTimeout(() => {
            campoEditavelRef.current?.focus();
            campoEditavelRef.current?.select();
        }, 10);
    };

    // Salvar edição
    const salvarEdicao = async () => {
        if (!editandoCampo) return;

        const item = listaMae?.itens.find(i => i.id === editandoCampo.itemId);
        if (!item) return;

        // Verifica se houve mudança
        const valorAtual = editandoCampo.campo === 'nome' ? item.nome : item.quantidade_minima;
        const valorNovo = editandoCampo.campo === 'nome' ? String(valorEditando).trim() : parseFloat(String(valorEditando)) || 0;
        
        if (valorAtual === valorNovo) {
            // Sem mudanças, apenas fecha a edição
            cancelarEdicao();
            return;
        }

        // Validações
        if (editandoCampo.campo === 'nome') {
            const nomeStr = String(valorEditando).trim();
            
            if (!nomeStr) {
                setError('O nome do item não pode ser vazio');
                cancelarEdicao();
                return;
            }
            
            if (/^\d/.test(nomeStr)) {
                setError('O nome do item não pode começar com número');
                cancelarEdicao();
                return;
            }
            
            if (/^\s/.test(String(valorEditando))) {
                setError('O nome do item não pode começar com espaço');
                cancelarEdicao();
                return;
            }
        }

        try {
            const dataToSend = {
                nome: editandoCampo.campo === 'nome' ? String(valorEditando).trim() : item.nome,
                unidade: item.unidade,
                quantidade_atual: item.quantidade_atual,
                quantidade_minima: editandoCampo.campo === 'quantidade_minima' ? parseFloat(String(valorEditando)) || 0 : item.quantidade_minima
            };

            const response = await api.put(`/admin/listas/${listaId}/mae-itens/${editandoCampo.itemId}`, dataToSend);

            if (listaMae) {
                setListaMae({
                    ...listaMae,
                    itens: listaMae.itens.map(i => i.id === editandoCampo.itemId ? response.data : i)
                });
            }

            setEditandoCampo(null);
            setValorEditando('');
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao salvar alteração');
            cancelarEdicao();
        }
    };

    // Cancelar edição
    const cancelarEdicao = () => {
        setEditandoCampo(null);
        setValorEditando('');
    };

    // Handle Enter e Escape
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            salvarEdicao();
        } else if (e.key === 'Escape') {
            cancelarEdicao();
        }
    };

    // Ativar modo de edição em lote
    const ativarModoLote = () => {
        const qtds: { [key: number]: number } = {};
        listaMae?.itens.forEach(item => {
            if (item.id) {
                qtds[item.id] = item.quantidade_minima;
            }
        });
        setQuantidadesLote(qtds);
        setModoEdicaoLote(true);
    };

    // Cancelar modo de edição em lote
    const cancelarModoLote = () => {
        setModoEdicaoLote(false);
        setQuantidadesLote({});
    };

    // Salvar todas as quantidades em lote
    const salvarQuantidadesLote = async () => {
        try {
            setError(null);
            
            const promises = Object.entries(quantidadesLote).map(async ([itemIdStr, qtdMinima]) => {
                const itemId = parseInt(itemIdStr);
                const item = listaMae?.itens.find(i => i.id === itemId);
                
                if (item && item.quantidade_minima !== qtdMinima) {
                    const dataToSend = {
                        nome: item.nome,
                        unidade: item.unidade,
                        quantidade_atual: item.quantidade_atual,
                        quantidade_minima: qtdMinima
                    };
                    
                    return api.put(`/admin/listas/${listaId}/mae-itens/${itemId}`, dataToSend);
                }
            });
            
            await Promise.all(promises.filter(p => p !== undefined));
            
            await fetchListaMae();
            
            setModoEdicaoLote(false);
            setQuantidadesLote({});
            setSuccess('Quantidades mínimas atualizadas com sucesso!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao salvar quantidades em lote');
        }
    };

    // Navegação com Enter entre campos em modo lote
    const handleKeyDownLote = (e: React.KeyboardEvent<HTMLInputElement>, itemId: number) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            
            const itensFiltrados = getItensFiltrados();
            const indexAtual = itensFiltrados.findIndex(item => item.id === itemId);
            
            if (indexAtual !== -1) {
                const proximoIndex = indexAtual + 1;
                if (proximoIndex < itensFiltrados.length) {
                    const proximoItem = itensFiltrados[proximoIndex];
                    if (proximoItem.id) {
                        setTimeout(() => {
                            quantidadeLoteRefs.current[proximoItem.id!]?.focus();
                            quantidadeLoteRefs.current[proximoItem.id!]?.select();
                        }, 10);
                    }
                }
            }
        }
    };

    // Função para filtrar itens
    const getItensFiltrados = () => {
        if (!listaMae?.itens) return [];

        return listaMae.itens.filter(item => {
            // Filtro por nome (busca)
            if (buscaNome && !item.nome.toLowerCase().includes(buscaNome.toLowerCase())) {
                return false;
            }

            // Filtro por unidade
            if (filtroUnidade && item.unidade !== filtroUnidade) {
                return false;
            }

            // Filtro por intervalo de pedido
            const pedido = calcularPedido(item.quantidade_minima, item.quantidade_atual);
            if (filtroPedidoMin && pedido < parseFloat(filtroPedidoMin)) {
                return false;
            }
            if (filtroPedidoMax && pedido > parseFloat(filtroPedidoMax)) {
                return false;
            }

            return true;
        });
    };

    // Obter lista de unidades únicas
    const getUnidadesUnicas = () => {
        if (!listaMae?.itens) return [];
        const unidades = new Set(listaMae.itens.map(item => item.unidade));
        return Array.from(unidades).sort();
    };

    const handleImportarItemsEmLote = async () => {
        if (!textoImportacao.trim()) {
            setError('Cole a lista de itens');
            return;
        }

        try {
            setCarregandoImportacao(true);
            setError(null);

            // Parse das linhas - extrai apenas o nome do item
            const linhas = textoImportacao
                .split('\n')
                .map(linha => linha.trim())
                .filter(linha => linha.length > 0);

            // Para cada linha, extrai o nome do item removendo números, parênteses, emojis
            const nomesItems = linhas
                .map(linha => {
                    let nomeItem = linha
                        .replace(/\d+\s*x\s*\d+\s*kg/gi, '') // Remove "6x5kg"
                        .replace(/\(\s*.*?\s*\)/g, '') // Remove conteúdo entre parênteses
                        .replace(/🍄|🥢|🍱|🍜|🍚|🥡/g, '') // Remove emojis comuns
                        .replace(/\\/g, '') // Remove barras invertidas
                        .trim();

                    // Se ficou muito curto, ignora
                    return nomeItem.length >= 2 ? nomeItem : null;
                })
                .filter((nome): nome is string => nome !== null);

            if (nomesItems.length === 0) {
                setError('Nenhum item válido encontrado na lista');
                setCarregandoImportacao(false);
                return;
            }

            // Envia todos os itens de uma vez
            const response = await api.post(`/v1/listas/${listaId}/items-import`, {
                nomes: nomesItems
            });

            // Recarrega a lista
            await fetchListaMae();

            const { items_criados, items_duplicados } = response.data;
            let mensagem = `${items_criados} item(ns) importado(s) com sucesso!`;
            if (items_duplicados > 0) {
                mensagem += ` (${items_duplicados} duplicado(s) ignorado(s))`;
            }

            setSuccess(mensagem);
            setTextoImportacao('');
            setMostrarModalImportacao(false);

            setTimeout(() => setSuccess(null), 5000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao importar itens em lote');
            console.error('Erro:', err);
        } finally {
            setCarregandoImportacao(false);
        }
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
                    <FontAwesomeIcon icon={faClipboardList} /> {listaMae.lista_nome}
                </h1>
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
                                    <Card style={{ height: '100%', backgroundColor: '#f9f9f9', position: 'relative' }}>
                                        <Button
                                            variant="link"
                                            style={{
                                                position: 'absolute',
                                                top: '10px',
                                                right: '10px',
                                                padding: '5px 10px',
                                                color: '#495057',
                                                textDecoration: 'none',
                                                cursor: 'pointer',
                                                fontSize: '1.2rem'
                                            }}
                                            onClick={() => navigate('/admin/fornecedores')}
                                            title="Ir para Fornecedores"
                                        >
                                            <FontAwesomeIcon icon={faArrowRight} />
                                        </Button>
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

            {/* Botão de Importação em Lote */}
            <Row className="mb-3">
                <Col>
                    <Button
                        variant="info"
                        size="sm"
                        onClick={() => setMostrarModalImportacao(true)}
                    >
                        <FontAwesomeIcon icon={faPlus} /> Importar Itens em Lote
                    </Button>
                </Col>
            </Row>

            {/* Seção de Filtros */}
            <Card className="mb-3">
                <Card.Body>
                    <Row>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="mb-2"><strong>🔍 Buscar por Nome</strong></Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Digite o nome do item..."
                                    value={buscaNome}
                                    onChange={(e) => setBuscaNome(e.target.value)}
                                    size="sm"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Form.Group>
                                <Form.Label className="mb-2"><strong>Unidade</strong></Form.Label>
                                <Form.Select
                                    value={filtroUnidade}
                                    onChange={(e) => setFiltroUnidade(e.target.value)}
                                    size="sm"
                                >
                                    <option value="">Todas</option>
                                    {getUnidadesUnicas().map(unidade => (
                                        <option key={unidade} value={unidade}>{unidade}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Form.Group>
                                <Form.Label className="mb-2"><strong>Pedido Mín</strong></Form.Label>
                                <Form.Control
                                    type="number"
                                    placeholder="Mínimo"
                                    value={filtroPedidoMin}
                                    onChange={(e) => setFiltroPedidoMin(e.target.value)}
                                    size="sm"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Form.Group>
                                <Form.Label className="mb-2"><strong>Pedido Máx</strong></Form.Label>
                                <Form.Control
                                    type="number"
                                    placeholder="Máximo"
                                    value={filtroPedidoMax}
                                    onChange={(e) => setFiltroPedidoMax(e.target.value)}
                                    size="sm"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3} className="d-flex align-items-end">
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() => {
                                    setBuscaNome('');
                                    setFiltroUnidade('');
                                    setFiltroPedidoMin('');
                                    setFiltroPedidoMax('');
                                }}
                                className="w-100"
                            >
                                ✕ Limpar Filtros
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

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
                            <th className="text-center" style={{ width: '120px' }}>
                                Qtd Mín
                                {!modoEdicaoLote ? (
                                    <Button
                                        variant="outline-light"
                                        size="sm"
                                        className="ms-2"
                                        onClick={ativarModoLote}
                                        title="Editar todas as quantidades mínimas"
                                    >
                                        <FontAwesomeIcon icon={faEdit} />
                                    </Button>
                                ) : (
                                    <>
                                        <Button
                                            variant="success"
                                            size="sm"
                                            className="ms-1"
                                            onClick={salvarQuantidadesLote}
                                            title="Salvar todas"
                                        >
                                            ✓
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="ms-1"
                                            onClick={cancelarModoLote}
                                            title="Cancelar"
                                        >
                                            ✕
                                        </Button>
                                    </>
                                )}
                            </th>
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
                        {getItensFiltrados().length > 0 ? (
                            getItensFiltrados().map((item) => (
                                <tr key={item.id} className={item.pedido && item.pedido > 0 ? styles.warningRow : ''}>
                                    <td className="text-center">
                                        <input
                                            type="checkbox"
                                            checked={item.id ? itensSelecionados.has(item.id) : false}
                                            onChange={() => toggleItemSelecionado(item.id)}
                                        />
                                    </td>
                                    <td 
                                        onDoubleClick={() => item.id && iniciarEdicao(item.id, 'nome', item.nome)}
                                        style={{ cursor: 'pointer' }}
                                        title="Duplo clique para editar"
                                    >
                                        {(editandoCampo && editandoCampo.itemId === item.id && editandoCampo.campo === 'nome') ? (
                                            <input
                                                ref={campoEditavelRef}
                                                type="text"
                                                className="form-control form-control-sm"
                                                value={valorEditando}
                                                onChange={(e) => setValorEditando(e.target.value)}
                                                onKeyDown={handleKeyDown}
                                                onBlur={salvarEdicao}
                                            />
                                        ) : (
                                            item.nome
                                        )}
                                    </td>
                                    <td className="text-center">
                                        <Badge bg="light" text="dark">{item.unidade}</Badge>
                                    </td>
                                    <td className="text-center">{item.quantidade_atual.toFixed(2)}</td>
                                    <td 
                                        className="text-center"
                                        onDoubleClick={() => !modoEdicaoLote && item.id && iniciarEdicao(item.id, 'quantidade_minima', item.quantidade_minima)}
                                        style={{ cursor: modoEdicaoLote ? 'default' : 'pointer' }}
                                        title={modoEdicaoLote ? '' : 'Duplo clique para editar'}
                                    >
                                        {modoEdicaoLote && item.id ? (
                                            <input
                                                ref={(el) => {
                                                    if (item.id) {
                                                        quantidadeLoteRefs.current[item.id] = el;
                                                    }
                                                }}
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                className="form-control form-control-sm"
                                                value={quantidadesLote[item.id] ?? item.quantidade_minima}
                                                onChange={(e) => {
                                                    if (item.id) {
                                                        setQuantidadesLote({
                                                            ...quantidadesLote,
                                                            [item.id]: parseFloat(e.target.value) || 0
                                                        });
                                                    }
                                                }}
                                                onKeyDown={(e) => item.id && handleKeyDownLote(e, item.id)}
                                            />
                                        ) : (editandoCampo && editandoCampo.itemId === item.id && editandoCampo.campo === 'quantidade_minima') ? (
                                            <input
                                                ref={campoEditavelRef}
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                className="form-control form-control-sm"
                                                value={valorEditando}
                                                onChange={(e) => setValorEditando(e.target.value)}
                                                onKeyDown={handleKeyDown}
                                                onBlur={salvarEdicao}
                                            />
                                        ) : (
                                            <Badge bg="secondary">{item.quantidade_minima.toFixed(2)}</Badge>
                                        )}
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
                                            variant="outline-danger"
                                            size="sm"
                                            onClick={() => item.id && handleDeletarItem(item.id)}
                                            title="Remover item da lista"
                                        >
                                            <FontAwesomeIcon icon={faTrash} />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} className="text-center text-muted py-5">
                                    {listaMae.itens && listaMae.itens.length > 0
                                        ? '❌ Nenhum item corresponde aos filtros aplicados'
                                        : 'Nenhum item adicionado ainda'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </div>

            {/* Resumo de Filtros */}
            {(buscaNome || filtroUnidade || filtroPedidoMin || filtroPedidoMax) && (
                <Alert variant="info" className="mt-3">
                    📊 Mostrando <strong>{getItensFiltrados().length}</strong> de <strong>{listaMae?.itens.length || 0}</strong> itens
                    {buscaNome && ` • Nome: "${buscaNome}"`}
                    {filtroUnidade && ` • Unidade: ${filtroUnidade}`}
                    {(filtroPedidoMin || filtroPedidoMax) && ` • Pedido: ${filtroPedidoMin || '0'} - ${filtroPedidoMax || '∞'}`}
                </Alert>
            )}

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

            {/* Modal de Importação em Lote */}
            <Modal show={mostrarModalImportacao} onHide={() => setMostrarModalImportacao(false)} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FontAwesomeIcon icon={faPlus} /> Importar Itens em Lote
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label><strong>Cole a lista de itens (um por linha)</strong></Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={10}
                                placeholder={`Algá Nori
ARROZ GRAO CURTO HEISEI FARDO (6X5KG)
BAO com vegetais
Cogumelo 🍄 kg
Gergelim branco
...`}
                                value={textoImportacao}
                                onChange={(e) => setTextoImportacao(e.target.value)}
                            />
                            <Form.Text className="d-block mt-2">
                                💡 <strong>Dica:</strong> Cole a lista tal como está. A aplicação vai extrair automaticamente os nomes dos itens,
                                ignorando quantidades, unidades, observações e emojis. Depois você pode editar cada item.
                            </Form.Text>
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => {
                        setMostrarModalImportacao(false);
                        setTextoImportacao('');
                    }}>
                        Cancelar
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleImportarItemsEmLote}
                        disabled={!textoImportacao.trim() || carregandoImportacao}
                    >
                        {carregandoImportacao ? (
                            <>
                                <Spinner as="span" animation="border" size="sm" className="me-2" />
                                Importando...
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faPlus} /> Importar
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default ListaMaeConsolidada;
