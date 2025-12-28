import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import styles from './ListaRapida.module.css';

interface ItemGlobal {
    id: number;
    nome: string;
    unidade: string;
}

interface ItemSelecionado {
    id?: number;
    item_global_id: number;
    item_nome: string;
    item_unidade: string;
    prioridade: 'prevencao' | 'precisa_comprar' | 'urgente';
    observacao: string;
}

const EditarListaRapida: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [nome, setNome] = useState('');
    const [descricao, setDescricao] = useState('');
    const [busca, setBusca] = useState('');
    const [itensGlobais, setItensGlobais] = useState<ItemGlobal[]>([]);
    const [itensSelecionados, setItensSelecionados] = useState<ItemSelecionado[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        carregarDados();
    }, [id]);

    const carregarDados = async () => {
        try {
            console.log('[EditarListaRapida] Carregando dados...');
            const listaRes = await api.get(`/auth/listas-rapidas/${id}`);
            const lista = listaRes.data;
            
            setNome(lista.nome);
            setDescricao(lista.descricao || '');

            const itensExistentes = lista.itens.map((item: any) => ({
                id: item.id,
                item_global_id: item.item_global_id,
                item_nome: item.item_nome,
                item_unidade: item.item_unidade,
                prioridade: item.prioridade,
                observacao: item.observacao || ''
            }));
            setItensSelecionados(itensExistentes);

            // Carrega itens globais separadamente
            const itensRes = await api.get('/auth/itens-globais');
            console.log('[EditarListaRapida] Itens globais:', itensRes.data);
            setItensGlobais(itensRes.data.itens || []);
        } catch (error) {
            console.error('[EditarListaRapida] Erro:', error);
            alert('Erro ao carregar dados');
            navigate('/collaborator/minhas-listas-rapidas');
        } finally {
            setLoading(false);
        }
    };

    const itensDisponiveis = itensGlobais.filter(item => 
        item.nome.toLowerCase().includes(busca.toLowerCase()) &&
        !itensSelecionados.some(sel => sel.item_global_id === item.id)
    );

    const adicionarItem = (item: ItemGlobal) => {
        setItensSelecionados([...itensSelecionados, {
            item_global_id: item.id,
            item_nome: item.nome,
            item_unidade: item.unidade,
            prioridade: 'precisa_comprar',
            observacao: ''
        }]);
    };

    const removerItem = async (index: number) => {
        const item = itensSelecionados[index];
        if (item.id) {
            try {
                await api.delete(`/auth/listas-rapidas/${id}/itens/${item.id}`);
            } catch (error) {
                console.error('[EditarListaRapida] Erro ao remover:', error);
            }
        }
        setItensSelecionados(itensSelecionados.filter((_, i) => i !== index));
    };

    const salvar = async () => {
        if (!nome.trim()) {
            alert('Nome é obrigatório');
            return;
        }

        if (itensSelecionados.length === 0) {
            alert('Adicione pelo menos 1 item');
            return;
        }

        try {
            // Atualiza prioridades de itens existentes
            const itensExistentes = itensSelecionados.filter(item => item.id);
            for (const item of itensExistentes) {
                await api.put(`/auth/listas-rapidas/${id}/itens/${item.id}/prioridade`, {
                    prioridade: item.prioridade,
                    observacao: item.observacao || ''
                });
            }

            // Adiciona novos itens
            const novosItens = itensSelecionados.filter(item => !item.id).map(item => ({
                item_global_id: item.item_global_id,
                nome: item.item_nome,
                unidade: item.item_unidade,
                prioridade: item.prioridade,
                observacao: item.observacao || ''
            }));
            
            if (novosItens.length > 0) {
                await api.post(`/auth/listas-rapidas/${id}/itens`, { itens: novosItens });
            }

            alert('✅ Lista atualizada com sucesso!');
            navigate('/collaborator/minhas-listas-rapidas');
        } catch (error: any) {
            console.error('[EditarListaRapida] Erro ao salvar:', error);
            alert(error.response?.data?.error || 'Erro ao salvar lista');
        }
    };

    const submeter = async () => {
        try {
            await api.post(`/auth/listas-rapidas/${id}/submeter`);
            alert('✅ Lista submetida para aprovação!');
            navigate('/collaborator/minhas-listas-rapidas');
        } catch (error: any) {
            alert(error.response?.data?.error || 'Erro ao submeter lista');
        }
    };

    if (loading) return <div className={styles.loading}>Carregando...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1><i className="fas fa-bolt"></i> Editar Lista Rápida</h1>
            </div>

            <div className={styles.form}>
                <div className={styles.formGroup}>
                    <label>Nome da Lista *</label>
                    <input
                        type="text"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className={styles.input}
                        readOnly
                    />
                </div>

                <div className={styles.formGroup}>
                    <label>Descrição (opcional)</label>
                    <textarea
                        value={descricao}
                        onChange={(e) => setDescricao(e.target.value)}
                        className={styles.textarea}
                        rows={3}
                        readOnly
                    />
                </div>

                <div className={styles.divider}></div>

                <h3><i className="fas fa-plus-circle"></i> Adicionar Itens</h3>
                
                <div className={styles.formGroup}>
                    <label>Buscar Item</label>
                    <input
                        type="text"
                        placeholder="Digite para buscar..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className={styles.input}
                    />
                </div>

                {busca && (
                    <div className={styles.itensDisponiveis}>
                        <h4>Itens Disponíveis</h4>
                        {itensDisponiveis.length === 0 ? (
                            <p className={styles.vazio}>Nenhum item encontrado</p>
                        ) : (
                            <div className={styles.itensGrid}>
                                {itensDisponiveis.map(item => (
                                    <div key={item.id} className={styles.itemDisponivel}>
                                        <div>
                                            <strong>{item.nome}</strong>
                                            <small>{item.unidade}</small>
                                        </div>
                                        <button
                                            onClick={() => adicionarItem(item)}
                                            className={styles.btnAdd}
                                        >
                                            <i className="fas fa-plus"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className={styles.divider}></div>

                <h3><i className="fas fa-list"></i> Itens Selecionados ({itensSelecionados.length})</h3>

                {itensSelecionados.length === 0 ? (
                    <p className={styles.vazio}>Nenhum item selecionado ainda</p>
                ) : (
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Unidade</th>
                                    <th>Prioridade</th>
                                    <th>Observação</th>
                                    <th style={{width: '80px'}}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {itensSelecionados.map((item, index) => (
                                    <tr key={index}>
                                        <td><strong>{item.item_nome}</strong></td>
                                        <td>{item.item_unidade}</td>
                                        <td>
                                            <select
                                                value={item.prioridade}
                                                onChange={(e) => {
                                                    const novos = [...itensSelecionados];
                                                    novos[index].prioridade = e.target.value as any;
                                                    setItensSelecionados(novos);
                                                }}
                                                className={styles.selectPrioridade}
                                            >
                                                <option value="prevencao">🟢 Prevenção</option>
                                                <option value="precisa_comprar">🟡 Precisa Comprar</option>
                                                <option value="urgente">🔴 Urgente</option>
                                            </select>
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={item.observacao}
                                                onChange={(e) => {
                                                    const novos = [...itensSelecionados];
                                                    novos[index].observacao = e.target.value;
                                                    setItensSelecionados(novos);
                                                }}
                                                className={styles.inputObs}
                                                placeholder="Observação..."
                                            />
                                        </td>
                                        <td style={{textAlign: 'center'}}>
                                            <button
                                                onClick={() => removerItem(index)}
                                                className={styles.btnRemove}
                                                title="Remover item"
                                            >
                                                <i className="fas fa-trash-alt"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className={styles.actions}>
                    <button onClick={() => navigate('/collaborator/minhas-listas-rapidas')} className={styles.btnSecondary}>
                        Cancelar
                    </button>
                    <button onClick={salvar} className={styles.btnPrimary}>
                        <i className="fas fa-save"></i> Salvar Alterações
                    </button>
                    <button onClick={submeter} className={styles.btnSuccess}>
                        <i className="fas fa-paper-plane"></i> Submeter para Aprovação
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditarListaRapida;
