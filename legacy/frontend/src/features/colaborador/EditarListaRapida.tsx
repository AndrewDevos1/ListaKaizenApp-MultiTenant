import React, { useCallback, useEffect, useState } from 'react';
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
    item_global_id?: number;  // Optional para itens temporários
    item_nome: string;
    item_unidade: string;
    prioridade: 'prevencao' | 'precisa_comprar' | 'urgente';
    observacao: string;
    is_temporario?: boolean;  // Flag para identificar itens temporários
    cadastrar_no_sistema?: boolean;  // Flag para identificar sugestões
}

const EditarListaRapida: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [nome, setNome] = useState('');
    const [descricao, setDescricao] = useState('');
    const [status, setStatus] = useState('');
    const [busca, setBusca] = useState('');
    const [itensGlobais, setItensGlobais] = useState<ItemGlobal[]>([]);
    const [itensSelecionados, setItensSelecionados] = useState<ItemSelecionado[]>([]);
    const [loading, setLoading] = useState(true);

    // Estados para o modal de sugestão
    const [mostrarModalSugestao, setMostrarModalSugestao] = useState(false);
    const [novoItemNome, setNovoItemNome] = useState('');
    const [novoItemUnidade, setNovoItemUnidade] = useState('');
    const [cadastrarNoSistema, setCadastrarNoSistema] = useState(true);

    const carregarDados = useCallback(async () => {
        try {
            console.log('[EditarListaRapida] Carregando dados...');
            const listaRes = await api.get(`/auth/listas-rapidas/${id}`);
            const lista = listaRes.data;
            
            setNome(lista.nome);
            setDescricao(lista.descricao || '');
            setStatus(lista.status);

            // Verifica se pode editar
            if (lista.status === 'aprovada') {
                alert('⚠️ Esta lista já foi aprovada e não pode mais ser editada');
                navigate('/collaborator/minhas-listas-rapidas');
                return;
            }

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
            const itens = Array.isArray(itensRes.data) ? itensRes.data : [];
            setItensGlobais(itens);
        } catch (error) {
            console.error('[EditarListaRapida] Erro:', error);
            alert('Erro ao carregar dados');
            navigate('/collaborator/minhas-listas-rapidas');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        carregarDados();
    }, [carregarDados]);

    // Função para normalizar string (remove acentos e converte para minúsculas)
    const normalizarString = (str: string): string => {
        return str
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    };

    const itensDisponiveis = itensGlobais.filter(item => 
        normalizarString(item.nome).includes(normalizarString(busca)) &&
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
            item_nome: novoItemNome.trim(),
            item_unidade: novoItemUnidade.trim(),
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
            ? '✅ Item adicionado! Será enviado para aprovação do admin ao salvar a lista.'
            : '✅ Item temporário adicionado à lista!');
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

            // Separar novos itens por tipo
            const novosItens = itensSelecionados.filter(item => !item.id);
            const itensDoCatalogo = novosItens.filter(item => item.item_global_id);
            const itensTemporarios = novosItens.filter(item => item.is_temporario);
            const sugestoes = novosItens.filter(item => item.cadastrar_no_sistema);

            // Adicionar itens do catálogo global
            if (itensDoCatalogo.length > 0) {
                const itensParaAdicionar = itensDoCatalogo.map(item => ({
                    item_global_id: item.item_global_id,
                    nome: item.item_nome,
                    unidade: item.item_unidade,
                    prioridade: item.prioridade,
                    observacao: item.observacao || ''
                }));
                await api.post(`/auth/listas-rapidas/${id}/itens`, { itens: itensParaAdicionar });
            }

            // Adicionar itens temporários
            for (const item of itensTemporarios) {
                await api.post(`/auth/listas-rapidas/${id}/itens/temporario`, {
                    nome_item: item.item_nome,
                    unidade: item.item_unidade,
                    prioridade: item.prioridade,
                    observacao: item.observacao || ''
                });
            }

            // Criar sugestões
            for (const item of sugestoes) {
                await api.post('/auth/sugestoes', {
                    lista_rapida_id: parseInt(id!),
                    nome_item: item.item_nome,
                    unidade: item.item_unidade,
                    quantidade: 1,
                    mensagem_usuario: `Item sugerido durante edição de lista rápida`
                });
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h4>Itens Disponíveis</h4>
                            <button
                                type="button"
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
                                        <td>
                                            <strong>{item.item_nome}</strong>
                                            {item.is_temporario && (
                                                <span style={{
                                                    marginLeft: '8px',
                                                    padding: '2px 6px',
                                                    backgroundColor: '#ffc107',
                                                    color: '#000',
                                                    borderRadius: '3px',
                                                    fontSize: '10px',
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
                                                    fontSize: '10px',
                                                    fontWeight: 'bold'
                                                }}>
                                                    SUGESTÃO
                                                </span>
                                            )}
                                        </td>
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
                    {status === 'rascunho' && (
                        <>
                            <button onClick={salvar} className={styles.btnPrimary}>
                                <i className="fas fa-save"></i> Salvar Alterações
                            </button>
                            <button onClick={submeter} className={styles.btnSuccess}>
                                <i className="fas fa-paper-plane"></i> Submeter para Aprovação
                            </button>
                        </>
                    )}
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

export default EditarListaRapida;
