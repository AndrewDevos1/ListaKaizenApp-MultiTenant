import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import styles from './GerenciarListasRapidas.module.css';

interface ListaRapida {
    id: number;
    nome: string;
    descricao: string | null;
    usuario_nome: string;
    total_itens: number;
    itens_urgentes: number;
    criado_em: string;
    submetido_em: string | null;
}

interface ItemLista {
    id: number;
    item_nome: string;
    item_unidade: string;
    prioridade: string;
    observacao: string | null;
}

interface ListaDetalhes extends ListaRapida {
    itens: ItemLista[];
}

const GerenciarListasRapidas: React.FC = () => {
    const [listas, setListas] = useState<ListaRapida[]>([]);
    const [listaDetalhes, setListaDetalhes] = useState<ListaDetalhes | null>(null);
    const [modalAberto, setModalAberto] = useState(false);
    const [mensagemAdmin, setMensagemAdmin] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        carregarListasPendentes();
    }, []);

    const carregarListasPendentes = async () => {
        try {
            const response = await api.get('/admin/listas-rapidas/pendentes');
            setListas(response.data.listas);
        } catch (error) {
            console.error('[GerenciarListasRapidas] Erro:', error);
        }
    };

    const abrirDetalhes = async (listaId: number) => {
        try {
            const response = await api.get(`/admin/listas-rapidas/${listaId}`);
            setListaDetalhes(response.data);
            setModalAberto(true);
            setMensagemAdmin('');
        } catch (error) {
            console.error('[GerenciarListasRapidas] Erro ao carregar detalhes:', error);
        }
    };

    const aprovar = async () => {
        if (!listaDetalhes) return;

        setLoading(true);
        try {
            await api.put(`/admin/listas-rapidas/${listaDetalhes.id}/aprovar`, {
                mensagem_admin: mensagemAdmin
            });
            alert('✅ Lista aprovada com sucesso!');
            setModalAberto(false);
            carregarListasPendentes();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Erro ao aprovar lista');
        } finally {
            setLoading(false);
        }
    };

    const rejeitar = async () => {
        if (!listaDetalhes) return;

        if (!mensagemAdmin.trim()) {
            alert('⚠️ Informe o motivo da rejeição!');
            return;
        }

        setLoading(true);
        try {
            await api.put(`/admin/listas-rapidas/${listaDetalhes.id}/rejeitar`, {
                mensagem_admin: mensagemAdmin
            });
            alert('❌ Lista rejeitada.');
            setModalAberto(false);
            carregarListasPendentes();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Erro ao rejeitar lista');
        } finally {
            setLoading(false);
        }
    };

    const getPrioridadeBadge = (prioridade: string) => {
        switch (prioridade) {
            case 'urgente':
                return <span className={`${styles.prioridade} ${styles.urgente}`}>🔴 Urgente</span>;
            case 'precisa_comprar':
                return <span className={`${styles.prioridade} ${styles.precisaComprar}`}>🟡 Precisa Comprar</span>;
            case 'prevencao':
                return <span className={`${styles.prioridade} ${styles.prevencao}`}>🟢 Prevenção</span>;
            default:
                return <span className={styles.prioridade}>{prioridade}</span>;
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1><i className="fas fa-tasks"></i> Gerenciar Listas Rápidas</h1>
                <div className={styles.contador}>
                    <span className={styles.badge}>{listas.length} pendentes</span>
                </div>
            </div>

            {listas.length === 0 ? (
                <div className={styles.vazio}>
                    <i className="fas fa-check-circle fa-3x"></i>
                    <p>Nenhuma lista rápida pendente de aprovação! 🎉</p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {listas.map(lista => (
                        <div key={lista.id} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <div>
                                    <h3>{lista.nome}</h3>
                                    <small className={styles.usuario}>
                                        <i className="fas fa-user"></i> {lista.usuario_nome}
                                    </small>
                                </div>
                                {lista.itens_urgentes > 0 && (
                                    <span className={styles.urgenteBadge}>
                                        {lista.itens_urgentes} urgentes!
                                    </span>
                                )}
                            </div>

                            {lista.descricao && (
                                <p className={styles.descricao}>{lista.descricao}</p>
                            )}

                            <div className={styles.stats}>
                                <div className={styles.stat}>
                                    <i className="fas fa-box"></i>
                                    <span>{lista.total_itens} itens</span>
                                </div>
                                <div className={styles.stat}>
                                    <i className="fas fa-calendar"></i>
                                    <span>{new Date(lista.submetido_em!).toLocaleDateString('pt-BR')}</span>
                                </div>
                            </div>

                            <button
                                className={styles.btnAnalisar}
                                onClick={() => abrirDetalhes(lista.id)}
                            >
                                <i className="fas fa-search"></i> Analisar Lista
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Detalhes */}
            {modalAberto && listaDetalhes && (
                <div className={styles.modalOverlay} onClick={() => setModalAberto(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>{listaDetalhes.nome}</h2>
                            <button
                                className={styles.btnFechar}
                                onClick={() => setModalAberto(false)}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            <div className={styles.infoLista}>
                                <div className={styles.infoItem}>
                                    <strong>Colaborador:</strong>
                                    <span>{listaDetalhes.usuario_nome}</span>
                                </div>
                                {listaDetalhes.descricao && (
                                    <div className={styles.infoItem}>
                                        <strong>Descrição:</strong>
                                        <span>{listaDetalhes.descricao}</span>
                                    </div>
                                )}
                                <div className={styles.infoItem}>
                                    <strong>Data de Submissão:</strong>
                                    <span>{new Date(listaDetalhes.submetido_em!).toLocaleString('pt-BR')}</span>
                                </div>
                            </div>

                            <div className={styles.itensLista}>
                                <h3>Itens Solicitados ({listaDetalhes.itens.length})</h3>
                                <div className={styles.tabelaItens}>
                                    {listaDetalhes.itens.map((item) => (
                                        <div key={item.id} className={styles.itemRow}>
                                            <div className={styles.itemNome}>
                                                <strong>{item.item_nome}</strong>
                                                <span className={styles.unidade}>{item.item_unidade}</span>
                                            </div>
                                            <div className={styles.itemPrioridade}>
                                                {getPrioridadeBadge(item.prioridade)}
                                            </div>
                                            {item.observacao && (
                                                <div className={styles.itemObs}>
                                                    <i className="fas fa-comment"></i> {item.observacao}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.mensagemForm}>
                                <label>Mensagem ao Colaborador (opcional para aprovar, obrigatória para rejeitar)</label>
                                <textarea
                                    value={mensagemAdmin}
                                    onChange={(e) => setMensagemAdmin(e.target.value)}
                                    placeholder="Explique sua decisão..."
                                    rows={4}
                                />
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            <button
                                className={styles.btnRejeitar}
                                onClick={rejeitar}
                                disabled={loading}
                            >
                                <i className="fas fa-times-circle"></i>
                                {loading ? 'Rejeitando...' : 'Rejeitar'}
                            </button>
                            <button
                                className={styles.btnAprovar}
                                onClick={aprovar}
                                disabled={loading}
                            >
                                <i className="fas fa-check-circle"></i>
                                {loading ? 'Aprovando...' : 'Aprovar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GerenciarListasRapidas;
