import React, { useState, useEffect } from 'react';
import { Container, Button, Table, Alert, Badge, ButtonGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft,
    faCheckCircle,
    faTimesCircle,
    faClock,
    faEye,
    faBox,
} from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import styles from './GerenciarSubmissoes.module.css';

interface Submissao {
    id: number;
    lista_id: number;
    lista_nome: string;
    usuario_id: number;
    usuario_nome: string;
    data_submissao: string;
    status: 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'PARCIALMENTE_APROVADO';
    total_pedidos: number;
    tipo_lista?: 'LISTA_TRADICIONAL' | 'LISTA_RAPIDA';
}

type StatusFilter = 'TODOS' | 'PENDENTE' | 'APROVADO' | 'REJEITADO';

const GerenciarSubmissoes: React.FC = () => {
    const [submissoes, setSubmissoes] = useState<Submissao[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDENTE');
    const navigate = useNavigate();

    useEffect(() => {
        fetchSubmissoes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter]);

    const fetchSubmissoes = async () => {
        try {
            setLoading(true);
            setError('');

            const url = statusFilter === 'TODOS'
                ? '/admin/submissoes'
                : `/admin/submissoes?status=${statusFilter}`;

            const response = await api.get(url);
            setSubmissoes(response.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao carregar submissões');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDENTE':
                return <Badge bg="warning"><FontAwesomeIcon icon={faClock} /> Pendente</Badge>;
            case 'APROVADO':
                return <Badge bg="success"><FontAwesomeIcon icon={faCheckCircle} /> Aprovado</Badge>;
            case 'REJEITADO':
                return <Badge bg="danger"><FontAwesomeIcon icon={faTimesCircle} /> Rejeitado</Badge>;
            case 'PARCIALMENTE_APROVADO':
                return <Badge bg="info"><FontAwesomeIcon icon={faCheckCircle} /> Parcial</Badge>;
            default:
                return <Badge bg="secondary">{status}</Badge>;
        }
    };

    const formatarData = (dataISO: string) => {
        const data = new Date(dataISO);
        return data.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleVerDetalhes = (submissao: Submissao) => {
        // Rotear baseado no tipo de lista
        if (submissao.tipo_lista === 'LISTA_RAPIDA') {
            navigate(`/admin/listas-rapidas/${submissao.id}`);
        } else {
            navigate(`/admin/submissoes/${submissao.id}`);
        }
    };

    if (loading) {
        return (
            <Container className="mt-4">
                <div className="text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Carregando...</span>
                    </div>
                </div>
            </Container>
        );
    }

    return (
        <Container fluid className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h2>
                        <FontAwesomeIcon icon={faBox} className="me-2" />
                        Gerenciar Submissões
                    </h2>
                    <p className="text-muted">
                        Visualizar e aprovar submissões de listas de reposição
                    </p>
                </div>
                <Link to="/admin">
                    <Button variant="outline-secondary">
                        <FontAwesomeIcon icon={faArrowLeft} /> Voltar
                    </Button>
                </Link>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            {/* Filtros */}
            <div className={styles.filters}>
                <ButtonGroup>
                    <Button
                        variant={statusFilter === 'TODOS' ? 'primary' : 'outline-primary'}
                        onClick={() => setStatusFilter('TODOS')}
                    >
                        Todos
                    </Button>
                    <Button
                        variant={statusFilter === 'PENDENTE' ? 'warning' : 'outline-warning'}
                        onClick={() => setStatusFilter('PENDENTE')}
                    >
                        <FontAwesomeIcon icon={faClock} /> Pendentes
                    </Button>
                    <Button
                        variant={statusFilter === 'APROVADO' ? 'success' : 'outline-success'}
                        onClick={() => setStatusFilter('APROVADO')}
                    >
                        <FontAwesomeIcon icon={faCheckCircle} /> Aprovados
                    </Button>
                    <Button
                        variant={statusFilter === 'REJEITADO' ? 'danger' : 'outline-danger'}
                        onClick={() => setStatusFilter('REJEITADO')}
                    >
                        <FontAwesomeIcon icon={faTimesCircle} /> Rejeitados
                    </Button>
                </ButtonGroup>
            </div>

            {/* Tabela Desktop */}
            <Table striped bordered hover responsive className={`${styles.table} ${styles.tableDesktop}`}>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Lista</th>
                        <th>Colaborador</th>
                        <th>Data/Hora</th>
                        <th className="text-center">Total Itens</th>
                        <th className="text-center">Status</th>
                        <th className="text-center">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {submissoes.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="text-center text-muted">
                                Nenhuma submissão encontrada
                            </td>
                        </tr>
                    ) : (
                        submissoes.map((sub) => (
                            <tr key={sub.id}>
                                <td>{sub.id}</td>
                                <td><strong>{sub.lista_nome}</strong></td>
                                <td>{sub.usuario_nome}</td>
                                <td>{formatarData(sub.data_submissao)}</td>
                                <td className="text-center">
                                    <Badge bg="secondary">{sub.total_pedidos}</Badge>
                                </td>
                                <td className="text-center">
                                    {getStatusBadge(sub.status)}
                                </td>
                                <td className="text-center">
                                    <Button
                                        size="sm"
                                        variant="primary"
                                        onClick={() => handleVerDetalhes(sub)}
                                    >
                                        <FontAwesomeIcon icon={faEye} /> Ver Detalhes
                                    </Button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </Table>

            {/* Cards Mobile */}
            <div className={styles.cardsMobile}>
                {submissoes.length === 0 ? (
                    <Alert variant="info" className="text-center">
                        Nenhuma submissão encontrada
                    </Alert>
                ) : (
                    submissoes.map((sub) => (
                        <div key={sub.id} className={styles.submissaoCard}>
                            <div className={styles.cardHeader}>
                                <h5 className={styles.cardTitle}>{sub.lista_nome}</h5>
                                <span className={styles.cardId}>#{sub.id}</span>
                            </div>
                            <div className={styles.cardRow}>
                                <span className={styles.cardLabel}>Colaborador</span>
                                <span className={styles.cardValue}>{sub.usuario_nome}</span>
                            </div>
                            <div className={styles.cardRow}>
                                <span className={styles.cardLabel}>Data/Hora</span>
                                <span className={styles.cardValue}>{formatarData(sub.data_submissao)}</span>
                            </div>
                            <div className={styles.cardRow}>
                                <span className={styles.cardLabel}>Total Itens</span>
                                <span className={styles.cardValue}>
                                    <Badge bg="secondary">{sub.total_pedidos}</Badge>
                                </span>
                            </div>
                            <div className={styles.cardRow}>
                                <span className={styles.cardLabel}>Status</span>
                                <span className={styles.cardValue}>
                                    {getStatusBadge(sub.status)}
                                </span>
                            </div>
                            <div className={styles.cardActions}>
                                <Button
                                    variant="primary"
                                    onClick={() => handleVerDetalhes(sub)}
                                >
                                    <FontAwesomeIcon icon={faEye} /> Ver Detalhes
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Container>
    );
};

export default GerenciarSubmissoes;
