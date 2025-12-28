import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import styles from './DetalhesListaRapida.module.css';

interface ItemListaRapida {
    id: number;
    item_nome: string;
    item_unidade: string;
    prioridade: string;
    observacao: string | null;
}

interface ListaRapida {
    id: number;
    nome: string;
    descricao: string | null;
    status: string;
    criado_em: string;
    submetido_em: string | null;
    respondido_em: string | null;
    mensagem_admin: string | null;
    itens: ItemListaRapida[];
}

const DetalhesListaRapida: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [lista, setLista] = useState<ListaRapida | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        carregarDetalhes();
    }, [id]);

    const carregarDetalhes = async () => {
        try {
            const response = await api.get(`/auth/listas-rapidas/${id}`);
            setLista(response.data);
        } catch (error) {
            console.error('[DetalhesListaRapida] Erro:', error);
            alert('Erro ao carregar detalhes da lista');
            navigate('/collaborator/minhas-listas-rapidas');
        } finally {
            setLoading(false);
        }
    };

    const getPrioridadeBadge = (prioridade: string) => {
        switch (prioridade) {
            case 'prevencao':
                return <span className={`${styles.badge} ${styles.prevencao}`}>🟢 Prevenção</span>;
            case 'precisa_comprar':
                return <span className={`${styles.badge} ${styles.precisaComprar}`}>🟡 Precisa Comprar</span>;
            case 'urgente':
                return <span className={`${styles.badge} ${styles.urgente}`}>🔴 Urgente</span>;
            default:
                return <span className={styles.badge}>{prioridade}</span>;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'rascunho':
                return <span className={`${styles.statusBadge} ${styles.rascunho}`}>📝 Rascunho</span>;
            case 'pendente':
                return <span className={`${styles.statusBadge} ${styles.pendente}`}>⏳ Pendente</span>;
            case 'aprovada':
                return <span className={`${styles.statusBadge} ${styles.aprovada}`}>✅ Aprovada</span>;
            case 'rejeitada':
                return <span className={`${styles.statusBadge} ${styles.rejeitada}`}>❌ Rejeitada</span>;
            default:
                return <span className={styles.statusBadge}>{status}</span>;
        }
    };

    if (loading) {
        return <div className={styles.loading}>Carregando...</div>;
    }

    if (!lista) {
        return <div className={styles.erro}>Lista não encontrada</div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button className={styles.btnVoltar} onClick={() => navigate('/collaborator/minhas-listas-rapidas')}>
                    <i className="fas fa-arrow-left"></i> Voltar
                </button>
                <h1><i className="fas fa-bolt"></i> {lista.nome}</h1>
                {getStatusBadge(lista.status)}
            </div>

            {lista.descricao && (
                <div className={styles.descricao}>
                    <p>{lista.descricao}</p>
                </div>
            )}

            <div className={styles.info}>
                <div className={styles.infoItem}>
                    <strong>Criada em:</strong>
                    <span>{new Date(lista.criado_em).toLocaleString('pt-BR')}</span>
                </div>
                {lista.submetido_em && (
                    <div className={styles.infoItem}>
                        <strong>Submetida em:</strong>
                        <span>{new Date(lista.submetido_em).toLocaleString('pt-BR')}</span>
                    </div>
                )}
                {lista.respondido_em && (
                    <div className={styles.infoItem}>
                        <strong>Respondida em:</strong>
                        <span>{new Date(lista.respondido_em).toLocaleString('pt-BR')}</span>
                    </div>
                )}
            </div>

            {lista.mensagem_admin && (
                <div className={styles.mensagemAdmin}>
                    <h3><i className="fas fa-comment-alt"></i> Resposta do Administrador</h3>
                    <p>{lista.mensagem_admin}</p>
                </div>
            )}

            <div className={styles.itensSection}>
                <h2><i className="fas fa-list"></i> Itens ({lista.itens.length})</h2>
                {lista.itens.length === 0 ? (
                    <div className={styles.vazio}>Nenhum item nesta lista</div>
                ) : (
                    <div className={styles.itensGrid}>
                        {lista.itens.map(item => (
                            <div key={item.id} className={styles.itemCard}>
                                <div className={styles.itemHeader}>
                                    <h4>{item.item_nome}</h4>
                                    {getPrioridadeBadge(item.prioridade)}
                                </div>
                                <div className={styles.itemInfo}>
                                    <span className={styles.unidade}>
                                        <i className="fas fa-box"></i> {item.item_unidade}
                                    </span>
                                </div>
                                {item.observacao && (
                                    <div className={styles.observacao}>
                                        <strong>Obs:</strong> {item.observacao}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DetalhesListaRapida;
