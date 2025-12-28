import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import styles from './MinhasListasRapidas.module.css';

interface ListaRapida {
    id: number;
    nome: string;
    descricao: string | null;
    status: string;
    total_itens: number;
    itens_urgentes: number;
    criado_em: string;
    submetido_em: string | null;
    respondido_em: string | null;
    mensagem_admin: string | null;
}

const MinhasListasRapidas: React.FC = () => {
    const navigate = useNavigate();
    const [listas, setListas] = useState<ListaRapida[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        carregarListas();
    }, []);

    const carregarListas = async () => {
        try {
            const response = await api.get('/auth/listas-rapidas');
            setListas(response.data.listas);
        } catch (error) {
            console.error('[MinhasListasRapidas] Erro:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'rascunho':
                return <span className={`${styles.badge} ${styles.rascunho}`}>📝 Rascunho</span>;
            case 'pendente':
                return <span className={`${styles.badge} ${styles.pendente}`}>⏳ Pendente</span>;
            case 'aprovada':
                return <span className={`${styles.badge} ${styles.aprovada}`}>✅ Aprovada</span>;
            case 'rejeitada':
                return <span className={`${styles.badge} ${styles.rejeitada}`}>❌ Rejeitada</span>;
            default:
                return <span className={styles.badge}>{status}</span>;
        }
    };

    const deletarLista = async (id: number) => {
        if (!window.confirm('Deseja realmente deletar esta lista?')) return;

        try {
            await api.delete(`/auth/listas-rapidas/${id}`);
            alert('Lista deletada com sucesso!');
            carregarListas();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Erro ao deletar lista');
        }
    };

    if (loading) {
        return <div className={styles.loading}>Carregando...</div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1><i className="fas fa-bolt"></i> Minhas Listas Rápidas</h1>
                <button className={styles.btnNova} onClick={() => navigate('/collaborator/lista-rapida/criar')}>
                    <i className="fas fa-plus"></i> Nova Lista
                </button>
            </div>

            {listas.length === 0 ? (
                <div className={styles.vazio}>
                    <i className="fas fa-inbox fa-3x"></i>
                    <p>Você ainda não criou nenhuma lista rápida.</p>
                    <button className={styles.btnCriar} onClick={() => navigate('/collaborator/lista-rapida/criar')}>
                        Criar Primeira Lista
                    </button>
                </div>
            ) : (
                <div className={styles.grid}>
                    {listas.map(lista => (
                        <div key={lista.id} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <h3>{lista.nome}</h3>
                                {getStatusBadge(lista.status)}
                            </div>

                            {lista.descricao && (
                                <p className={styles.descricao}>{lista.descricao}</p>
                            )}

                            <div className={styles.stats}>
                                <div className={styles.stat}>
                                    <i className="fas fa-box"></i>
                                    <span>{lista.total_itens} itens</span>
                                </div>
                                {lista.itens_urgentes > 0 && (
                                    <div className={`${styles.stat} ${styles.urgente}`}>
                                        <i className="fas fa-exclamation-circle"></i>
                                        <span>{lista.itens_urgentes} urgentes</span>
                                    </div>
                                )}
                            </div>

                            <div className={styles.datas}>
                                <small>Criada: {new Date(lista.criado_em).toLocaleDateString('pt-BR')}</small>
                                {lista.submetido_em && (
                                    <small>Submetida: {new Date(lista.submetido_em).toLocaleDateString('pt-BR')}</small>
                                )}
                            </div>

                            {lista.mensagem_admin && (
                                <div className={styles.mensagemAdmin}>
                                    <strong>Resposta do Admin:</strong>
                                    <p>{lista.mensagem_admin}</p>
                                </div>
                            )}

                            <div className={styles.acoes}>
                                {lista.status === 'rascunho' && (
                                    <>
                                        <button
                                            className={styles.btnEditar}
                                            onClick={() => navigate(`/collaborator/lista-rapida/${lista.id}/editar`)}
                                        >
                                            <i className="fas fa-edit"></i> Editar
                                        </button>
                                        <button
                                            className={styles.btnDeletar}
                                            onClick={() => deletarLista(lista.id)}
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </>
                                )}
                                {lista.status !== 'rascunho' && (
                                    <button 
                                        className={styles.btnVisualizar}
                                        onClick={() => navigate(`/collaborator/lista-rapida/${lista.id}/detalhes`)}
                                    >
                                        <i className="fas fa-eye"></i> Visualizar
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MinhasListasRapidas;
