import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Col, Row } from 'react-bootstrap';
import GlobalDashboard from '../dashboard/GlobalDashboard';

const AdminDashboard: React.FC = () => {

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

            <GlobalDashboard />

            <hr className="my-4" />

            <h3 className="fs-4 mb-3">Opções de Gerenciamento</h3>
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
        </div>
    );
};

export default AdminDashboard;