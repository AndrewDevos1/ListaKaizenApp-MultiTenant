import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, Col, Row, Spinner, Alert } from 'react-bootstrap';
import Layout from '../../components/Layout';
import { api } from '../../services/api';

interface SummaryData {
  total_usuarios: number;
  usuarios_pendentes: number;
  total_listas: number;
}

const AdminDashboard: React.FC = () => {
    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                setIsLoading(true);
                const response = await api.get('/admin/dashboard-summary');
                setSummary(response.data);
                setError(null);
            } catch (err) {
                setError('Falha ao carregar o resumo do dashboard.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSummary();
    }, []);

    const managementOptions = [
        {
            title: 'Gestão de Usuários',
            link: '/admin/users',
            icon: 'fa-users-cog',
            description: 'Aprove, edite ou adicione novos usuários ao sistema.'
        },
        {
            title: 'Gestão de Listas',
            link: '/admin/listas',
            icon: 'fa-list-alt',
            description: 'Crie listas de compras e atribua a colaboradores.'
        },
        {
            title: 'Gestão de Itens',
            link: '/admin/items',
            icon: 'fa-boxes',
            description: 'Gerencie os itens disponíveis para cotação e pedidos.'
        },
        {
            title: 'Gestão de Áreas',
            link: '/admin/areas',
            icon: 'fa-map-marker-alt',
            description: 'Configure as áreas ou setores que podem solicitar itens.'
        },
        {
            title: 'Gestão de Fornecedores',
            link: '/admin/fornecedores',
            icon: 'fa-truck',
            description: 'Mantenha o cadastro de fornecedores atualizado.'
        },
        {
            title: 'Visualizar Cotações',
            link: '/admin/cotacoes',
            icon: 'fa-chart-pie',
            description: 'Acompanhe o andamento e os resultados das cotações.'
        }
    ];

    return (
        <Layout>
            <h2 className="fs-2 mb-4">Dashboard do Administrador</h2>

            {/* Resumo do Sistema */}
            {isLoading ? (
                <div className="text-center">
                    <Spinner animation="border" role="status">
                        <span className="visually-hidden">Carregando...</span>
                    </Spinner>
                </div>
            ) : error ? (
                <Alert variant="danger">{error}</Alert>
            ) : summary && (
                <Row className="g-4 mb-4">
                    <Col md={4}>
                        <Card className="p-3">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <Card.Title as="h3" className="mb-0">{summary.total_usuarios}</Card.Title>
                                        <p className="text-muted mb-0">Total de Usuários</p>
                                    </div>
                                    <i className="fas fa-users fa-2x text-primary"></i>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={4}>
                        <Card className="p-3">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <Card.Title as="h3" className="mb-0">{summary.usuarios_pendentes}</Card.Title>
                                        <p className="text-muted mb-0">Usuários Pendentes</p>
                                    </div>
                                    <i className="fas fa-user-clock fa-2x text-warning"></i>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={4}>
                        <Card className="p-3">
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <Card.Title as="h3" className="mb-0">{summary.total_listas}</Card.Title>
                                        <p className="text-muted mb-0">Listas de Compras</p>
                                    </div>
                                    <i className="fas fa-list-alt fa-2x text-success"></i>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Opções de Gerenciamento */}
            <Row className="g-4">
                {managementOptions.map((option, index) => (
                    <Col md={6} lg={4} key={index}>
                        <Card as={Link} to={option.link} className="h-100 text-decoration-none text-dark shadow-sm">
                            <Card.Body className="text-center">
                                <i className={`fas ${option.icon} fa-3x text-primary mb-3`}></i>
                                <Card.Title>{option.title}</Card.Title>
                                <Card.Text className="small text-muted">{option.description}</Card.Text>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>
        </Layout>
    );
};

export default AdminDashboard;
