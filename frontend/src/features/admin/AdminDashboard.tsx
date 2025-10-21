/**
 * Admin Dashboard - CoreUI Inspired Design
 *
 * DOCUMENTAÇÃO DO DESIGN:
 * - Grid responsivo de widgets com cores diferenciadas
 * - Cards com sombra e animação de entrada
 * - Ícones grandes em círculos coloridos
 * - Gradientes sutis nas cores principais
 * - Tabelas com hover effects e bordas arredondadas
 * - Ações rápidas com scroll horizontal
 *
 * PALETA DE CORES:
 * - Azul: #667eea (Usuários)
 * - Verde: #2eb85c (Listas)
 * - Amarelo: #ffc107 (Submissões)
 * - Vermelho: #e55353 (Pedidos)
 * - Roxo: #6f42c1 (Cotações)
 * - Laranja: #f9b115 (Aprovações)
 *
 * RESPONSIVIDADE:
 * - Desktop: Grid de 3 colunas
 * - Tablet: Grid de 2 colunas
 * - Mobile: 1 coluna
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Table } from 'react-bootstrap';
import {
    faUsers,
    faListAlt,
    faExclamationTriangle,
    faCheckCircle,
    faUserClock,
    faClipboardList,
    faShoppingCart,
    faPlusSquare,
    faFileInvoiceDollar,
    faFileExport,
    faChartLine,
    faArrowUp,
    faArrowDown,
    faArrowRight,
    faBolt,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import api from '../../services/api';
import styles from './AdminDashboard.module.css';

interface DashboardStats {
    total_users: number;
    pending_users: number;
    total_lists: number;
    pending_submissions: number;
    pending_cotacoes: number;
    orders_today: number;
}

interface ListStatus {
    id: number;
    area: string;
    last_submission: string;
    pending_submissions: number;
}

interface Activity {
    time: string;
    description: string;
}

const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats>({
        total_users: 0,
        pending_users: 0,
        total_lists: 0,
        pending_submissions: 0,
        pending_cotacoes: 0,
        orders_today: 0,
    });

    const [listStatus, setListStatus] = useState<ListStatus[]>([]);
    const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);

    // DIAGNÓSTICO: Verificar se este componente está sendo carregado
    console.log('🎨 DASHBOARD COREUI CARREGADO!', {
        styles,
        hasWrapper: !!styles.dashboardWrapper,
        hasWidgetCard: !!styles.widgetCard
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsResponse] = await Promise.all([
                    api.get('/admin/dashboard-summary'),
                ]);

                setStats(statsResponse.data);

                // Mock data para demonstração (remover quando backend estiver pronto)
                setListStatus([
                    { id: 1, area: 'Cozinha', last_submission: '2025-10-20 14:30', pending_submissions: 3 },
                    { id: 2, area: 'Almoxarifado', last_submission: '2025-10-20 10:15', pending_submissions: 1 },
                    { id: 3, area: 'Manutenção', last_submission: '2025-10-19 16:45', pending_submissions: 5 },
                ]);

                setRecentActivities([
                    { time: '14:30', description: 'Usuário João Silva submeteu lista "Cozinha"' },
                    { time: '13:15', description: 'Cotação #125 criada para Fornecedor ABC' },
                    { time: '11:45', description: 'Usuário Maria Santos aprovado' },
                    { time: '10:30', description: 'Pedido #89 gerado para Fornecedor XYZ' },
                ]);
            } catch (error) {
                console.error('Failed to fetch dashboard data', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Widgets configuration
    const widgets = [
        {
            title: 'Usuários Cadastrados',
            value: stats.total_users,
            icon: faUsers,
            color: styles.widgetBlue,
            link: '/admin/users',
            trend: '+12%',
            trendType: 'positive',
        },
        {
            title: 'Usuários Pendentes',
            value: stats.pending_users,
            icon: faUserClock,
            color: styles.widgetYellow,
            link: '/admin/users?status=pending',
            trend: '+3',
            trendType: 'positive',
        },
        {
            title: 'Listas Criadas',
            value: stats.total_lists,
            icon: faListAlt,
            color: styles.widgetGreen,
            link: '/admin/listas',
            trend: '+8%',
            trendType: 'positive',
        },
        {
            title: 'Submissões Pendentes',
            value: stats.pending_submissions,
            icon: faClipboardList,
            color: styles.widgetOrange,
            link: '/admin/submissions?status=pending',
            trend: '-2',
            trendType: 'negative',
        },
        {
            title: 'Cotações Abertas',
            value: stats.pending_cotacoes,
            icon: faExclamationTriangle,
            color: styles.widgetPurple,
            link: '/admin/cotacoes?status=open',
            trend: '5',
            trendType: 'positive',
        },
        {
            title: 'Pedidos Gerados Hoje',
            value: stats.orders_today,
            icon: faShoppingCart,
            color: styles.widgetRed,
            link: '/admin/orders?date=today',
            trend: '+7',
            trendType: 'positive',
        },
    ];

    // Quick actions configuration
    const quickActions = [
        {
            title: 'Gerenciar Usuários',
            icon: faUsers,
            link: '/admin/users',
        },
        {
            title: 'Criar Lista de Estoque',
            icon: faPlusSquare,
            link: '/admin/listas/new',
        },
        {
            title: 'Iniciar Cotação',
            icon: faFileInvoiceDollar,
            link: '/admin/cotacoes/new',
        },
        {
            title: 'Exportar Pedidos',
            icon: faFileExport,
            link: '/admin/orders/export',
        },
    ];

    if (loading) {
        return (
            <div className={styles.loadingSpinner}>
                <div className={styles.spinner}></div>
            </div>
        );
    }

    return (
        <div className={styles.dashboardWrapper}>
            <Container fluid>
                {/* Header */}
                <div className={styles.dashboardHeader}>
                    <h1 className={styles.dashboardTitle}>
                        <FontAwesomeIcon icon={faChartLine} style={{ marginRight: '1rem', color: '#667eea' }} />
                        Dashboard Administrativo
                    </h1>
                    <p className={styles.dashboardSubtitle}>
                        Visão geral e atalhos para as principais funcionalidades do sistema
                    </p>
                </div>

                {/* Widgets Grid */}
                <div className={styles.widgetsGrid}>
                    {widgets.map((widget, index) => (
                        <Card key={index} className={`${styles.widgetCard} ${widget.color}`}>
                            <div className={styles.widgetHeader}>
                                <div className={styles.widgetIcon}>
                                    <FontAwesomeIcon icon={widget.icon} />
                                </div>
                                <div className={styles.widgetInfo}>
                                    <div className={styles.widgetTitle}>{widget.title}</div>
                                    <div className={styles.widgetValue}>{widget.value}</div>
                                </div>
                            </div>
                            <div className={styles.widgetFooter}>
                                <span className={`${styles.widgetTrend} ${widget.trendType === 'positive' ? styles.positive : styles.negative}`}>
                                    <FontAwesomeIcon
                                        icon={widget.trendType === 'positive' ? faArrowUp : faArrowDown}
                                        style={{ marginRight: '0.25rem' }}
                                    />
                                    {widget.trend}
                                </span>
                                <Link to={widget.link} className={styles.widgetLink}>
                                    Ver detalhes
                                    <FontAwesomeIcon icon={faArrowRight} />
                                </Link>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Quick Actions */}
                <div className={styles.quickActionsSection}>
                    <h3 className={styles.sectionTitle}>
                        <FontAwesomeIcon icon={faBolt} />
                        Ações Rápidas
                    </h3>
                    <div className={styles.quickActionsGrid}>
                        {quickActions.map((action, index) => (
                            <Button
                                key={index}
                                as={Link}
                                to={action.link}
                                className={styles.quickActionBtn}
                            >
                                <FontAwesomeIcon icon={action.icon} />
                                {action.title}
                            </Button>
                        ))}
                    </div>
                </div>

                <Row>
                    {/* Status das Listas */}
                    <Col lg={8} className="mb-4">
                        <Card className={styles.sectionCard}>
                            <div className={styles.sectionCardHeader}>
                                <h4 className={styles.sectionCardTitle}>
                                    <FontAwesomeIcon icon={faListAlt} />
                                    Status das Listas
                                </h4>
                            </div>
                            {listStatus.length > 0 ? (
                                <Table responsive hover className={styles.customTable}>
                                    <thead>
                                        <tr>
                                            <th>Lista (Área)</th>
                                            <th>Última Submissão</th>
                                            <th>Pendentes</th>
                                            <th>Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {listStatus.map((list) => (
                                            <tr key={list.id}>
                                                <td><strong>{list.area}</strong></td>
                                                <td>{list.last_submission}</td>
                                                <td>
                                                    <span className={styles.badgeWarning}>
                                                        {list.pending_submissions} pendente{list.pending_submissions !== 1 ? 's' : ''}
                                                    </span>
                                                </td>
                                                <td>
                                                    <Button
                                                        as={Link}
                                                        to={`/admin/listas/${list.id}/consolidacao`}
                                                        variant="outline-primary"
                                                        size="sm"
                                                    >
                                                        Ver Consolidação
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            ) : (
                                <div className={styles.emptyState}>
                                    <FontAwesomeIcon icon={faListAlt} />
                                    <p>Nenhum status de lista disponível</p>
                                </div>
                            )}
                        </Card>
                    </Col>

                    {/* Atividades Recentes */}
                    <Col lg={4} className="mb-4">
                        <Card className={styles.sectionCard}>
                            <div className={styles.sectionCardHeader}>
                                <h4 className={styles.sectionCardTitle}>
                                    <FontAwesomeIcon icon={faCheckCircle} />
                                    Atividades Recentes
                                </h4>
                            </div>
                            {recentActivities.length > 0 ? (
                                <div>
                                    {recentActivities.map((activity, index) => (
                                        <div
                                            key={index}
                                            style={{
                                                padding: '1rem',
                                                borderBottom: index < recentActivities.length - 1 ? '1px solid #e9ecef' : 'none',
                                            }}
                                        >
                                            <div style={{ fontWeight: 600, color: '#667eea', marginBottom: '0.25rem' }}>
                                                {activity.time}
                                            </div>
                                            <div style={{ fontSize: '0.9rem', color: '#6c757d' }}>
                                                {activity.description}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.emptyState}>
                                    <FontAwesomeIcon icon={faCheckCircle} />
                                    <p>Nenhuma atividade recente</p>
                                </div>
                            )}
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default AdminDashboard;
