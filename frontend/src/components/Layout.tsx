import React from 'react';
import { Navbar, Nav, Container, Row, Col } from 'react-bootstrap';
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout: React.FC = () => {
    const { user, logout } = useAuth();

    return (
        <>
            <Navbar bg="dark" variant="dark" expand="lg">
                <Container>
                    <Navbar.Brand as={Link} to="/">Kaizen Lists</Navbar.Brand>
                    <Nav className="ms-auto">
                        <Nav.Link onClick={logout}>Sair</Nav.Link>
                    </Nav>
                </Container>
            </Navbar>
            <Container fluid>
                <Row>
                    <Col md={2} className="bg-light vh-100">
                        <Nav className="flex-column pt-3">
                            <h5>Colaborador</h5>
                            <Nav.Link as={Link} to="/">Dashboard</Nav.Link>
                            <Nav.Link as={Link} to="/me/submissions">Minhas Submissões</Nav.Link>
                            
                            {user?.role === 'ADMIN' && (
                                <>
                                    <hr />
                                    <h5>Administrador</h5>
                                    <Nav.Link as={Link} to="/admin">Dashboard Admin</Nav.Link>
                                    <Nav.Link as={Link} to="/admin/users">Gerenciar Usuários</Nav.Link>
                                    <Nav.Link as={Link} to="/admin/items">Gerenciar Itens</Nav.Link>
                                    <Nav.Link as={Link} to="/admin/areas">Gerenciar Áreas</Nav.Link>
                                    <Nav.Link as={Link} to="/admin/fornecedores">Gerenciar Fornecedores</Nav.Link>
                                    <Nav.Link as={Link} to="/admin/gerar-cotacao">Gerar Cotação</Nav.Link>
                                    <Nav.Link as={Link} to="/admin/cotacoes">Ver Cotações</Nav.Link>
                                </>
                            )}
                        </Nav>
                    </Col>
                    <Col md={10} className="p-4">
                        <Outlet />
                    </Col>
                </Row>
            </Container>
        </>
    );
};

export default Layout;
