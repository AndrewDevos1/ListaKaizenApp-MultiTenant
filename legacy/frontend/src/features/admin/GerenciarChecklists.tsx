import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Badge, Nav, ProgressBar, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faListCheck, faEye, faCheckCircle, faCircle } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import ResponsiveTable from '../../components/ResponsiveTable';
import { formatarDataHoraBrasilia } from '../../utils/dateFormatter';

interface Checklist {
    id: number;
    nome: string;
    status: 'ATIVO' | 'FINALIZADO';
    criado_em: string;
    finalizado_em?: string;
    total_itens: number;
    itens_marcados: number;
    progresso_percentual: number;
    submissao?: {
        lista: {
            nome: string;
        };
    };
}

type FiltroStatus = 'TODOS' | 'ATIVO' | 'FINALIZADO';
type Feedback = {
    variant: 'danger' | 'success' | 'info';
    message: string;
};

const GerenciarChecklists: React.FC = () => {
    const [checklists, setChecklists] = useState<Checklist[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('TODOS');
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const navigate = useNavigate();

    const fetchChecklists = useCallback(async () => {
        try {
            setLoading(true);
            const params = filtroStatus !== 'TODOS' ? { status: filtroStatus } : {};
            const response = await api.get('/admin/checklists', { params });
            setChecklists(response.data);
        } catch (error: any) {
            setFeedback({ variant: 'danger', message: 'Erro ao carregar checklists' });
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [filtroStatus]);

    useEffect(() => {
        fetchChecklists();
    }, [fetchChecklists]);

    const formatarData = (dataString: string) => {
        return formatarDataHoraBrasilia(dataString);
    };

    const getVariantProgresso = (percentual: number) => {
        if (percentual === 100) return 'success';
        if (percentual >= 50) return 'info';
        return 'warning';
    };

    return (
        <Container fluid className="py-4">
            <Row className="mb-4">
                <Col>
                    <div className="d-flex align-items-center gap-3">
                        <FontAwesomeIcon icon={faListCheck} size="2x" className="text-primary" />
                        <div>
                            <h2 className="mb-0">Checklists de Compras</h2>
                            <p className="text-muted mb-0">Gerencie seus checklists de compras</p>
                        </div>
                    </div>
                </Col>
            </Row>

            {feedback && (
                <Alert variant={feedback.variant} dismissible onClose={() => setFeedback(null)} className="mb-4">
                    {feedback.message}
                </Alert>
            )}

            {/* Tabs de Filtro */}
            <Card className="mb-4">
                <Card.Body>
                    <Nav variant="tabs" activeKey={filtroStatus} onSelect={(k) => setFiltroStatus(k as FiltroStatus)}>
                        <Nav.Item>
                            <Nav.Link eventKey="TODOS">Todos</Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="ATIVO">
                                <FontAwesomeIcon icon={faCircle} className="text-success me-2" />
                                Ativos
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                            <Nav.Link eventKey="FINALIZADO">
                                <FontAwesomeIcon icon={faCheckCircle} className="text-secondary me-2" />
                                Finalizados
                            </Nav.Link>
                        </Nav.Item>
                    </Nav>
                </Card.Body>
            </Card>

            {/* Tabela de Checklists */}
            <Card>
                <Card.Body>
                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Carregando...</span>
                            </div>
                        </div>
                    ) : checklists.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                            <FontAwesomeIcon icon={faListCheck} size="3x" className="mb-3" />
                            <p>Nenhum checklist encontrado</p>
                        </div>
                    ) : (
                        <ResponsiveTable
                            data={checklists}
                            columns={[
                                {
                                    header: 'Nome',
                                    accessor: (checklist: Checklist) => <strong>{checklist.nome}</strong>
                                },
                                {
                                    header: 'Lista Origem',
                                    accessor: (checklist: Checklist) =>
                                        checklist.submissao ? checklist.submissao.lista.nome : 'Lista Rápida',
                                    mobileLabel: 'Origem'
                                },
                                {
                                    header: 'Progresso',
                                    accessor: (checklist: Checklist) => (
                                        <div className="d-flex align-items-center gap-2">
                                            <ProgressBar
                                                now={checklist.progresso_percentual}
                                                variant={getVariantProgresso(checklist.progresso_percentual)}
                                                style={{ flex: 1, height: '20px', minWidth: '100px' }}
                                            />
                                            <span className="text-muted small">
                                                {checklist.itens_marcados}/{checklist.total_itens}
                                            </span>
                                        </div>
                                    )
                                },
                                {
                                    header: 'Status',
                                    accessor: (checklist: Checklist) => (
                                        <Badge bg={checklist.status === 'ATIVO' ? 'success' : 'secondary'}>
                                            {checklist.status}
                                        </Badge>
                                    )
                                },
                                {
                                    header: 'Criado em',
                                    accessor: (checklist: Checklist) => formatarData(checklist.criado_em),
                                    mobileLabel: 'Criado'
                                }
                            ]}
                            keyExtractor={(checklist) => checklist.id.toString()}
                            renderActions={(checklist) => (
                                <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => navigate(`/admin/checklists/${checklist.id}`)}
                                >
                                    <FontAwesomeIcon icon={faEye} className="me-1" />
                                    Ver Detalhes
                                </Button>
                            )}
                            emptyMessage="Nenhum checklist encontrado"
                        />
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
};

export default GerenciarChecklists;
