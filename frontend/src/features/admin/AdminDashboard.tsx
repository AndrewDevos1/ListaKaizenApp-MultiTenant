import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, Col, Row, Button, Table, Accordion, ListGroup } from 'react-bootstrap';
import { faUsers, faListAlt, faExclamationTriangle, faCheckCircle, faUserClock, faClipboardList, faShoppingCart, faPlusSquare, faFileInvoiceDollar, faFileExport, faEdit } from '@fortawesome/free-solid-svg-icons';
import Widget from '../../components/Widget';
import ActivityChart from '../../components/ActivityChart';
import api from '../../services/api';

const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState({
        total_users: 0,
        pending_users: 0,
        total_lists: 0,
        pending_submissions: 0,
        pending_cotacoes: 0,
        completed_cotacoes: 0,
        orders_today: 0,
    });
    const [activityData, setActivityData] = useState({ labels: [], data: [] });
    const [listStatus, setListStatus] = useState([]);
    const [recentActivities, setRecentActivities] = useState([]);
    const [criticalStock, setCriticalStock] = useState([]);
    const [inProgressCotacoes, setInProgressCotacoes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsResponse, activityResponse, listStatusResponse, recentActivitiesResponse, criticalStockResponse, inProgressCotacoesResponse] = await Promise.all([
                    api.get('/admin/dashboard-summary'),
                    api.get('/admin/activity-summary'),
                    api.get('/admin/list-status'),
                    api.get('/admin/recent-activities'),
                    api.get('/admin/critical-stock'),
                    api.get('/admin/in-progress-cotacoes'),
                ]);
                setStats(prevStats => ({ ...prevStats, ...statsResponse.data }));
                setActivityData(activityResponse.data);
                setListStatus(listStatusResponse.data);
                setRecentActivities(recentActivitiesResponse.data);
                setCriticalStock(criticalStockResponse.data);
                setInProgressCotacoes(inProgressCotacoesResponse.data);
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
                <Col sm={6} lg={4} className="mb-4 mb-lg-0">
                    <Widget
                        title="Usuários Cadastrados"
                        value={String(stats.total_users)}
                        icon={faUsers}
                        color="primary"
                        link="/admin/users"
                    />
                </Col>
                <Col sm={6} lg={4} className="mb-4 mb-lg-0">
                    <Widget
                        title="Usuários Pendentes"
                        value={String(stats.pending_users)}
                        icon={faUserClock}
                        color="warning"
                        link="/admin/users?status=pending"
                    />
                </Col>
                <Col sm={6} lg={4} className="mb-4 mb-lg-0">
                    <Widget
                        title="Listas Criadas"
                        value={String(stats.total_lists)}
                        icon={faListAlt}
                        color="info"
                        link="/admin/listas"
                    />
                </Col>
                <Col sm={6} lg={4} className="mb-4 mb-lg-0">
                    <Widget
                        title="Submissões Pendentes"
                        value={String(stats.pending_submissions)}
                        icon={faClipboardList}
                        color="danger"
                        link="/admin/submissions?status=pending"
                    />
                </Col>
                <Col sm={6} lg={4} className="mb-4 mb-lg-0">
                    <Widget
                        title="Cotações Abertas"
                        value={String(stats.pending_cotacoes)}
                        icon={faExclamationTriangle}
                        color="secondary"
                        link="/admin/cotacoes?status=open"
                    />
                </Col>
                <Col sm={6} lg={4} className="mb-4 mb-lg-0">
                    <Widget
                        title="Pedidos Gerados Hoje"
                        value={String(stats.orders_today)}
                        icon={faShoppingCart}
                        color="success"
                        link="/admin/orders?date=today"
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

            <h3 className="fs-4 mb-3">Ações Rápidas</h3>
            <Row className="mb-4 g-2 d-flex flex-nowrap overflow-auto pb-2">
                <Col xs={6} md={3} className="flex-shrink-0">
                    <Button as={Link} to="/admin/users" variant="outline-primary" className="w-100 py-3">
                        <i className="fas fa-users-cog me-2"></i>Gerenciar Usuários
                    </Button>
                </Col>
                <Col xs={6} md={3} className="flex-shrink-0">
                    <Button as={Link} to="/admin/listas/new" variant="outline-success" className="w-100 py-3">
                        <i className="fas fa-plus-square me-2"></i>Criar Lista de Estoque
                    </Button>
                </Col>
                <Col xs={6} md={3} className="flex-shrink-0">
                    <Button as={Link} to="/admin/cotacoes/new" variant="outline-info" className="w-100 py-3">
                        <i className="fas fa-file-invoice-dollar me-2"></i>Iniciar Cotação
                    </Button>
                </Col>
                <Col xs={6} md={3} className="flex-shrink-0">
                    <Button as={Link} to="/admin/orders/export" variant="outline-secondary" className="w-100 py-3">
                        <i className="fas fa-file-export me-2"></i>Exportar Pedidos
                    </Button>
                </Col>
            </Row>

            <hr className="my-4" />

            <h3 className="fs-4 mb-3">Status das Listas</h3>
            <Row className="mb-4">
                <Col lg={12}>
                    <Card>
                        <Card.Body>
                            {loading ? (
                                <p>Carregando status das listas...</p>
                            ) : listStatus.length > 0 ? (
                                <>
                                    {/* Desktop Table */}
                                    <div className="d-none d-md-block">
                                        <Table striped bordered hover responsive>
                                            <thead>
                                                <tr>
                                                    <th>Lista (Área)</th>
                                                    <th>Última Submissão</th>
                                                    <th>Submissões Pendentes</th>
                                                    <th>Ação</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {listStatus.map((list, index) => (
                                                    <tr key={index}>
                                                        <td>{list.area}</td>
                                                        <td>{list.last_submission}</td>
                                                        <td>{list.pending_submissions}</td>
                                                        <td>
                                                            <Link to={`/admin/listas/${list.id}/consolidacao`} className="btn btn-sm btn-primary">
                                                                Ver Consolidação
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>

                                    {/* Mobile Accordion */}
                                    <div className="d-md-none">
                                        <Accordion defaultActiveKey="0">
                                            {listStatus.map((list, index) => (
                                                <Accordion.Item eventKey={String(index)} key={index}>
                                                    <Accordion.Header>
                                                        {list.area} - {list.last_submission}
                                                    </Accordion.Header>
                                                    <Accordion.Body>
                                                        <p><strong>Submissões Pendentes:</strong> {list.pending_submissions}</p>
                                                        <Link to={`/admin/listas/${list.id}/consolidacao`} className="btn btn-sm btn-primary w-100">
                                                            Ver Consolidação
                                                        </Link>
                                                    </Accordion.Body>
                                                </Accordion.Item>
                                            ))}
                                        </Accordion>
                                    </div>
                                </>
                            ) : (
                                <p className="text-muted">Nenhum status de lista disponível.</p>
                            )}
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

            <hr className="my-4" />

            <h3 className="fs-4 mb-3">Atividades Recentes</h3>
            <Row className="mb-4">
                <Col lg={12}>
                    <Card>
                        <Card.Body>
                            {loading ? (
                                <p>Carregando atividades recentes...</p>
                            ) : recentActivities.length > 0 ? (
                                <ListGroup variant="flush">
                                    {recentActivities.map((activity, index) => (
                                        <ListGroup.Item action href="#!" key={index}>
                                            {activity.time} - {activity.description}
                                        </ListGroup.Item>
                                    ))}
                                </ListGroup>
                            ) : (
                                <p className="text-muted">Nenhuma atividade recente disponível.</p>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <hr className="my-4" />

            <h3 className="fs-4 mb-3">Indicadores de Estoque Crítico</h3>
            <Row className="mb-4">
                <Col lg={12}>
                    <Card>
                        <Card.Body>
                            {loading ? (
                                <p>Carregando estoque crítico...</p>
                            ) : criticalStock.length > 0 ? (
                                <>
                                    {/* Desktop Table */}
                                    <div className="d-none d-md-block">
                                        <Table striped bordered hover responsive>
                                            <thead>
                                                <tr>
                                                    <th>Item</th>
                                                    <th>Área</th>
                                                    <th>Quantidade Atual</th>
                                                    <th>Estoque Mínimo</th>
                                                    <th>Quantidade a Pedir</th>
                                                    <th>Ação</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {criticalStock.map((item, index) => (
                                                    <tr key={index}>
                                                        <td>{item.name}</td>
                                                        <td>{item.area}</td>
                                                        <td>{item.current_quantity}</td>
                                                        <td>{item.min_stock}</td>
                                                        <td>{item.quantity_to_order}</td>
                                                        <td>
                                                            <Button variant="sm" className="btn-primary">
                                                                Gerar Pedido
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>

                                    {/* Mobile Accordion */}
                                    <div className="d-md-none">
                                        <Accordion defaultActiveKey="0">
                                            {criticalStock.map((item, index) => (
                                                <Accordion.Item eventKey={String(index)} key={index}>
                                                    <Accordion.Header>
                                                        {item.name} ({item.area})
                                                    </Accordion.Header>
                                                    <Accordion.Body>
                                                        <p><strong>Quantidade Atual:</strong> {item.current_quantity}</p>
                                                        <p><strong>Estoque Mínimo:</strong> {item.min_stock}</p>
                                                        <p><strong>Quantidade a Pedir:</strong> {item.quantity_to_order}</p>
                                                        <Button variant="sm" className="btn-primary w-100">
                                                            Gerar Pedido
                                                        </Button>
                                                    </Accordion.Body>
                                                </Accordion.Item>
                                            ))}
                                        </Accordion>
                                    </div>
                                </>
                            ) : (
                                <p className="text-muted">Nenhum item em estoque crítico.</p>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <hr className="my-4" />

            <h3 className="fs-4 mb-3">Cotações em Andamento</h3>
            <Row className="mb-4">
                <Col lg={12}>
                    <Card>
                        <Card.Body>
                            {loading ? (
                                <p>Carregando cotações em andamento...</p>
                            ) : inProgressCotacoes.length > 0 ? (
                                <Row className="g-3">
                                    {inProgressCotacoes.map((cotacao, index) => (
                                        <Col sm={6} md={4} lg={3} key={index}>
                                            <Card className="h-100">
                                                <Card.Body>
                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                        <Card.Title as="h6" className="mb-0">Cotação ID: {cotacao.id}</Card.Title>
                                                        <Link to={`/admin/cotacoes/${cotacao.id}/preencher`} className="btn btn-sm btn-outline-primary">
                                                            <i className="fas fa-edit"></i>
                                                        </Link>
                                                    </div>
                                                    <Card.Text className="small">
                                                        <strong>Data:</strong> {cotacao.date}<br />
                                                        <strong>Fornecedor:</strong> {cotacao.supplier}<br />
                                                        <strong>Itens sem preço:</strong> {cotacao.items_without_price}
                                                    </Card.Text>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    ))}
                                </Row>
                            ) : (
                                <p className="text-muted">Nenhuma cotação em andamento.</p>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <hr className="my-4" />

            <h3 className="fs-4 mb-3">Relatórios e Exportações</h3>
            <Row className="mb-4">
                <Col lg={12}>
                    <Card>
                        <Card.Body>
                            <div className="d-flex flex-wrap gap-2">
                                <Button as={Link} to="/admin/orders/export" variant="outline-primary">
                                    Exportar Pedidos por Fornecedor
                                </Button>
                                <Button as={Link} to="/admin/cotacoes/export" variant="outline-info">
                                    Exportar Relatório de Cotações
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <hr className="my-4" />

            {/* Rodapé - Placeholder */}
            <Row className="mb-4">
                <Col lg={12}>
                    <p className="text-muted text-center">Versão do sistema | Contato de suporte | Documentação</p>
                </Col>
            </Row>
        </div>
    );
};

export default AdminDashboard;