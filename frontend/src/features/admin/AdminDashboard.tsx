import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Col, Row } from 'react-bootstrap';
import Layout from '../../components/Layout';

const AdminDashboard: React.FC = () => {
    const managementOptions = [
        {
            title: 'Gestão de Usuários',
            link: '/admin/users',
            icon: 'fa-users-cog',
            description: 'Adicione, edite ou remova usuários do sistema.'
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
            title: 'Gerar Nova Cotação',
            link: '/admin/gerar-cotacao',
            icon: 'fa-plus-circle',
            description: 'Inicie um novo processo de cotação de preços.'
        },
        {
            title: 'Visualizar Cotações',
            link: '/admin/cotacoes',
            icon: 'fa-chart-pie',
            description: 'Acompanhe o andamento e os resultados das cotações.'
        }
    ];

    return (
        <Layout title="Dashboard do Administrador">
            <Row className="g-4">
                {managementOptions.map((option, index) => (
                    <Col md={6} lg={4} key={index}>
                        <Card as={Link} to={option.link} className="h-100 text-decoration-none text-dark">
                            <Card.Body className="text-center">
                                <i className={`fas ${option.icon} fa-3x text-primary mb-3`}></i>
                                <Card.Title>{option.title}</Card.Title>
                                <Card.Text>{option.description}</Card.Text>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>
        </Layout>
    );
};

export default AdminDashboard;
