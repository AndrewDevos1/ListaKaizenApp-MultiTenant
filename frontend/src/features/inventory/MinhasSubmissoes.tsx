import React, { useState, useEffect, useMemo } from 'react';
import { Table, Alert, Form, Badge, Card, Container, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faClipboardList, faCheckCircle, faTimesCircle, faClock } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import CustomSpinner from '../../components/Spinner';

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
                const response = await api.get('/v1/submissoes/me');
                setSubmissoes(response.data);
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
            case 'APROVADO': return 'success';
            case 'REJEITADO': return 'danger';
            case 'PARCIALMENTE_APROVADO': return 'info';
            default: return 'secondary';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PENDENTE': return faClock;
            case 'APROVADO': return faCheckCircle;
            case 'REJEITADO': return faTimesCircle;
            default: return faClipboardList;
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
        <Container fluid className="py-4">
            {/* Header */}
            <div className="mb-4">
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
            <Form.Group className="mb-4">
                <Form.Label>Filtrar por Status:</Form.Label>
                <Form.Select 
                    value={filterStatus} 
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{ maxWidth: '250px' }}
                >
                    <option value="TODOS">Todos</option>
                    <option value="PENDENTE">Pendente</option>
                    <option value="APROVADO">Aprovado</option>
                    <option value="REJEITADO">Rejeitado</option>
                    <option value="PARCIALMENTE_APROVADO">Parcialmente Aprovado</option>
                </Form.Select>
            </Form.Group>

            {/* Tabela de Submissões (LISTA, não cards) */}
            {filteredSubmissoes.length === 0 ? (
                <Alert variant="info" className="text-center py-5">
                    <FontAwesomeIcon icon={faClipboardList} size="3x" className="mb-3 d-block" />
                    <h5>Nenhuma submissão encontrada</h5>
                    <p className="text-muted">Você ainda não submeteu nenhuma lista.</p>
                </Alert>
            ) : (
                <Table striped bordered hover responsive>
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
                                        onClick={() => navigate(`/collaborator/submissions/${submissao.id}`)}
                                    >
                                        <FontAwesomeIcon icon={faClipboardList} /> Ver Detalhes
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}
        </Container>
    );
};

export default MinhasSubmissoes;
