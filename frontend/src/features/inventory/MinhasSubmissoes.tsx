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
        return <CustomSpinner />;
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

            {/* Submissões */}
            {filteredSubmissoes.length === 0 ? (
                <Alert variant="info" className="text-center">
                    <FontAwesomeIcon icon={faClipboardList} size="2x" className="mb-3" />
                    <p>Você ainda não fez nenhuma submissão.</p>
                </Alert>
            ) : (
                filteredSubmissoes.map((submissao) => (
                    <Card key={submissao.id} className="mb-4 shadow-sm">
                        <Card.Header className="bg-light">
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h5 className="mb-1">
                                        <FontAwesomeIcon icon={faClipboardList} className="me-2" />
                                        {submissao.lista_nome}
                                    </h5>
                                    <small className="text-muted">
                                        Submetido em: {formatarData(submissao.data_submissao)}
                                    </small>
                                </div>
                                <div className="text-end">
                                    <Badge 
                                        bg={getStatusVariant(submissao.status)} 
                                        className="mb-2"
                                        style={{ fontSize: '1rem' }}
                                    >
                                        <FontAwesomeIcon icon={getStatusIcon(submissao.status)} className="me-1" />
                                        {submissao.status}
                                    </Badge>
                                    <div>
                                        <small className="text-muted">
                                            {submissao.total_pedidos} item(ns) solicitado(s)
                                        </small>
                                    </div>
                                </div>
                            </div>
                        </Card.Header>
                        <Card.Body>
                            <Table striped bordered hover responsive size="sm" className="mb-0">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Item</th>
                                        <th className="text-center">Quantidade</th>
                                        <th className="text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {submissao.pedidos.map((pedido, idx) => (
                                        <tr key={pedido.id}>
                                            <td>{idx + 1}</td>
                                            <td>{pedido.item_nome}</td>
                                            <td className="text-center">
                                                {pedido.quantidade_solicitada} {pedido.unidade}
                                            </td>
                                            <td className="text-center">
                                                <Badge bg={getStatusVariant(pedido.status)}>
                                                    {pedido.status}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                ))
            )}
        </Container>
    );
};

export default MinhasSubmissoes;
