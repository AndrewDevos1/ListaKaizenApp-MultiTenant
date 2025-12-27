import React, { useState, useEffect } from 'react';
import { Card, Table, Spinner, Alert, Badge } from 'react-bootstrap';
import api from '../../services/api';
import styles from './MinhasSugestoes.module.css';

interface Sugestao {
    id: number;
    lista_nome: string;
    nome_item: string;
    unidade: string;
    quantidade: number;
    mensagem_usuario: string | null;
    status: 'pendente' | 'aprovada' | 'rejeitada';
    mensagem_admin: string | null;
    criado_em: string;
    respondido_em: string | null;
}

const MinhasSugestoes: React.FC = () => {
    const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchSugestoes();
    }, []);

    const fetchSugestoes = async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await api.get('/sugestoes/minhas');
            setSugestoes(response.data.sugestoes || []);
        } catch (err: any) {
            console.error('[MinhasSugestoes] Erro:', err);
            setError('Erro ao carregar sugestões.');
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pendente':
                return <Badge bg="warning">Pendente</Badge>;
            case 'aprovada':
                return <Badge bg="success">Aprovada</Badge>;
            case 'rejeitada':
                return <Badge bg="danger">Rejeitada</Badge>;
            default:
                return <Badge bg="secondary">{status}</Badge>;
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('pt-BR');
    };

    return (
        <div className={styles.container}>
            <h2 className="mb-4">Minhas Sugestões de Itens</h2>

            {error && <Alert variant="danger">{error}</Alert>}

            {isLoading ? (
                <div className="text-center py-5">
                    <Spinner animation="border" />
                    <p className="mt-2">Carregando sugestões...</p>
                </div>
            ) : sugestoes.length === 0 ? (
                <Alert variant="info">
                    Você ainda não enviou nenhuma sugestão de item.
                </Alert>
            ) : (
                <>
                    <Table striped bordered hover responsive>
                        <thead className="table-dark">
                            <tr>
                                <th>Lista</th>
                                <th>Item</th>
                                <th>Unidade</th>
                                <th>Qtd</th>
                                <th>Status</th>
                                <th>Data</th>
                                <th>Detalhes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sugestoes.map((sug) => (
                                <React.Fragment key={sug.id}>
                                    <tr>
                                        <td>{sug.lista_nome}</td>
                                        <td><strong>{sug.nome_item}</strong></td>
                                        <td>{sug.unidade}</td>
                                        <td>{sug.quantidade}</td>
                                        <td>{getStatusBadge(sug.status)}</td>
                                        <td>{formatDate(sug.criado_em)}</td>
                                        <td>
                                            {sug.mensagem_usuario && (
                                                <div className={styles.mensagem}>
                                                    <strong>Sua mensagem:</strong>
                                                    <p>{sug.mensagem_usuario}</p>
                                                </div>
                                            )}
                                            {sug.mensagem_admin && (
                                                <div className={styles.respostaAdmin}>
                                                    <strong>Resposta do Admin:</strong>
                                                    <p>{sug.mensagem_admin}</p>
                                                    <small className="text-muted">
                                                        {formatDate(sug.respondido_em)}
                                                    </small>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                </React.Fragment>
                            ))}
                        </tbody>
                    </Table>
                </>
            )}
        </div>
    );
};

export default MinhasSugestoes;
