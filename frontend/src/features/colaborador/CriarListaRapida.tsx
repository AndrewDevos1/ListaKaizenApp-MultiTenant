import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import styles from './ListaRapida.module.css';

interface ItemGlobal {
    id: number;
    nome: string;
    unidade: string;
}

interface ItemSelecionado {
    item_global_id: number;
    nome: string;
    unidade: string;
    prioridade: 'prevencao' | 'precisa_comprar' | 'urgente';
    observacao: string;
}

const CriarListaRapida: React.FC = () => {
    const navigate = useNavigate();
    const [nome, setNome] = useState('');
    const [descricao, setDescricao] = useState('');
    const [busca, setBusca] = useState('');
    const [itensGlobais, setItensGlobais] = useState<ItemGlobal[]>([]);
    const [itensSelecionados, setItensSelecionados] = useState<ItemSelecionado[]>([]);
    const [loading, setLoading] = useState(false);
    const [listaId, setListaId] = useState<number | null>(null);

    useEffect(() => {
        carregarItensGlobais();
    }, []);

    const carregarItensGlobais = async () => {
        try {
            const response = await api.get('/auth/lista-mae-itens');
            setItensGlobais(response.data);
        } catch (error) {
            console.error('[CriarListaRapida] Erro ao carregar itens:', error);
        }
    };

    const itensGlobaisFiltrados = itensGlobais.filter(item =>
        item.nome.toLowerCase().includes(busca.toLowerCase())
    );

    const criarLista = async () => {
        if (!nome.trim()) {
            alert('Informe o nome da lista!');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/auth/listas-rapidas', {
                nome,
                descricao
            });
            setListaId(response.data.lista.id);
            alert('Lista criada! Agora adicione os itens.');
        } catch (error: any) {
            alert(error.response?.data?.error || 'Erro ao criar lista');
        } finally {
            setLoading(false);
        }
    };

    const adicionarItem = async (item: ItemGlobal) => {
        if (!listaId) {
            alert('Crie a lista primeiro!');
            return;
        }

        if (itensSelecionados.find(i => i.item_global_id === item.id)) {
            alert('Item já adicionado!');
            return;
        }

        try {
            await api.post(`/auth/listas-rapidas/${listaId}/itens`, {
                item_global_id: item.id,
                prioridade: 'precisa_comprar'
            });

            setItensSelecionados([...itensSelecionados, {
                item_global_id: item.id,
                nome: item.nome,
                unidade: item.unidade,
                prioridade: 'precisa_comprar',
                observacao: ''
            }]);
        } catch (error: any) {
            alert(error.response?.data?.error || 'Erro ao adicionar item');
        }
    };

    const removerItem = async (itemId: number) => {
        if (!listaId) return;

        try {
            // Buscar o ID do item na lista
            const response = await api.get(`/auth/listas-rapidas/${listaId}`);
            const itemNaLista = response.data.itens.find((i: any) => i.item_global_id === itemId);
            
            if (itemNaLista) {
                await api.delete(`/auth/listas-rapidas/${listaId}/itens/${itemNaLista.id}`);
                setItensSelecionados(itensSelecionados.filter(i => i.item_global_id !== itemId));
            }
        } catch (error: any) {
            alert(error.response?.data?.error || 'Erro ao remover item');
        }
    };

    const alterarPrioridade = async (itemId: number, novaPrioridade: 'prevencao' | 'precisa_comprar' | 'urgente') => {
        if (!listaId) return;

        try {
            const response = await api.get(`/auth/listas-rapidas/${listaId}`);
            const itemNaLista = response.data.itens.find((i: any) => i.item_global_id === itemId);
            
            if (itemNaLista) {
                await api.put(`/auth/listas-rapidas/${listaId}/itens/${itemNaLista.id}/prioridade`, {
                    prioridade: novaPrioridade
                });

                setItensSelecionados(itensSelecionados.map(i =>
                    i.item_global_id === itemId ? { ...i, prioridade: novaPrioridade } : i
                ));
            }
        } catch (error: any) {
            alert(error.response?.data?.error || 'Erro ao alterar prioridade');
        }
    };

    const submeterLista = async () => {
        if (!listaId) return;

        if (itensSelecionados.length === 0) {
            alert('Adicione pelo menos um item!');
            return;
        }

        setLoading(true);
        try {
            await api.post(`/auth/listas-rapidas/${listaId}/submeter`);
            alert('✅ Lista submetida para aprovação!');
            navigate('/collaborator/minhas-listas-rapidas');
        } catch (error: any) {
            alert(error.response?.data?.error || 'Erro ao submeter lista');
        } finally {
            setLoading(false);
        }
    };

    const getPrioridadeColor = (prioridade: string) => {
        switch (prioridade) {
            case 'urgente': return styles.urgente;
            case 'precisa_comprar': return styles.precisaComprar;
            case 'prevencao': return styles.prevencao;
            default: return '';
        }
    };

    const getPrioridadeLabel = (prioridade: string) => {
        switch (prioridade) {
            case 'urgente': return '🔴 Urgente';
            case 'precisa_comprar': return '🟡 Precisa Comprar';
            case 'prevencao': return '🟢 Prevenção';
            default: return prioridade;
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1><i className="fas fa-bolt"></i> Criar Lista Rápida</h1>
                <button className={styles.btnVoltar} onClick={() => navigate('/collaborator')}>
                    <i className="fas fa-arrow-left"></i> Voltar
                </button>
            </div>

            {!listaId ? (
                <div className={styles.formLista}>
                    <h3>1. Informações da Lista</h3>
                    <div className={styles.formGroup}>
                        <label>Nome da Lista *</label>
                        <input
                            type="text"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            placeholder="Ex: Compras Urgentes - Dezembro"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label>Descrição (opcional)</label>
                        <textarea
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            placeholder="Motivo da lista rápida..."
                            rows={3}
                        />
                    </div>
                    <button className={styles.btnCriar} onClick={criarLista} disabled={loading}>
                        {loading ? 'Criando...' : 'Criar Lista'}
                    </button>
                </div>
            ) : (
                <div className={styles.content}>
                    <div className={styles.listaInfo}>
                        <h3>📋 {nome}</h3>
                        {descricao && <p>{descricao}</p>}
                    </div>

                    <div className={styles.grid}>
                        <div className={styles.painelItens}>
                            <h3>2. Itens Disponíveis</h3>
                            <input
                                type="text"
                                className={styles.busca}
                                placeholder="🔍 Buscar item..."
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                            />
                            <div className={styles.listaItens}>
                                {itensGlobaisFiltrados.map(item => (
                                    <div key={item.id} className={styles.itemCard}>
                                        <div className={styles.itemInfo}>
                                            <strong>{item.nome}</strong>
                                            <span>{item.unidade}</span>
                                        </div>
                                        <button
                                            className={styles.btnAdicionar}
                                            onClick={() => adicionarItem(item)}
                                            disabled={itensSelecionados.some(i => i.item_global_id === item.id)}
                                        >
                                            {itensSelecionados.some(i => i.item_global_id === item.id) ? '✓' : '+'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={styles.painelSelecionados}>
                            <h3>3. Itens Selecionados ({itensSelecionados.length})</h3>
                            {itensSelecionados.length === 0 ? (
                                <p className={styles.vazio}>Nenhum item selecionado ainda.</p>
                            ) : (
                                <div className={styles.listaItens}>
                                    {itensSelecionados.map(item => (
                                        <div key={item.item_global_id} className={styles.itemSelecionado}>
                                            <div className={styles.itemHeader}>
                                                <strong>{item.nome}</strong>
                                                <button
                                                    className={styles.btnRemover}
                                                    onClick={() => removerItem(item.item_global_id)}
                                                >
                                                    <i className="fas fa-times"></i>
                                                </button>
                                            </div>
                                            <span className={styles.unidade}>{item.unidade}</span>
                                            <div className={styles.prioridades}>
                                                <button
                                                    className={`${styles.btnPrioridade} ${styles.prevencao} ${item.prioridade === 'prevencao' ? styles.ativo : ''}`}
                                                    onClick={() => alterarPrioridade(item.item_global_id, 'prevencao')}
                                                >
                                                    🟢 Prevenção
                                                </button>
                                                <button
                                                    className={`${styles.btnPrioridade} ${styles.precisaComprar} ${item.prioridade === 'precisa_comprar' ? styles.ativo : ''}`}
                                                    onClick={() => alterarPrioridade(item.item_global_id, 'precisa_comprar')}
                                                >
                                                    🟡 Precisa Comprar
                                                </button>
                                                <button
                                                    className={`${styles.btnPrioridade} ${styles.urgente} ${item.prioridade === 'urgente' ? styles.ativo : ''}`}
                                                    onClick={() => alterarPrioridade(item.item_global_id, 'urgente')}
                                                >
                                                    🔴 Urgente
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {itensSelecionados.length > 0 && (
                                <button
                                    className={styles.btnSubmeter}
                                    onClick={submeterLista}
                                    disabled={loading}
                                >
                                    {loading ? 'Submetendo...' : '✓ Submeter para Aprovação'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CriarListaRapida;
