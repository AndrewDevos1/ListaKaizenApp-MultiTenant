
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, Col, Row } from 'react-bootstrap';
import { faUsers, faListAlt, faExclamationTriangle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import Widget from '../../components/Widget';
import ActivityChart from '../../components/ActivityChart';
import api from '../../services/api';

const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState({
        total_users: 0,
        total_lists: 0,
        pending_cotacoes: 0,
        completed_cotacoes: 0,
    });
    const [activityData, setActivityData] = useState({ labels: [], data: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsResponse, activityResponse] = await Promise.all([
                    api.get('/admin/dashboard-summary'),
                    api.get('/admin/activity-summary'),
                ]);
                setStats(prevStats => ({ ...prevStats, ...statsResponse.data }));
                setActivityData(activityResponse.data);
            } catch (error) {
                console.error('Failed to fetch dashboard data', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
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
        <div>
            <h2 className="fs-2 mb-4">Dashboard do Administrador</h2>

            {/* Widgets de Estatísticas */}
            <Row className="mb-4">
                <Col sm={6} lg={3}>
                    <Widget 
                        title="Total de Usuários" 
                        value={String(stats.total_users)} 
                        icon={faUsers} 
                        color="primary" 
                    />
                </Col>
                <Col sm={6} lg={3}>
                    <Widget 
                        title="Total de Listas" 
                        value={String(stats.total_lists)} 
                        icon={faListAlt} 
                        color="info" 
                    />
                </Col>
                <Col sm={6} lg={3}>
                    <Widget 
                        title="Cotações Pendentes" 
                        value={String(stats.pending_cotacoes)} 
                        icon={faExclamationTriangle} 
                        color="warning" 
                    />
                </Col>
                <Col sm={6} lg={3}>
                    <Widget 
                        title="Cotações Concluídas" 
                        value={String(stats.completed_cotacoes)} 
                        icon={faCheckCircle} 
                        color="success" 
                    />
                </Col>
            </Row>

            {/* Gráfico de Atividade */}
            <Row className="mb-4">
                <Col lg={12}>
                    <Card>
                        <Card.Body>
                            <ActivityChart data={activityData} />
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <hr className="my-4" />

            <h3 className="fs-4 mb-3">Opções de Gerenciamento</h3>
            {/* Opções de Gerenciamento */}
            <Row className="g-4">
                {managementOptions.map((option, index) => (
                    <Col md={6} lg={4} key={index}>
                        <Card as={Link} to={option.link} className="h-100 text-decoration-none text-dark shadow-sm card-hover">
                            <Card.Body className="text-center p-4">
                                <i className={`fas ${option.icon} fa-3x text-primary mb-3`}></i>
                                <Card.Title as="h5">{option.title}</Card.Title>
                                <Card.Text className="small text-muted">{option.description}</Card.Text>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>
        </div>
    );
};

export default AdminDashboard;
