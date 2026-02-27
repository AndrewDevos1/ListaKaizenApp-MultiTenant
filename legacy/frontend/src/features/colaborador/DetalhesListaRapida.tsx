import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { faCopy } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import { formatarDataBrasilia } from '../../utils/dateFormatter';
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

    const carregarDetalhes = useCallback(async () => {
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
    }, [id, navigate]);

    useEffect(() => {
        carregarDetalhes();
    }, [carregarDetalhes]);

    const handleCopiar = async () => {
        if (!lista) return;

        try {
            const response = await api.get(`/auth/listas-rapidas/${id}/whatsapp`);
            const texto = response.data.texto;

            await navigator.clipboard.writeText(texto);
            alert('✓ Texto copiado para a área de transferência!');
        } catch (error: any) {
            console.error('[DetalhesListaRapida] Erro ao copiar:', error);
            alert(error.response?.data?.error || 'Erro ao copiar texto');
        }
    };

    const handleWhatsApp = async () => {
        if (!lista) return;

        try {
            const response = await api.get(`/auth/listas-rapidas/${id}/whatsapp`);
            const texto = response.data.texto;

            // Copiar para clipboard
            await navigator.clipboard.writeText(texto);

            // Abrir WhatsApp Web com encoding que preserva emojis
            // Usando o construtor URL que faz encoding automático correto
            const url = new URL('https://wa.me/');
            url.searchParams.set('text', texto);
            window.open(url.toString(), '_blank');
        } catch (error: any) {
            console.error('[DetalhesListaRapida] Erro ao compartilhar WhatsApp:', error);
            alert(error.response?.data?.error || 'Erro ao compartilhar via WhatsApp');
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
                    <span>{formatarDataBrasilia(lista.criado_em)}</span>
                </div>
                {lista.submetido_em && (
                    <div className={styles.infoItem}>
                        <strong>Submetida em:</strong>
                        <span>{formatarDataBrasilia(lista.submetido_em)}</span>
                    </div>
                )}
                {lista.respondido_em && (
                    <div className={styles.infoItem}>
                        <strong>Respondida em:</strong>
                        <span>{formatarDataBrasilia(lista.respondido_em)}</span>
                    </div>
                )}
            </div>

            {lista.mensagem_admin && (
                <div className={styles.mensagemAdmin}>
                    <h3><i className="fas fa-comment-alt"></i> Resposta do Administrador</h3>
                    <p>{lista.mensagem_admin}</p>
                </div>
            )}

            {/* Botões de ação */}
            <div style={{ marginBottom: '1.5rem', textAlign: 'center', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                    onClick={handleCopiar}
                    style={{
                        backgroundColor: '#6c757d',
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5a6268'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6c757d'}
                >
                    <FontAwesomeIcon icon={faCopy} size="lg" />
                    Copiar Texto
                </button>
                <button
                    onClick={handleWhatsApp}
                    style={{
                        backgroundColor: '#25D366',
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#128C7E'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#25D366'}
                >
                    <FontAwesomeIcon icon={faWhatsapp} size="lg" />
                    Compartilhar via WhatsApp
                </button>
            </div>

            <div className={styles.itensSection}>
                <h2><i className="fas fa-list"></i> Itens ({lista.itens.length})</h2>
                {lista.itens.length === 0 ? (
                    <div className={styles.vazio}>Nenhum item nesta lista</div>
                ) : (
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Unidade</th>
                                    <th>Prioridade</th>
                                    <th>Observação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lista.itens.map(item => (
                                    <tr key={item.id}>
                                        <td><strong>{item.item_nome}</strong></td>
                                        <td>{item.item_unidade}</td>
                                        <td>{getPrioridadeBadge(item.prioridade)}</td>
                                        <td>{item.observacao || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DetalhesListaRapida;
