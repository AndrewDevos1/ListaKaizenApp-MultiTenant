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

    useEffect(() => {
        carregarItensGlobais();
    }, []);

    const carregarItensGlobais = async () => {
        try {
            const response = await api.get('/auth/itens-globais');
            console.log('[CriarListaRapida] Itens carregados:', response.data);
            const itens = Array.isArray(response.data) ? response.data : [];
            setItensGlobais(itens);
        } catch (error) {
            console.error('[CriarListaRapida] Erro ao carregar itens:', error);
            setItensGlobais([]);
            alert('Erro ao carregar itens. Tente novamente.');
        }
    };

    const autoCompletarNome = () => {
        const hoje = new Date();
        const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        const diaSemana = diasSemana[hoje.getDay()];
        const data = hoje.toLocaleDateString('pt-BR');
        
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

    const alterarPrioridade = (itemId: number, prioridade: 'prevencao' | 'precisa_comprar' | 'urgente') => {
        setItensSelecionados(itensSelecionados.map(item =>
            item.item_global_id === itemId ? { ...item, prioridade } : item
        ));
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

            // Adicionar itens
            await api.post(`/auth/listas-rapidas/${novaListaId}/itens`, {
                itens: itensSelecionados
            });

            // Submeter
            await api.post(`/auth/listas-rapidas/${novaListaId}/submeter`);
            
            alert('✅ Lista criada e submetida com sucesso! O administrador irá analisá-la.');
            navigate('/collaborator/minhas-listas-rapidas');
        } catch (error: any) {
            alert(error.response?.data?.error || 'Erro ao criar lista');
        } finally {
            setLoading(false);
        }
    };

    // Função para normalizar string (remove acentos e converte para minúsculas)
    const normalizarString = (str: string): string => {
        return str
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    };

    const itensFiltrados = itensGlobais.filter(item =>
        normalizarString(item.nome).includes(normalizarString(busca))
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
                            <h4>Itens Disponíveis</h4>
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
                                    itensSelecionados.map(item => (
                                        <div key={item.item_global_id} className={styles.itemSelecionado}>
                                            <div className={styles.itemHeader}>
                                                <strong>{item.nome}</strong>
                                                <span className={styles.unidade}>{item.unidade}</span>
                                            </div>
                                            
                                            <div className={styles.prioridades}>
                                                <button
                                                    type="button"
                                                    className={`${styles.btnPrioridade} ${styles.prevencao} ${item.prioridade === 'prevencao' ? styles.ativo : ''}`}
                                                    onClick={() => alterarPrioridade(item.item_global_id, 'prevencao')}
                                                >
                                                    🟢 Prevenção
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`${styles.btnPrioridade} ${styles.precisaComprar} ${item.prioridade === 'precisa_comprar' ? styles.ativo : ''}`}
                                                    onClick={() => alterarPrioridade(item.item_global_id, 'precisa_comprar')}
                                                >
                                                    🟡 Comprar
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`${styles.btnPrioridade} ${styles.urgente} ${item.prioridade === 'urgente' ? styles.ativo : ''}`}
                                                    onClick={() => alterarPrioridade(item.item_global_id, 'urgente')}
                                                >
                                                    🔴 Urgente
                                                </button>
                                            </div>
                                        </div>
                                    ))
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
        </div>
    );
};

export default CriarListaRapida;
