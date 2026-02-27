import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatarDataBrasiliaSemHora } from '../../utils/dateFormatter';
import styles from './ListaRapida.module.css';

interface ItemGlobal {
    id: number;
    nome: string;
    unidade: string;
}

interface ItemSelecionado {
    item_global_id?: number;  // Optional para itens temporários
    nome: string;
    unidade: string;
    prioridade: 'prevencao' | 'precisa_comprar' | 'urgente';
    observacao: string;
    is_temporario?: boolean;  // Flag para identificar itens temporários
    cadastrar_no_sistema?: boolean;  // Flag para identificar sugestões
}

const CriarListaRapida: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [nome, setNome] = useState('');
    const [descricao, setDescricao] = useState('');
    const [busca, setBusca] = useState('');
    const [itensGlobais, setItensGlobais] = useState<ItemGlobal[]>([]);
    const [itensSelecionados, setItensSelecionados] = useState<ItemSelecionado[]>([]);
    const [loading, setLoading] = useState(false);

    // Estados para o modal de sugestão
    const [mostrarModalSugestao, setMostrarModalSugestao] = useState(false);
    const [novoItemNome, setNovoItemNome] = useState('');
    const [novoItemUnidade, setNovoItemUnidade] = useState('');
    const [cadastrarNoSistema, setCadastrarNoSistema] = useState(true);

    useEffect(() => {
        carregarItensGlobais();
    }, []);

    const carregarItensGlobais = async () => {
        try {
            const response = await api.get('/auth/itens-globais');
            const itens = response.data.itens || response.data;
            console.log('[CriarListaRapida] Itens carregados:', itens.length);
            setItensGlobais(itens);
        } catch (error) {
            console.error('[CriarListaRapida] Erro ao carregar itens:', error);
            alert('Erro ao carregar itens. Tente novamente.');
        }
    };

    const autoCompletarNome = () => {
        const hoje = new Date();
        const diaSemana = new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            weekday: 'long'
        }).format(hoje);
        const data = formatarDataBrasiliaSemHora(hoje.toISOString());
        
        setNome(`Lista Rápida de ${diaSemana} ${data}`);
    };

    const toggleItem = (item: ItemGlobal, checked: boolean) => {
        if (checked) {
            setItensSelecionados([...itensSelecionados, {
                item_global_id: item.id,
                nome: item.nome,
                unidade: item.unidade,
                prioridade: 'prevencao',
                observacao: ''
            }]);
        } else {
            setItensSelecionados(itensSelecionados.filter(i => i.item_global_id !== item.id));
        }
    };

    const isItemSelecionado = (itemId: number) => {
        return itensSelecionados.some(i => i.item_global_id === itemId);
    };

    const alterarPrioridade = (itemIdentifier: number | string, prioridade: 'prevencao' | 'precisa_comprar' | 'urgente') => {
        setItensSelecionados(itensSelecionados.map(item => {
            // Para itens do catálogo, compara por item_global_id
            // Para itens temporários/sugestões, compara por nome
            const matches = typeof itemIdentifier === 'number'
                ? item.item_global_id === itemIdentifier
                : item.nome === itemIdentifier;

            return matches ? { ...item, prioridade } : item;
        }));
    };

    const handleSugerirItem = () => {
        if (!novoItemNome.trim()) {
            alert('⚠️ Preencha o nome do item!');
            return;
        }

        if (!novoItemUnidade.trim()) {
            alert('⚠️ Preencha a unidade do item!');
            return;
        }

        // Adicionar item à lista de selecionados com flags especiais
        const novoItem: ItemSelecionado = {
            nome: novoItemNome.trim(),
            unidade: novoItemUnidade.trim(),
            prioridade: 'prevencao',
            observacao: '',
            is_temporario: !cadastrarNoSistema,
            cadastrar_no_sistema: cadastrarNoSistema
        };

        setItensSelecionados([...itensSelecionados, novoItem]);

        // Limpar e fechar modal
        setNovoItemNome('');
        setNovoItemUnidade('');
        setCadastrarNoSistema(true);
        setMostrarModalSugestao(false);

        alert(cadastrarNoSistema
            ? '✅ Item adicionado! Será enviado para aprovação do admin ao submeter a lista.'
            : '✅ Item temporário adicionado à lista!');
    };

    const submeter = async () => {
        if (!nome.trim()) {
            alert('⚠️ Preencha o nome da lista!');
            return;
        }

        if (itensSelecionados.length === 0) {
            alert('⚠️ Selecione pelo menos um item!');
            return;
        }

        setLoading(true);
        try {
            // Criar lista
            const listaResponse = await api.post('/auth/listas-rapidas', {
                nome: nome.trim(),
                descricao: descricao.trim() || ''
            });

            const novaListaId = listaResponse.data.lista.id;

            // Separar itens por tipo
            const itensDoCatalogo = itensSelecionados.filter(item => item.item_global_id);
            const itensTemporarios = itensSelecionados.filter(item => item.is_temporario);
            const sugestoes = itensSelecionados.filter(item => item.cadastrar_no_sistema);

            // Adicionar itens do catálogo global
            if (itensDoCatalogo.length > 0) {
                await api.post(`/auth/listas-rapidas/${novaListaId}/itens`, {
                    itens: itensDoCatalogo
                });
            }

            // Adicionar itens temporários
            for (const item of itensTemporarios) {
                await api.post(`/auth/listas-rapidas/${novaListaId}/itens/temporario`, {
                    nome_item: item.nome,
                    unidade: item.unidade,
                    prioridade: item.prioridade,
                    observacao: item.observacao
                });
            }

            // Criar sugestões
            for (const item of sugestoes) {
                await api.post('/auth/sugestoes', {
                    lista_rapida_id: novaListaId,
                    nome_item: item.nome,
                    unidade: item.unidade,
                    quantidade: 1,
                    mensagem_usuario: `Item sugerido durante criação de lista rápida`
                });
            }

            // Submeter
            await api.post(`/auth/listas-rapidas/${novaListaId}/submeter`);

            // Mensagem e redirecionamento baseado no role do usuário
            if (user?.role === 'ADMIN') {
                alert('✅ Lista criada e submetida com sucesso!');
                navigate('/admin/submissoes');
            } else {
                alert('✅ Lista criada e submetida com sucesso! O administrador irá analisá-la.');
                navigate('/collaborator/submissions');
            }
        } catch (error: any) {
            alert(error.response?.data?.error || 'Erro ao criar lista');
        } finally {
            setLoading(false);
        }
    };

    const itensFiltrados = itensGlobais.filter(item =>
        item.nome.toLowerCase().includes(busca.toLowerCase())
    );

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1><i className="fas fa-bolt"></i> Criar Lista Rápida</h1>
                <button className={styles.btnVoltar} onClick={() => navigate(-1)}>
                    <i className="fas fa-arrow-left"></i> Voltar
                </button>
            </div>

            <div className={styles.content}>
                {/* Formulário no topo */}
                <div className={styles.formSection}>
                    <div className={styles.formGroup}>
                        <label>Nome da Lista *</label>
                        <div className={styles.inputComBotao}>
                            <input
                                type="text"
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                placeholder="Ex: Lista Rápida de Segunda-feira 30/12/2024"
                            />
                            <button
                                type="button"
                                className={styles.btnAutoCompletar}
                                onClick={autoCompletarNome}
                            >
                                <i className="fas fa-magic"></i> Auto Completar
                            </button>
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Descrição (opcional)</label>
                        <textarea
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            placeholder="Descreva o objetivo desta lista..."
                            rows={3}
                        />
                    </div>
                </div>

                {/* Seleção de itens */}
                <div className={styles.selecaoSection}>
                    <h3>Selecione os Itens</h3>
                    <input
                        type="text"
                        className={styles.busca}
                        placeholder="🔍 Buscar item..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                    />

                    <div className={styles.grid}>
                        {/* Lista de todos os itens com checkbox */}
                        <div className={styles.painelItens}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <h4>Itens Disponíveis</h4>
                                <button
                                    type="button"
                                    className={styles.btnSugerirItem}
                                    onClick={() => setMostrarModalSugestao(true)}
                                    style={{
                                        padding: '5px 10px',
                                        fontSize: '14px',
                                        backgroundColor: '#28a745',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <i className="fas fa-plus-circle"></i> Sugerir Novo Item
                                </button>
                            </div>
                            <div className={styles.listaItensCheckbox}>
                                {itensFiltrados.length === 0 ? (
                                    <div className={styles.vazio}>
                                        Nenhum item encontrado
                                    </div>
                                ) : (
                                    itensFiltrados.map(item => (
                                        <label key={item.id} className={styles.itemCheckbox}>
                                            <input
                                                type="checkbox"
                                                checked={isItemSelecionado(item.id)}
                                                onChange={(e) => toggleItem(item, e.target.checked)}
                                            />
                                            <div className={styles.itemCheckboxInfo}>
                                                <strong>{item.nome}</strong>
                                                <span>{item.unidade}</span>
                                            </div>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Lista composta */}
                        <div className={styles.painelSelecionados}>
                            <h4>Lista Composta ({itensSelecionados.length})</h4>
                            <div className={styles.listaComposta}>
                                {itensSelecionados.length === 0 ? (
                                    <div className={styles.vazio}>
                                        Nenhum item selecionado ainda
                                    </div>
                                ) : (
                                    itensSelecionados.map((item, index) => {
                                        const itemKey = item.item_global_id || `temp-${item.nome}-${index}`;
                                        const itemIdentifier = item.item_global_id || item.nome;

                                        return (
                                            <div key={itemKey} className={styles.itemSelecionado}>
                                                <div className={styles.itemHeader}>
                                                    <div>
                                                        <strong>{item.nome}</strong>
                                                        {item.is_temporario && (
                                                            <span style={{
                                                                marginLeft: '8px',
                                                                padding: '2px 6px',
                                                                backgroundColor: '#ffc107',
                                                                color: '#000',
                                                                borderRadius: '3px',
                                                                fontSize: '11px',
                                                                fontWeight: 'bold'
                                                            }}>
                                                                TEMPORÁRIO
                                                            </span>
                                                        )}
                                                        {item.cadastrar_no_sistema && (
                                                            <span style={{
                                                                marginLeft: '8px',
                                                                padding: '2px 6px',
                                                                backgroundColor: '#17a2b8',
                                                                color: '#fff',
                                                                borderRadius: '3px',
                                                                fontSize: '11px',
                                                                fontWeight: 'bold'
                                                            }}>
                                                                SUGESTÃO
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className={styles.unidade}>{item.unidade}</span>
                                                </div>

                                                <div className={styles.prioridades}>
                                                    <button
                                                        type="button"
                                                        className={`${styles.btnPrioridade} ${styles.prevencao} ${item.prioridade === 'prevencao' ? styles.ativo : ''}`}
                                                        onClick={() => alterarPrioridade(itemIdentifier, 'prevencao')}
                                                    >
                                                        🟢 Prevenção
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`${styles.btnPrioridade} ${styles.precisaComprar} ${item.prioridade === 'precisa_comprar' ? styles.ativo : ''}`}
                                                        onClick={() => alterarPrioridade(itemIdentifier, 'precisa_comprar')}
                                                    >
                                                        🟡 Comprar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`${styles.btnPrioridade} ${styles.urgente} ${item.prioridade === 'urgente' ? styles.ativo : ''}`}
                                                        onClick={() => alterarPrioridade(itemIdentifier, 'urgente')}
                                                    >
                                                        🔴 Urgente
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {itensSelecionados.length > 0 && (
                                <button
                                    className={styles.btnSubmeter}
                                    onClick={submeter}
                                    disabled={loading}
                                >
                                    {loading ? 'Enviando...' : '✅ Submeter para Aprovação'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Sugestão */}
            {mostrarModalSugestao && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '30px',
                        borderRadius: '8px',
                        maxWidth: '500px',
                        width: '90%',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}>
                        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Sugerir Novo Item</h3>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                Nome do Item *
                            </label>
                            <input
                                type="text"
                                value={novoItemNome}
                                onChange={(e) => setNovoItemNome(e.target.value)}
                                placeholder="Ex: Abacaxi"
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc',
                                    fontSize: '14px'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                Unidade *
                            </label>
                            <input
                                type="text"
                                value={novoItemUnidade}
                                onChange={(e) => setNovoItemUnidade(e.target.value)}
                                placeholder="Ex: kg, un, L"
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc',
                                    fontSize: '14px'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={cadastrarNoSistema}
                                    onChange={(e) => setCadastrarNoSistema(e.target.checked)}
                                    style={{ marginRight: '8px' }}
                                />
                                <span>Cadastrar este item no sistema (requer aprovação do admin)</span>
                            </label>
                            {!cadastrarNoSistema && (
                                <p style={{
                                    marginTop: '8px',
                                    marginLeft: '24px',
                                    fontSize: '13px',
                                    color: '#666'
                                }}>
                                    Item será usado apenas nesta lista e não ficará disponível para outros usuários.
                                </p>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => {
                                    setMostrarModalSugestao(false);
                                    setNovoItemNome('');
                                    setNovoItemUnidade('');
                                    setCadastrarNoSistema(true);
                                }}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSugerirItem}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#007bff',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '14px'
                                }}
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CriarListaRapida;
