import React, { useState, useEffect, useMemo } from 'react';
import { Table, Alert, Form, Badge, Container, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { formatarDataBrasilia, parseISODate } from '../../utils/dateFormatter';
import { faArrowLeft, faClipboardList, faCheckCircle, faTimesCircle, faClock } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import CustomSpinner from '../../components/Spinner';
import styles from './MinhasSubmissoes.module.css';

interface Pedido {
    id: number;
    item_nome: string;
    quantidade_solicitada: number;
    status: string;
    unidade: string;
}

interface Submissao {
    id: number;
    lista_id: number;
    lista_nome: string;
    data_submissao: string;
    status: string;
    total_pedidos: number;
    pedidos: Pedido[];
    tipo?: 'normal' | 'rapida'; // Tipo de lista
}

const MinhasSubmissoes: React.FC = () => {
    const navigate = useNavigate();
    const [submissoes, setSubmissoes] = useState<Submissao[]>([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('TODOS');

    useEffect(() => {
        const fetchSubmissoes = async () => {
            setIsLoading(true);
            try {
                // Buscar submissões normais
                const responseSubmissoes = await api.get('/v1/submissoes/me');
                const submissoesNormais = responseSubmissoes.data.map((s: any) => ({
                    ...s,
                    tipo: 'normal' as const
                }));

                // Buscar listas rápidas submetidas
                const responseListasRapidas = await api.get('/auth/listas-rapidas');
                const listasRapidas = responseListasRapidas.data.listas
                    .filter((l: any) => l.status !== 'rascunho')
                    .map((l: any) => ({
                        id: l.id,
                        lista_id: l.id,
                        lista_nome: `⚡ ${l.nome}`,
                        data_submissao: l.submetido_em || l.criado_em,
                        status: l.status.toUpperCase(), // Normalizar para maiúsculas
                        total_pedidos: l.total_itens || 0,
                        pedidos: [],
                        tipo: 'rapida' as const
                    }));

                // Combinar e ordenar por data
                const todasSubmissoes = [...submissoesNormais, ...listasRapidas]
                    .sort((a, b) => parseISODate(b.data_submissao).getTime() - parseISODate(a.data_submissao).getTime());
                
                setSubmissoes(todasSubmissoes);
            } catch (err) {
                setError('Não foi possível carregar suas submissões.');
                console.error('Erro ao buscar submissões:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSubmissoes();
    }, []);

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'PENDENTE': return 'warning';
            case 'APROVADO':
            case 'APROVADA': return 'success';
            case 'REJEITADO':
            case 'REJEITADA': return 'danger';
            case 'PARCIALMENTE_APROVADO': return 'info';
            default: return 'secondary';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PENDENTE': return faClock;
            case 'APROVADO':
            case 'APROVADA': return faCheckCircle;
            case 'REJEITADO':
            case 'REJEITADA': return faTimesCircle;
            default: return faClipboardList;
        }
    };

    const formatarData = (dataISO: string) => {
        return formatarDataBrasilia(dataISO);
    };

    const filteredSubmissoes = useMemo(() => {
        if (filterStatus === 'TODOS') {
            return submissoes;
        }
        return submissoes.filter(sub => sub.status === filterStatus);
    }, [submissoes, filterStatus]);

    if (isLoading) {
        return (
            <Container className="py-4">
                <CustomSpinner />
            </Container>
        );
    }

    return (
        <Container fluid className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => navigate('/collaborator')}
                    className="mb-3"
                >
                    <FontAwesomeIcon icon={faArrowLeft} /> Voltar ao Dashboard
                </Button>
                
                <h2>
                    <FontAwesomeIcon icon={faClipboardList} /> Minhas Submissões
                </h2>
                <p className="text-muted">
                    Histórico de listas submetidas e status de aprovação
                </p>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            {/* Filtro */}
            <Form.Group className={styles.filterGroup}>
                <Form.Label>Filtrar por Status:</Form.Label>
                <Form.Select 
                    value={filterStatus} 
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className={styles.filterSelect}
                >
                    <option value="TODOS">Todos</option>
                    <option value="PENDENTE">Pendente</option>
                    <option value="APROVADO">Aprovado</option>
                    <option value="REJEITADO">Rejeitado</option>
                    <option value="PARCIALMENTE_APROVADO">Parcialmente Aprovado</option>
                </Form.Select>
            </Form.Group>

            {/* Tabela Desktop */}
            {filteredSubmissoes.length === 0 ? (
                <Alert variant="info" className={`text-center py-5 ${styles.emptyState}`}>
                    <FontAwesomeIcon icon={faClipboardList} size="3x" className="mb-3 d-block" />
                    <h5>Nenhuma submissão encontrada</h5>
                    <p className="text-muted">Você ainda não submeteu nenhuma lista.</p>
                </Alert>
            ) : (
                <>
                    <Table striped bordered hover responsive className={styles.tableDesktop}>
                        <thead className="table-dark">
                            <tr>
                                <th>#</th>
                                <th>Lista</th>
                                <th>Data/Hora</th>
                                <th className="text-center">Total Itens</th>
                                <th className="text-center">Status</th>
                                <th className="text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSubmissoes.map((submissao) => (
                                <tr key={submissao.id}>
                                    <td>{submissao.id}</td>
                                    <td>
                                        <strong>{submissao.lista_nome}</strong>
                                        {submissao.tipo === 'rapida' && (
                                            <Badge bg="info" className="ms-2" style={{fontSize: '0.7rem'}}>
                                                RÁPIDA
                                            </Badge>
                                        )}
                                    </td>
                                    <td>{formatarData(submissao.data_submissao)}</td>
                                    <td className="text-center">
                                        <Badge bg="secondary">{submissao.total_pedidos}</Badge>
                                    </td>
                                    <td className="text-center">
                                        <Badge 
                                            bg={getStatusVariant(submissao.status)}
                                            style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                                        >
                                            <FontAwesomeIcon icon={getStatusIcon(submissao.status)} className="me-1" />
                                            {submissao.status}
                                        </Badge>
                                    </td>
                                    <td className="text-center">
                                        <Button
                                            size="sm"
                                            variant="primary"
                                            onClick={() => {
                                                if (submissao.tipo === 'rapida') {
                                                    navigate(`/collaborator/lista-rapida/${submissao.id}/detalhes`);
                                                } else {
                                                    navigate(`/collaborator/submissions/${submissao.id}`);
                                                }
                                            }}
                                        >
                                            <FontAwesomeIcon icon={faClipboardList} /> Ver Detalhes
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>

                    {/* Cards Mobile */}
                    <div className={styles.cardsMobile}>
                        {filteredSubmissoes.map((submissao) => (
                            <div key={submissao.id} className={styles.submissaoCard}>
                                <div className={styles.cardHeader}>
                                    <h5 className={styles.cardTitle}>
                                        {submissao.lista_nome}
                                        {submissao.tipo === 'rapida' && (
                                            <Badge bg="info" className="ms-2" style={{fontSize: '0.7rem'}}>
                                                RÁPIDA
                                            </Badge>
                                        )}
                                    </h5>
                                    <span className={styles.cardId}>#{submissao.id}</span>
                                </div>
                                <div className={styles.cardRow}>
                                    <span className={styles.cardLabel}>Data/Hora</span>
                                    <span className={styles.cardValue}>{formatarData(submissao.data_submissao)}</span>
                                </div>
                                <div className={styles.cardRow}>
                                    <span className={styles.cardLabel}>Total Itens</span>
                                    <span className={styles.cardValue}>
                                        <Badge bg="secondary">{submissao.total_pedidos}</Badge>
                                    </span>
                                </div>
                                <div className={styles.cardRow}>
                                    <span className={styles.cardLabel}>Status</span>
                                    <span className={styles.cardValue}>
                                        <Badge 
                                            bg={getStatusVariant(submissao.status)}
                                            style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                                        >
                                            <FontAwesomeIcon icon={getStatusIcon(submissao.status)} className="me-1" />
                                            {submissao.status}
                                        </Badge>
                                    </span>
                                </div>
                                <div className={styles.cardActions}>
                                    <Button
                                        variant="primary"
                                        onClick={() => {
                                            if (submissao.tipo === 'rapida') {
                                                navigate(`/collaborator/lista-rapida/${submissao.id}/detalhes`);
                                            } else {
                                                navigate(`/collaborator/submissions/${submissao.id}`);
                                            }
                                        }}
                                    >
                                        <FontAwesomeIcon icon={faClipboardList} /> Ver Detalhes
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </Container>
    );
};

export default MinhasSubmissoes;
