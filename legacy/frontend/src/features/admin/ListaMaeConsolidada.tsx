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
    faSearch,
    faEdit,
    faTrash,
    faCheck,
    faTruck,
    faArrowRight,
    faCopy,
    faExchangeAlt as faExchange,
    faCog
} from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import { formatarDataBrasiliaSemHora } from '../../utils/dateFormatter';
import styles from './ListaMaeConsolidada.module.css';

// Interface do Item
interface ListaMaeItem {
    id?: number;
    nome: string;
    unidade: 'Kg' | 'Litro' | 'Unidade';
    quantidade_atual: number;
    quantidade_minima: number;
    pedido?: number;
    usa_threshold?: boolean;
    quantidade_por_fardo?: number;
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

interface ItemBuscaUnificada {
    id: string;
    nome: string;
    unidade: string;
    origem: 'lista_global' | 'regional';
    origem_display: string;
    fornecedor_id: number | null;
    fornecedor_nome: string | null;
    ja_na_lista_global: boolean;
    item_fornecedor_id: number | null;
}

interface NovoItemForm {
    nome: string;
    unidade: 'Kg' | 'Litro' | 'Unidade';
    quantidade_atual: string;
    quantidade_minima: string;
}

const ListaMaeConsolidada: React.FC = () => {
    const { listaId } = useParams<{ listaId: string }>();
    const navigate = useNavigate();

    const [listaMae, setListaMae] = useState<ListaMae | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Estado para adicionar novo item
    const [novoItem, setNovoItem] = useState<NovoItemForm>({
        nome: '',
        unidade: 'Kg',
        quantidade_atual: '',
        quantidade_minima: ''
    });

    // Estado para edição inline
    const [editandoCampo, setEditandoCampo] = useState<{ itemId: number; campo: 'nome' | 'quantidade_minima' } | null>(null);
    const [valorEditando, setValorEditando] = useState<string | number>('');
    
    // Estado para modo de edição em lote
    const [modoEdicaoLote, setModoEdicaoLote] = useState(false);
    const [quantidadesLote, setQuantidadesLote] = useState<{ [key: number]: string }>({});
    
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

    // Estados para configuração de threshold/fardo
    const [mostrarModalConfig, setMostrarModalConfig] = useState(false);
    const [itemConfigurando, setItemConfigurando] = useState<ListaMaeItem | null>(null);
    const [configForm, setConfigForm] = useState({
        quantidade_minima: '',
        quantidade_por_fardo: ''
    });
    const [salvandoConfig, setSalvandoConfig] = useState(false);

    // Estados para Copiar/Mover itens
    const [mostrarModalCopiar, setMostrarModalCopiar] = useState(false);
    const [mostrarModalMover, setMostrarModalMover] = useState(false);
    const [mostrarModalResultado, setMostrarModalResultado] = useState(false);
    const [tipoOperacao, setTipoOperacao] = useState<'existente' | 'nova'>('existente');
    const [listaDestinoId, setListaDestinoId] = useState<number | null>(null);
    const [nomeNovaLista, setNomeNovaLista] = useState('');
    const [areaIdNova, setAreaIdNova] = useState<number | null>(null);
    const [listas, setListas] = useState<any[]>([]);
    const [areas, setAreas] = useState<any[]>([]);
    const [resultado, setResultado] = useState<any>(null);
    const [carregandoOperacao, setCarregandoOperacao] = useState(false);

    // Estados para filtros e busca
    const [buscaNome, setBuscaNome] = useState('');
    const [filtroUnidade, setFiltroUnidade] = useState('');
    const [filtroPedidoMin, setFiltroPedidoMin] = useState('');
    const [filtroPedidoMax, setFiltroPedidoMax] = useState('');

    // Estado para ordenação de colunas
    const [ordenacao, setOrdenacao] = useState<{ campo: string; direcao: 'asc' | 'desc' }>({
        campo: 'nome',
        direcao: 'asc'
    });

    // Estado para seção de itens inativos
    const [mostrarItensInativos, setMostrarItensInativos] = useState(false);

    // Estados para busca de itens da lista global e fornecedores regionais
    const [mostrarModalBuscaItens, setMostrarModalBuscaItens] = useState(false);
    const [itensBusca, setItensBusca] = useState<ItemBuscaUnificada[]>([]);
    const [itensBuscaFiltrados, setItensBuscaFiltrados] = useState<ItemBuscaUnificada[]>([]);
    const [buscaItensTermo, setBuscaItensTermo] = useState('');
    const [filtroOrigemBusca, setFiltroOrigemBusca] = useState<'todas' | 'lista_global' | 'regional'>('todas');
    const [erroBuscaItens, setErroBuscaItens] = useState<string | null>(null);
    const [carregandoBuscaItens, setCarregandoBuscaItens] = useState(false);
    const [carregandoAdicionarBusca, setCarregandoAdicionarBusca] = useState(false);
    const [itensSelecionadosBusca, setItensSelecionadosBusca] = useState<Map<string, string>>(new Map());

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

    const normalizeTexto = (valor: string) =>
        valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    const fetchItensBusca = async () => {
        if (!listaId) return;
        try {
            setCarregandoBuscaItens(true);
            setErroBuscaItens(null);

            const [catalogoResponse, regionaisResponse] = await Promise.all([
                api.get('/admin/catalogo-global'),
                api.get('/admin/itens-regionais')
            ]);

            const itensCatalogo = catalogoResponse.data?.itens || [];
            const itensRegionais = regionaisResponse.data?.itens || [];

            const nomesGlobais = new Set(
                itensCatalogo.map((item: any) => normalizeTexto(item.nome))
            );

            const itensUnificados: ItemBuscaUnificada[] = [
                ...itensCatalogo.map((item: any) => ({
                    id: `global_${item.id}`,
                    nome: item.nome,
                    unidade: item.unidade,
                    origem: 'lista_global',
                    origem_display: 'Lista Global',
                    fornecedor_id: null,
                    fornecedor_nome: null,
                    ja_na_lista_global: true,
                    item_fornecedor_id: null
                })),
                ...itensRegionais.map((item: any) => ({
                    id: `fornecedor_${item.id}`,
                    nome: item.nome,
                    unidade: item.unidade_medida,
                    origem: 'regional',
                    origem_display: item.fornecedor_nome || 'Fornecedor Regional',
                    fornecedor_id: item.fornecedor_id,
                    fornecedor_nome: item.fornecedor_nome,
                    ja_na_lista_global: nomesGlobais.has(normalizeTexto(item.nome)),
                    item_fornecedor_id: item.id
                }))
            ].sort((a, b) => a.nome.localeCompare(b.nome));

            setItensBusca(itensUnificados);
        } catch (err: any) {
            setErroBuscaItens(err.response?.data?.error || 'Erro ao buscar itens.');
        } finally {
            setCarregandoBuscaItens(false);
        }
    };

    const aplicarFiltrosBuscaItens = () => {
        let resultado = [...itensBusca];

        if (buscaItensTermo.trim()) {
            const termo = normalizeTexto(buscaItensTermo);
            resultado = resultado.filter((item) =>
                normalizeTexto(item.nome).includes(termo) ||
                normalizeTexto(item.fornecedor_nome || '').includes(termo)
            );
        }

        if (filtroOrigemBusca !== 'todas') {
            resultado = resultado.filter((item) => item.origem === filtroOrigemBusca);
        }

        setItensBuscaFiltrados(resultado);
    };

    useEffect(() => {
        aplicarFiltrosBuscaItens();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [buscaItensTermo, filtroOrigemBusca, itensBusca]);

    const handleAbrirModalBuscaItens = () => {
        setMostrarModalBuscaItens(true);
        setBuscaItensTermo('');
        setFiltroOrigemBusca('todas');
        setItensSelecionadosBusca(new Map());
        fetchItensBusca();
    };

    const handleFecharModalBuscaItens = () => {
        setMostrarModalBuscaItens(false);
        setBuscaItensTermo('');
        setFiltroOrigemBusca('todas');
        setItensSelecionadosBusca(new Map());
        setErroBuscaItens(null);
    };

    const handleToggleItemBusca = (item: ItemBuscaUnificada, quantidadeMinima: string | null) => {
        const novosSelecionados = new Map(itensSelecionadosBusca);
        if (quantidadeMinima === null) {
            novosSelecionados.delete(item.id);
        } else {
            novosSelecionados.set(item.id, quantidadeMinima);
        }
        setItensSelecionadosBusca(novosSelecionados);
    };

    const handleAdicionarItensBusca = async () => {
        if (!listaId) return;
        if (itensSelecionadosBusca.size === 0) {
            setErroBuscaItens('Selecione ao menos um item para adicionar.');
            return;
        }

        try {
            setCarregandoAdicionarBusca(true);
            setErroBuscaItens(null);

            const itens = Array.from(itensSelecionadosBusca.entries()).map(([id, quantidadeMinimaStr]) => {
                const quantidadeMinimaParsed = quantidadeMinimaStr === '' ? 0 : parseFloat(quantidadeMinimaStr);
                const quantidade_minima = Number.isNaN(quantidadeMinimaParsed) ? 0 : quantidadeMinimaParsed;
                return {
                    id,
                    quantidade_minima
                };
            });

            const response = await api.post(`/admin/listas/${listaId}/itens?skip_if_exists=1`, { itens });
            const erros = response.data?.errors || [];

            if (erros.length > 0) {
                setErroBuscaItens(erros[0].error || 'Erro ao adicionar itens.');
                return;
            }

            handleFecharModalBuscaItens();
            await fetchListaMae();
            setSuccess('Itens adicionados à lista.');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setErroBuscaItens(err.response?.data?.error || 'Erro ao adicionar itens.');
        } finally {
            setCarregandoAdicionarBusca(false);
        }
    };

    const getOrigemBadgeBusca = (item: ItemBuscaUnificada) => {
        if (item.origem === 'lista_global') {
            return <Badge bg="success">Lista Global</Badge>;
        }

        return (
            <>
                <Badge bg="primary">{item.origem_display}</Badge>
                {item.ja_na_lista_global && (
                    <Badge bg="success" className="ms-1">
                        Já na lista global
                    </Badge>
                )}
            </>
        );
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
            const quantidadeAtualParsed = novoItem.quantidade_atual === '' ? 0 : parseFloat(novoItem.quantidade_atual);
            const quantidadeMinimaParsed = novoItem.quantidade_minima === '' ? 0 : parseFloat(novoItem.quantidade_minima);
            const payload = {
                nome: nomeTrimmed,
                unidade: novoItem.unidade,
                quantidade_atual: Number.isNaN(quantidadeAtualParsed) ? 0 : quantidadeAtualParsed,
                quantidade_minima: Number.isNaN(quantidadeMinimaParsed) ? 0 : quantidadeMinimaParsed
            };

            console.log('[LISTA MAE] Adicionando item:', payload);
            const response = await api.post(`/admin/listas/${listaId}/mae-itens`, payload);
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
                quantidade_atual: '',
                quantidade_minima: ''
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

    // Handlers para Copiar/Mover
    const handleAbrirCopiar = async () => {
        setMostrarModalCopiar(true);
        await carregarListasEAreas();
    };

    const handleAbrirMover = async () => {
        setMostrarModalMover(true);
        await carregarListasEAreas();
    };

    const carregarListasEAreas = async () => {
        try {
            const [listasRes, areasRes] = await Promise.all([
                api.get('/v1/listas'),
                api.get('/v1/areas')
            ]);
            setListas(listasRes.data);
            setAreas(areasRes.data);
        } catch (err) {
            console.error('Erro ao carregar listas/áreas:', err);
            setError('Erro ao carregar listas e áreas');
        }
    };

    const handleFecharModal = () => {
        setMostrarModalCopiar(false);
        setMostrarModalMover(false);
        setTipoOperacao('existente');
        setListaDestinoId(null);
        setNomeNovaLista('');
        setAreaIdNova(null);
    };

    const handleConfirmarOperacao = async () => {
        try {
            setCarregandoOperacao(true);
            setError(null);

            const payload = {
                item_ids: Array.from(itensSelecionados),
                lista_destino_id: tipoOperacao === 'existente' ? listaDestinoId : null,
                nome_nova_lista: tipoOperacao === 'nova' ? nomeNovaLista : null,
                area_id: tipoOperacao === 'nova' ? areaIdNova : null
            };

            const endpoint = mostrarModalCopiar ? 'copiar' : 'mover';
            const response = await api.post(
                `/admin/listas/${listaId}/itens/${endpoint}`,
                payload
            );

            setResultado(response.data);
            setMostrarModalResultado(true);
            setMostrarModalCopiar(false);
            setMostrarModalMover(false);
            setItensSelecionados(new Set());
            setTodosVerificados(false);

            // Recarregar lista se foi mover
            if (endpoint === 'mover') {
                await fetchListaMae();
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro na operação');
        } finally {
            setCarregandoOperacao(false);
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

    const calcularPedido = (qtdMin: number, qtdAtual: number, qtdPorFardo: number = 1) => {
        // Nova lógica simplificada: se estoque <= mínimo, pede quantidade_por_fardo
        if (qtdAtual <= qtdMin) {
            return qtdPorFardo;
        }
        return 0;
    };

    // Funções para configuração de threshold/fardo
    const abrirModalConfig = (item: ListaMaeItem) => {
        setItemConfigurando(item);
        setConfigForm({
            quantidade_minima: String(item.quantidade_minima ?? 1),
            quantidade_por_fardo: String(item.quantidade_por_fardo ?? 1)
        });
        setMostrarModalConfig(true);
    };

    const salvarConfig = async () => {
        if (!itemConfigurando?.id || !listaId) return;

        // Converter strings para números (com fallback para valores default)
        const qtdMinima = parseFloat(configForm.quantidade_minima) || 1;
        const qtdPorFardo = parseFloat(configForm.quantidade_por_fardo) || 1;

        try {
            setSalvandoConfig(true);
            setError(null);

            await api.put(`/admin/listas/${listaId}/itens/${itemConfigurando.id}/config`, {
                quantidade_minima: qtdMinima,
                quantidade_por_fardo: qtdPorFardo
            });

            // Atualizar o item localmente
            if (listaMae) {
                const itensAtualizados = listaMae.itens.map(item => {
                    if (item.id === itemConfigurando.id) {
                        // Recalcular o pedido com a nova lógica simplificada
                        const pedido = item.quantidade_atual <= qtdMinima
                            ? qtdPorFardo
                            : 0;
                        return {
                            ...item,
                            quantidade_minima: qtdMinima,
                            quantidade_por_fardo: qtdPorFardo,
                            pedido
                        };
                    }
                    return item;
                });
                setListaMae({ ...listaMae, itens: itensAtualizados });
            }

            setMostrarModalConfig(false);
            setItemConfigurando(null);
            setSuccess('Configuração salva com sucesso!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao salvar configuração');
        } finally {
            setSalvandoConfig(false);
        }
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
            const itemAtualizado: ListaMaeItem = response.data?.item
                ? {
                    id: response.data.item.id ?? response.data.item_id ?? item.id,
                    nome: response.data.item.nome ?? item.nome,
                    unidade: response.data.item.unidade ?? item.unidade,
                    quantidade_atual: response.data.quantidade_atual ?? item.quantidade_atual,
                    quantidade_minima: response.data.quantidade_minima ?? item.quantidade_minima,
                    pedido: response.data.pedido ?? calcularPedido(
                        response.data.quantidade_minima ?? item.quantidade_minima,
                        response.data.quantidade_atual ?? item.quantidade_atual,
                        response.data.quantidade_por_fardo ?? item.quantidade_por_fardo ?? 1
                    )
                }
                : response.data;

            if (listaMae) {
                setListaMae({
                    ...listaMae,
                    itens: listaMae.itens.map(i => i.id === editandoCampo.itemId ? itemAtualizado : i)
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
        const qtds: { [key: number]: string } = {};
        listaMae?.itens.forEach(item => {
            if (item.id) {
                qtds[item.id] = String(item.quantidade_minima);
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
            
            const promises = Object.entries(quantidadesLote).map(async ([itemIdStr, qtdMinimaStr]) => {
                const itemId = parseInt(itemIdStr);
                const item = listaMae?.itens.find(i => i.id === itemId);
                const qtdMinimaParsed = qtdMinimaStr === '' ? 0 : parseFloat(qtdMinimaStr);
                const qtdMinima = Number.isNaN(qtdMinimaParsed) ? 0 : qtdMinimaParsed;
                
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

        const resultado = listaMae.itens.filter(item => {
            // NOVO: Excluir itens inativos (quantidade_minima <= 0)
            if (item.quantidade_minima <= 0) {
                return false;
            }

            // Filtro por nome (busca)
            if (buscaNome && !item.nome.toLowerCase().includes(buscaNome.toLowerCase())) {
                return false;
            }

            // Filtro por unidade
            if (filtroUnidade && item.unidade !== filtroUnidade) {
                return false;
            }

            // Filtro por intervalo de pedido
            const pedido = item.pedido ?? calcularPedido(item.quantidade_minima, item.quantidade_atual, item.quantidade_por_fardo ?? 1);
            if (filtroPedidoMin && pedido < parseFloat(filtroPedidoMin)) {
                return false;
            }
            if (filtroPedidoMax && pedido > parseFloat(filtroPedidoMax)) {
                return false;
            }

            return true;
        });

        // Aplicar ordenação
        return ordenarItens(resultado);
    };

    // NOVO: Função para obter itens inativos (quantidade_minima = 0)
    const getItensInativos = () => {
        if (!listaMae?.itens) return [];
        return listaMae.itens.filter(item => item.quantidade_minima <= 0);
    };

    // Obter lista de unidades únicas
    const getUnidadesUnicas = () => {
        if (!listaMae?.itens) return [];
        const unidades = new Set(listaMae.itens.map(item => item.unidade));
        return Array.from(unidades).sort();
    };

    // Função de ordenação de colunas
    const handleOrdenar = (campo: string) => {
        setOrdenacao(prev => ({
            campo,
            direcao: prev.campo === campo && prev.direcao === 'asc' ? 'desc' : 'asc'
        }));
    };

    const ordenarItens = (itens: ListaMaeItem[]) => {
        return [...itens].sort((a, b) => {
            let valorA: string | number;
            let valorB: string | number;

            if (ordenacao.campo === 'pedido') {
                valorA = a.pedido ?? calcularPedido(a.quantidade_minima, a.quantidade_atual, a.quantidade_por_fardo ?? 1);
                valorB = b.pedido ?? calcularPedido(b.quantidade_minima, b.quantidade_atual, b.quantidade_por_fardo ?? 1);
            } else {
                valorA = a[ordenacao.campo as keyof ListaMaeItem] as string | number;
                valorB = b[ordenacao.campo as keyof ListaMaeItem] as string | number;
            }

            // Comparação para strings
            if (typeof valorA === 'string' && typeof valorB === 'string') {
                const comparacao = valorA.localeCompare(valorB, 'pt-BR', { sensitivity: 'base' });
                return ordenacao.direcao === 'asc' ? comparacao : -comparacao;
            }

            // Comparação para números
            const comparacao = ((valorA as number) ?? 0) - ((valorB as number) ?? 0);
            return ordenacao.direcao === 'asc' ? comparacao : -comparacao;
        });
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
                <Col md={3}>
                    <Card className={styles.statsCard}>
                        <Card.Body className="text-center">
                            <h3 className={styles.statValue}>{listaMae.total_itens - getItensInativos().length}</h3>
                            <p className={styles.statLabel}>Itens Ativos</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className={styles.statsCard}>
                        <Card.Body className="text-center">
                            <h3 className={styles.statValue} style={{ color: '#6c757d' }}>{getItensInativos().length}</h3>
                            <p className={styles.statLabel}>Itens Inativos</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className={styles.statsCard}>
                        <Card.Body className="text-center">
                            <h3 className={styles.statValue}>{itensSelecionados.size}</h3>
                            <p className={styles.statLabel}>Selecionados</p>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className={styles.statsCard}>
                        <Card.Body className="text-center">
                            <small className="text-muted">Criada em</small>
                            <p className={styles.statDate}>
                                {formatarDataBrasiliaSemHora(listaMae.data_criacao)}
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
                                            variant="info"
                                            size="sm"
                                            onClick={handleAbrirCopiar}
                                            className="me-2"
                                        >
                                            <FontAwesomeIcon icon={faCopy} /> Copiar para Lista
                                        </Button>
                                        <Button
                                            variant="warning"
                                            size="sm"
                                            onClick={handleAbrirMover}
                                            className="me-2"
                                        >
                                            <FontAwesomeIcon icon={faExchange} /> Mover para Lista
                                        </Button>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={() => setMostrarModalFornecedor(true)}
                                            className="me-2"
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
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleAbrirModalBuscaItens}
                        className="ms-2"
                    >
                        <FontAwesomeIcon icon={faSearch} /> Buscar Itens
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
                            <th
                                onClick={() => handleOrdenar('nome')}
                                style={{ cursor: 'pointer', userSelect: 'none' }}
                            >
                                Nome
                                {ordenacao.campo === 'nome' && (
                                    <span className="ms-1">
                                        {ordenacao.direcao === 'asc' ? '▲' : '▼'}
                                    </span>
                                )}
                            </th>
                            <th
                                onClick={() => handleOrdenar('unidade')}
                                style={{ cursor: 'pointer', userSelect: 'none', width: '100px' }}
                                className="text-center"
                            >
                                Unidade
                                {ordenacao.campo === 'unidade' && (
                                    <span className="ms-1">
                                        {ordenacao.direcao === 'asc' ? '▲' : '▼'}
                                    </span>
                                )}
                            </th>
                            <th
                                onClick={() => handleOrdenar('quantidade_atual')}
                                style={{ cursor: 'pointer', userSelect: 'none', width: '120px' }}
                                className="text-center"
                            >
                                Qtd Atual
                                {ordenacao.campo === 'quantidade_atual' && (
                                    <span className="ms-1">
                                        {ordenacao.direcao === 'asc' ? '▲' : '▼'}
                                    </span>
                                )}
                            </th>
                            <th
                                onClick={() => handleOrdenar('quantidade_minima')}
                                style={{ cursor: 'pointer', userSelect: 'none', width: '120px' }}
                                className="text-center"
                            >
                                Qtd Mín
                                {ordenacao.campo === 'quantidade_minima' && (
                                    <span className="ms-1">
                                        {ordenacao.direcao === 'asc' ? '▲' : '▼'}
                                    </span>
                                )}
                                {!modoEdicaoLote ? (
                                    <Button
                                        variant="outline-light"
                                        size="sm"
                                        className="ms-2"
                                        onClick={(e) => { e.stopPropagation(); ativarModoLote(); }}
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
                                            onClick={(e) => { e.stopPropagation(); salvarQuantidadesLote(); }}
                                            title="Salvar todas"
                                        >
                                            ✓
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="ms-1"
                                            onClick={(e) => { e.stopPropagation(); cancelarModoLote(); }}
                                            title="Cancelar"
                                        >
                                            ✕
                                        </Button>
                                    </>
                                )}
                            </th>
                            <th
                                onClick={() => handleOrdenar('pedido')}
                                style={{ cursor: 'pointer', userSelect: 'none', width: '100px' }}
                                className="text-center"
                            >
                                Pedido
                                {ordenacao.campo === 'pedido' && (
                                    <span className="ms-1">
                                        {ordenacao.direcao === 'asc' ? '▲' : '▼'}
                                    </span>
                                )}
                            </th>
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
                                    onChange={(e) => setNovoItem({ ...novoItem, quantidade_atual: e.target.value })}
                                />
                            </td>
                            <td>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="form-control form-control-sm"
                                    placeholder="0"
                                    value={novoItem.quantidade_minima}
                                    onChange={(e) => setNovoItem({ ...novoItem, quantidade_minima: e.target.value })}
                                />
                            </td>
                            <td className="text-center">
                                <Badge bg="info">
                                    {(() => {
                                        const qtdMinParsed = novoItem.quantidade_minima === '' ? 0 : parseFloat(novoItem.quantidade_minima);
                                        const qtdAtualParsed = novoItem.quantidade_atual === '' ? 0 : parseFloat(novoItem.quantidade_atual);
                                        const qtdMin = Number.isNaN(qtdMinParsed) ? 0 : qtdMinParsed;
                                        const qtdAtual = Number.isNaN(qtdAtualParsed) ? 0 : qtdAtualParsed;
                                        return calcularPedido(qtdMin, qtdAtual);
                                    })()}
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
                            getItensFiltrados().map((item) => {
                                const isSelected = item.id ? itensSelecionados.has(item.id) : false;
                                const rowClassName = [
                                    item.pedido && item.pedido > 0 ? styles.warningRow : '',
                                    isSelected ? styles.selectedRow : ''
                                ].filter(Boolean).join(' ');
                                return (
                                <tr key={item.id} className={rowClassName}>
                                    <td className="text-center">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
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
                                                value={quantidadesLote[item.id] ?? String(item.quantidade_minima)}
                                                onChange={(e) => {
                                                    if (item.id) {
                                                        setQuantidadesLote({
                                                            ...quantidadesLote,
                                                            [item.id]: e.target.value
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
                                            variant={item.usa_threshold ? "secondary" : "outline-secondary"}
                                            size="sm"
                                            onClick={() => abrirModalConfig(item)}
                                            title="Configurar threshold/fardo"
                                            className="me-1"
                                        >
                                            <FontAwesomeIcon icon={faCog} />
                                        </Button>
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
                            )})
                        ) : (
                            <tr>
                                <td colSpan={7} className="text-center text-muted py-5">
                                    {listaMae.itens && listaMae.itens.length > 0
                                        ? (getItensInativos().length === listaMae.itens.length
                                            ? '📋 Todos os itens estão inativos (veja seção abaixo)'
                                            : '❌ Nenhum item corresponde aos filtros aplicados')
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

            {/* Seção de Itens Inativos (quantidade_minima = 0) */}
            {getItensInativos().length > 0 && (
                <Card className="mt-4">
                    <Card.Header
                        onClick={() => setMostrarItensInativos(!mostrarItensInativos)}
                        style={{ cursor: 'pointer' }}
                        className="d-flex justify-content-between align-items-center"
                    >
                        <div>
                            <Badge bg="secondary" className="me-2">{getItensInativos().length}</Badge>
                            <strong>Itens Inativos</strong>
                            <small className="text-muted ms-2">(quantidade mínima = 0, não visíveis para colaboradores)</small>
                        </div>
                        <span>{mostrarItensInativos ? '▲' : '▼'}</span>
                    </Card.Header>
                    {mostrarItensInativos && (
                        <Card.Body className="p-0">
                            <Table striped bordered hover responsive size="sm" className="mb-0">
                                <thead>
                                    <tr className="bg-light">
                                        <th>Nome</th>
                                        <th className="text-center" style={{ width: '100px' }}>Unidade</th>
                                        <th className="text-center" style={{ width: '120px' }}>Qtd Mín</th>
                                        <th className="text-center" style={{ width: '100px' }}>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {getItensInativos().map((item) => (
                                        <tr key={item.id}>
                                            <td>{item.nome}</td>
                                            <td className="text-center">
                                                <Badge bg="light" text="dark">{item.unidade}</Badge>
                                            </td>
                                            <td
                                                className="text-center"
                                                onDoubleClick={() => item.id && iniciarEdicao(item.id, 'quantidade_minima', item.quantidade_minima)}
                                                style={{ cursor: 'pointer' }}
                                                title="Duplo clique para editar e reativar"
                                            >
                                                {(editandoCampo && editandoCampo.itemId === item.id && editandoCampo.campo === 'quantidade_minima') ? (
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
                                    ))}
                                </tbody>
                            </Table>
                            <div className="p-2 bg-light border-top">
                                <small className="text-muted">
                                    💡 <strong>Dica:</strong> Para reativar um item, dê duplo clique na quantidade mínima e defina um valor maior que 0.
                                </small>
                            </div>
                        </Card.Body>
                    )}
                </Card>
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

            {/* Modal de Configuração de Threshold/Fardo */}
            <Modal show={mostrarModalConfig} onHide={() => setMostrarModalConfig(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FontAwesomeIcon icon={faCog} /> Configurar Item
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {itemConfigurando && (
                        <>
                            <Alert variant="info" className="mb-3">
                                <strong>Item:</strong> {itemConfigurando.nome}
                            </Alert>

                            <Form.Group className="mb-3">
                                <Form.Label><strong>Quando estoque ≤</strong></Form.Label>
                                <Form.Control
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={configForm.quantidade_minima}
                                    onChange={(e) => setConfigForm({...configForm, quantidade_minima: e.target.value})}
                                />
                                <Form.Text className="text-muted">
                                    Quando o estoque atingir esse valor, será gerado um pedido.
                                </Form.Text>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label><strong>Pedir quantas unidades</strong></Form.Label>
                                <Form.Control
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={configForm.quantidade_por_fardo}
                                    onChange={(e) => setConfigForm({...configForm, quantidade_por_fardo: e.target.value})}
                                />
                                <Form.Text className="text-muted">
                                    Quantidade a ser pedida quando atingir o mínimo.
                                </Form.Text>
                            </Form.Group>

                            <Alert variant="info">
                                <small>
                                    <strong>Resumo:</strong> Quando estoque ≤ {configForm.quantidade_minima || '?'},
                                    pedir {configForm.quantidade_por_fardo || '?'} unidades.
                                </small>
                            </Alert>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setMostrarModalConfig(false)}>
                        Cancelar
                    </Button>
                    <Button
                        variant="primary"
                        onClick={salvarConfig}
                        disabled={salvandoConfig}
                    >
                        {salvandoConfig ? (
                            <>
                                <Spinner as="span" animation="border" size="sm" className="me-2" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faCheck} /> Salvar
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal de Busca de Itens */}
            <Modal show={mostrarModalBuscaItens} onHide={handleFecharModalBuscaItens} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FontAwesomeIcon icon={faSearch} /> Buscar Itens
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {erroBuscaItens && (
                        <Alert variant="danger" dismissible onClose={() => setErroBuscaItens(null)}>
                            {erroBuscaItens}
                        </Alert>
                    )}

                    <Form.Group className="mb-3">
                        <Form.Label><strong>Pesquisar itens</strong></Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Buscar por item ou fornecedor..."
                            value={buscaItensTermo}
                            onChange={(e) => setBuscaItensTermo(e.target.value)}
                        />
                    </Form.Group>

                    <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                        <div className="btn-group" role="group" aria-label="Filtro de origem">
                            <Button
                                type="button"
                                variant={filtroOrigemBusca === 'lista_global' ? 'primary' : 'outline-primary'}
                                onClick={() => setFiltroOrigemBusca('lista_global')}
                            >
                                Lista Global
                            </Button>
                            <Button
                                type="button"
                                variant={filtroOrigemBusca === 'regional' ? 'primary' : 'outline-primary'}
                                onClick={() => setFiltroOrigemBusca('regional')}
                            >
                                Fornecedores Regionais
                            </Button>
                            <Button
                                type="button"
                                variant={filtroOrigemBusca === 'todas' ? 'primary' : 'outline-primary'}
                                onClick={() => setFiltroOrigemBusca('todas')}
                            >
                                Ambos
                            </Button>
                        </div>
                        <div className="text-muted ms-auto">
                            <small>
                                Mostrando {itensBuscaFiltrados.length} de {itensBusca.length} itens
                            </small>
                        </div>
                    </div>

                    {carregandoBuscaItens ? (
                        <div className="text-center py-4">
                            <Spinner animation="border" />
                            <p className="mt-2">Carregando itens...</p>
                        </div>
                    ) : itensBuscaFiltrados.length === 0 ? (
                        <Alert variant="info">
                            Nenhum item encontrado. Ajuste os filtros ou a busca.
                        </Alert>
                    ) : (
                        <div
                            style={{
                                maxHeight: '360px',
                                overflowY: 'auto',
                                border: '1px solid #dee2e6',
                                borderRadius: '4px'
                            }}
                        >
                            <Table hover className="mb-0">
                                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1 }}>
                                    <tr>
                                        <th style={{ width: '40px' }}></th>
                                        <th>Item</th>
                                        <th style={{ width: '120px' }}>Unidade</th>
                                        <th>Origem</th>
                                        <th style={{ width: '130px' }}>Qtd. Mín.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {itensBuscaFiltrados.map((item) => {
                                        const isSelected = itensSelecionadosBusca.has(item.id);
                                        const quantidade = itensSelecionadosBusca.get(item.id) ?? '1';

                                        return (
                                            <tr key={item.id} className={isSelected ? styles.selectedRow : ''}>
                                                <td>
                                                    <Form.Check
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                handleToggleItemBusca(item, '1');
                                                            } else {
                                                                handleToggleItemBusca(item, null);
                                                            }
                                                        }}
                                                    />
                                                </td>
                                                <td><strong>{item.nome}</strong></td>
                                                <td>{item.unidade}</td>
                                                <td>{getOrigemBadgeBusca(item)}</td>
                                                <td>
                                                    {isSelected && (
                                                        <Form.Control
                                                            type="number"
                                                            min="0.01"
                                                            step="0.01"
                                                            value={quantidade}
                                                            onChange={(e) => handleToggleItemBusca(item, e.target.value)}
                                                            size="sm"
                                                        />
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </Table>
                        </div>
                    )}

                    <div className="mt-2 text-muted">
                        <small>{itensSelecionadosBusca.size} selecionado(s)</small>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleFecharModalBuscaItens}>
                        Cancelar
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleAdicionarItensBusca}
                        disabled={carregandoAdicionarBusca || itensSelecionadosBusca.size === 0}
                    >
                        {carregandoAdicionarBusca ? (
                            <>
                                <Spinner as="span" animation="border" size="sm" className="me-2" />
                                Adicionando...
                            </>
                        ) : (
                            'Adicionar Selecionados'
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

            {/* Modal de Copiar/Mover */}
            <Modal show={mostrarModalCopiar || mostrarModalMover} onHide={handleFecharModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        {mostrarModalCopiar ? 'Copiar' : 'Mover'} Itens para Outra Lista
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Alert variant="info">
                        <strong>{itensSelecionados.size} item(ns) selecionado(s)</strong>
                    </Alert>

                    <Form.Group className="mb-3">
                        <Form.Label><strong>Destino</strong></Form.Label>
                        <div>
                            <Form.Check
                                type="radio"
                                id="radio-existente"
                                label="Lista Existente"
                                checked={tipoOperacao === 'existente'}
                                onChange={() => setTipoOperacao('existente')}
                                className="mb-2"
                            />
                            <Form.Check
                                type="radio"
                                id="radio-nova"
                                label="Criar Nova Lista"
                                checked={tipoOperacao === 'nova'}
                                onChange={() => setTipoOperacao('nova')}
                            />
                        </div>
                    </Form.Group>

                    {tipoOperacao === 'existente' ? (
                        <Form.Group>
                            <Form.Label>Selecione a Lista</Form.Label>
                            <Form.Select
                                value={listaDestinoId || ''}
                                onChange={(e) => setListaDestinoId(Number(e.target.value))}
                            >
                                <option value="">Escolha uma lista...</option>
                                {listas
                                    .filter(l => l.id !== Number(listaId))
                                    .map((lista: any) => (
                                        <option key={lista.id} value={lista.id}>
                                            {lista.nome}
                                        </option>
                                    ))}
                            </Form.Select>
                        </Form.Group>
                    ) : (
                        <>
                            <Form.Group className="mb-3">
                                <Form.Label>Nome da Nova Lista</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={nomeNovaLista}
                                    onChange={(e) => setNomeNovaLista(e.target.value)}
                                    placeholder="Ex: Lista Cozinha"
                                />
                            </Form.Group>
                            <Form.Group>
                                <Form.Label>Área</Form.Label>
                                <Form.Select
                                    value={areaIdNova || ''}
                                    onChange={(e) => setAreaIdNova(Number(e.target.value))}
                                >
                                    <option value="">Escolha uma área...</option>
                                    {areas.map((area: any) => (
                                        <option key={area.id} value={area.id}>
                                            {area.nome}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleFecharModal}>
                        Cancelar
                    </Button>
                    <Button
                        variant={mostrarModalCopiar ? 'info' : 'warning'}
                        onClick={handleConfirmarOperacao}
                        disabled={
                            carregandoOperacao ||
                            (tipoOperacao === 'existente' ? !listaDestinoId : (!nomeNovaLista || !areaIdNova))
                        }
                    >
                        {carregandoOperacao ? (
                            <><Spinner size="sm" /> Processando...</>
                        ) : (
                            <>{mostrarModalCopiar ? 'Copiar' : 'Mover'} Itens</>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal de Resultado */}
            <Modal show={mostrarModalResultado} onHide={() => setMostrarModalResultado(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <FontAwesomeIcon
                            icon={resultado?.itens_ignorados > 0 ? faExclamationTriangle : faCheck}
                            className="me-2"
                        />
                        Operação Concluída
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Alert variant="success">
                        {resultado?.message}
                    </Alert>

                    {resultado?.itens_ignorados > 0 && (
                        <Alert variant="warning">
                            <strong>⚠️ Itens Ignorados ({resultado.itens_ignorados}):</strong>
                            <p className="mb-2 mt-2">
                                Os seguintes itens já existiam na lista de destino e foram ignorados:
                            </p>
                            <ul className="mb-0">
                                {resultado.itens_ignorados_lista?.map((nome: string, idx: number) => (
                                    <li key={idx}>{nome}</li>
                                ))}
                            </ul>
                        </Alert>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={() => setMostrarModalResultado(false)}>
                        Fechar
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default ListaMaeConsolidada;
