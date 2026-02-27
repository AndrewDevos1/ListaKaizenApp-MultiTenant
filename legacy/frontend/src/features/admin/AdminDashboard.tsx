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

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Table, Alert } from 'react-bootstrap';
import {
    faUsers,
    faListAlt,
    faCheckCircle,
    faShoppingCart,
    faFileInvoiceDollar,
    faChartLine,
    faArrowUp,
    faArrowDown,
    faArrowRight,
    faBolt,
    faGripVertical,
    faEdit,
    faSave,
    faCog,
    faClipboardList,
    faBox,
    faTruck,
    faCheck,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '../../services/api';
import { formatarDataHoraBrasilia } from '../../utils/dateFormatter';
import styles from './AdminDashboard.module.css';

interface DashboardStats {
    total_users: number;
    pending_users: number;
    total_lists: number;
    total_items: number;
    pending_submissions: number;
    pending_cotacoes: number;
    orders_today: number;
}

interface ListStatus {
    id: number;
    area: string;
    last_submission: string | null;
    pending_submissions: number;
    tipo: 'lista_comum' | 'lista_rapida';
    nome?: string;
}

interface Activity {
    time: string;
    description: string;
}

interface Widget {
    id: string;
    title: string;
    value: number;
    icon: any;
    color: string;
    link: string;
    trend?: string;
    trendType?: 'positive' | 'negative';
}

const widgetWizardTargets: Record<string, string> = {
    'widget-submissions': 'admin-widget-lists',
    'widget-items': 'admin-widget-items',
    'widget-orders': 'admin-widget-submissions',
};

const quickActionWizardTargets: Record<string, string> = {
    'Gerenciar Usuários': 'admin-quick-users',
    'Fornecedores': 'admin-quick-suppliers',
    'Gerenciar Submissões': 'admin-quick-submissions',
    'Cotações': 'admin-quick-cotacoes',
    'Configurações': 'admin-quick-config',
};

// Componente SortableWidget
interface SortableWidgetProps {
    widget: Widget;
    isEditMode: boolean;
}

const SortableWidget: React.FC<SortableWidgetProps> = ({ widget, isEditMode }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: widget.id, disabled: !isEditMode });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        cursor: isEditMode ? (isDragging ? 'grabbing' : 'grab') : 'default',
    };

    const hasTrend = Boolean(widget.trend);
    const trendClass = hasTrend
        ? widget.trendType === 'negative'
            ? styles.negative
            : styles.positive
        : styles.trendHidden;
    const wizardTarget = widgetWizardTargets[widget.id];

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <Card
                className={`${styles.widgetCard} ${widget.color}`}
                data-wizard-target={wizardTarget}
            >
                {isEditMode && (
                    <div className={styles.dragHandle} {...listeners}>
                        <FontAwesomeIcon icon={faGripVertical} />
                    </div>
                )}
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
                    <span className={`${styles.widgetTrend} ${trendClass}`}>
                        {hasTrend && (
                            <FontAwesomeIcon
                                icon={widget.trendType === 'negative' ? faArrowDown : faArrowUp}
                                style={{ marginRight: '0.25rem' }}
                            />
                        )}
                        {widget.trend || ''}
                    </span>
                    <Link to={widget.link} className={styles.widgetLink}>
                        Ver detalhes
                        <FontAwesomeIcon icon={faArrowRight} />
                    </Link>
                </div>
            </Card>
        </div>
    );
};

const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats>({
        total_users: 0,
        pending_users: 0,
        total_lists: 0,
        total_items: 0,
        pending_submissions: 0,
        pending_cotacoes: 0,
        orders_today: 0,
    });

    const [listStatus, setListStatus] = useState<ListStatus[]>([]);
    const [loadingListStatus, setLoadingListStatus] = useState(true);
    const [listStatusError, setListStatusError] = useState<string | null>(null);
    const [listStatusSuccess, setListStatusSuccess] = useState<string | null>(null);
    const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [widgets, setWidgets] = useState<Widget[]>([]);
    const [isEditMode, setIsEditMode] = useState(false);

    // Drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Toggle edit mode
    const toggleEditMode = () => {
        setIsEditMode(!isEditMode);
    };

    const formatListSubmissionDate = (value: string | null) => {
        if (!value) {
            return 'Nunca';
        }
        return formatarDataHoraBrasilia(value);
    };

    const fetchListStatus = useCallback(async () => {
        try {
            setLoadingListStatus(true);
            const response = await api.get('/admin/listas/status-submissoes');
            setListStatus(response.data);
            setListStatusError(null);
        } catch (error: any) {
            console.error('Erro ao buscar status das listas', error);
            setListStatusError(error.response?.data?.error || 'Erro ao carregar status das listas.');
        } finally {
            setLoadingListStatus(false);
        }
    }, []);

    const handleAprovarTodosPedidos = async (
        listaId: number,
        listaNome: string,
        pendingCount: number
    ) => {
        if (!window.confirm(`Deseja aprovar TODOS os ${pendingCount} pedidos da lista "${listaNome}"?`)) {
            return;
        }

        try {
            setLoadingListStatus(true);
            const response = await api.post(`/admin/listas/${listaId}/aprovar-pedidos`);
            setListStatusSuccess(response.data?.message || 'Pedidos aprovados com sucesso.');
            setListStatusError(null);
            await fetchListStatus();
            setTimeout(() => setListStatusSuccess(null), 5000);
        } catch (error: any) {
            console.error('Erro ao aprovar pedidos da lista', error);
            setListStatusError(error.response?.data?.error || 'Erro ao aprovar pedidos.');
            setListStatusSuccess(null);
            setTimeout(() => setListStatusError(null), 5000);
        } finally {
            setLoadingListStatus(false);
        }
    };

    // DIAGNOSTICO: Verificar se este componente esta sendo carregado
    console.log('[DASHBOARD] COREUI CARREGADO!', {
        styles,
        hasWrapper: !!styles.dashboardWrapper,
        hasWidgetCard: !!styles.widgetCard
    });

    // Handle drag end
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setWidgets((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);

                const newOrder = arrayMove(items, oldIndex, newIndex);

                // Save to localStorage
                localStorage.setItem('dashboardWidgetOrder', JSON.stringify(newOrder.map(w => w.id)));

                return newOrder;
            });
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsResponse, activitiesResponse] = await Promise.all([
                    api.get('/admin/dashboard-summary'),
                    api.get('/admin/recent-activities'),
                ]);

                setStats(statsResponse.data);
                setRecentActivities(activitiesResponse.data?.activities || []);
            } catch (error) {
                console.error('Failed to fetch dashboard data', error);
                setRecentActivities([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        fetchListStatus();
    }, [fetchListStatus]);

    // Initialize widgets with saved order
    useEffect(() => {
        const defaultWidgets: Widget[] = [
            {
                id: 'widget-submissions',
                title: 'Gerenciar Listas',
                value: stats.total_lists,
                icon: faShoppingCart,
                color: styles.widgetOrange,
                link: '/admin/listas-compras',
            },
            {
                id: 'widget-items',
                title: 'Itens e Insumos',
                value: stats.total_items,
                icon: faBox,
                color: styles.widgetBlue,
                link: '/admin/catalogo-global',
            },
            {
                id: 'widget-orders',
                title: 'Solicitações',
                value: stats.pending_submissions,
                icon: faClipboardList,
                color: styles.widgetRed,
                link: '/admin/submissoes',
            },
        ];

        // Load saved order from localStorage
        const savedOrder = localStorage.getItem('dashboardWidgetOrder');
        if (savedOrder) {
            try {
                const orderIds = JSON.parse(savedOrder) as string[];
                const orderedWidgets = orderIds
                    .map(id => defaultWidgets.find(w => w.id === id))
                    .filter((w): w is Widget => w !== undefined);

                // Add any new widgets that aren't in the saved order
                const newWidgets = defaultWidgets.filter(
                    w => !orderIds.includes(w.id)
                );

                setWidgets([...orderedWidgets, ...newWidgets]);
            } catch (e) {
                setWidgets(defaultWidgets);
            }
        } else {
            setWidgets(defaultWidgets);
        }
    }, [stats]);

    // Quick actions configuration
    const quickActions = [
        {
            title: 'Gerenciar Usuários',
            icon: faUsers,
            link: '/admin/gerenciar-usuarios',
        },
        {
            title: 'Fornecedores',
            icon: faTruck,
            link: '/admin/fornecedores',
        },
        {
            title: 'Gerenciar Submissões',
            icon: faBox,
            link: '/admin/submissoes',
        },
        {
            title: 'Cotações',
            icon: faFileInvoiceDollar,
            link: '/admin/cotacoes',
        },
        {
            title: 'Configurações',
            icon: faCog,
            link: '/admin/configuracoes',
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
        <div className={styles.dashboardWrapper} data-wizard-target="admin-dashboard">
            <Container fluid>
                {/* Header */}
                <div className={styles.dashboardHeader} data-wizard-target="admin-header">
                    <div>
                        <h1 className={styles.dashboardTitle}>
                            <FontAwesomeIcon icon={faChartLine} style={{ marginRight: '1rem', color: '#667eea' }} />
                            Dashboard Administrativo
                        </h1>
                        <p className={styles.dashboardSubtitle}>
                            Visão geral e atalhos para as principais funcionalidades do sistema
                        </p>
                    </div>
                    <Button
                        variant={isEditMode ? 'success' : 'outline-primary'}
                        onClick={toggleEditMode}
                        className={styles.editModeButton}
                        data-wizard-target="admin-edit-mode"
                    >
                        <FontAwesomeIcon icon={isEditMode ? faSave : faEdit} style={{ marginRight: '0.5rem' }} />
                        {isEditMode ? 'Salvar Organização' : 'Organizar Cards'}
                    </Button>
                </div>

                {/* Widgets Grid */}
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={widgets.map(w => w.id)}
                        strategy={rectSortingStrategy}
                    >
                        <div className={styles.widgetsGrid} data-wizard-target="admin-widgets">
                            {widgets.map((widget) => (
                                <SortableWidget key={widget.id} widget={widget} isEditMode={isEditMode} />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>

                {/* Quick Actions */}
                <div className={styles.quickActionsSection} data-wizard-target="admin-quick-actions">
                    <h3 className={styles.sectionTitle}>
                        <FontAwesomeIcon icon={faBolt} />
                        Ações Rápidas
                    </h3>
                    <div className={styles.quickActionsGrid}>
                        {quickActions.map((action, index) => (
                            <Button
                                key={index}
                                as={Link as any}
                                to={action.link}
                                className={styles.quickActionBtn}
                                data-wizard-target={quickActionWizardTargets[action.title]}
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
                        <Card className={styles.sectionCard} data-wizard-target="admin-status-list">
                            <div className={styles.sectionCardHeader}>
                                <h4 className={styles.sectionCardTitle}>
                                    <FontAwesomeIcon icon={faListAlt} />
                                    Status das Listas
                                </h4>
                            </div>
                            {listStatusError && (
                                <Alert variant="danger" dismissible onClose={() => setListStatusError(null)}>
                                    {listStatusError}
                                </Alert>
                            )}
                            {listStatusSuccess && (
                                <Alert variant="success" dismissible onClose={() => setListStatusSuccess(null)}>
                                    {listStatusSuccess}
                                </Alert>
                            )}
                            {loadingListStatus ? (
                                <div className={styles.loadingSpinner}>
                                    <div className={styles.spinner}></div>
                                </div>
                            ) : listStatus.length > 0 ? (
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
                                            <tr key={`${list.tipo}-${list.id}`}>
                                                <td>
                                                    <strong>{list.area}</strong>
                                                    {list.tipo === 'lista_rapida' && (
                                                        <span className={styles.badgeInfo} style={{ marginLeft: '8px', fontSize: '0.75rem' }}>
                                                            Lista Rápida
                                                        </span>
                                                    )}
                                                </td>
                                                <td>{formatListSubmissionDate(list.last_submission)}</td>
                                                <td>
                                                    <span className={styles.badgeWarning}>
                                                        {list.pending_submissions} pendente{list.pending_submissions !== 1 ? 's' : ''}
                                                    </span>
                                                </td>
                                                <td>
                                                    {list.tipo === 'lista_comum' ? (
                                                        <>
                                                            <Button
                                                                as={Link as any}
                                                                to={`/admin/listas/${list.id}/lista-mae`}
                                                                variant="outline-primary"
                                                                size="sm"
                                                                className="me-2"
                                                                data-wizard-target="admin-status-consolidacao"
                                                            >
                                                                Ver Consolidação
                                                            </Button>
                                                            <Button
                                                                variant="success"
                                                                size="sm"
                                                                onClick={() => handleAprovarTodosPedidos(
                                                                    list.id,
                                                                    list.area,
                                                                    list.pending_submissions
                                                                )}
                                                                disabled={loadingListStatus}
                                                                data-wizard-target="admin-status-aprovar"
                                                            >
                                                                <FontAwesomeIcon icon={faCheck} className="me-1" />
                                                                Aprovar Todos
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Button
                                                            as={Link as any}
                                                            to={`/admin/listas-rapidas/${list.id}`}
                                                            variant="outline-primary"
                                                            size="sm"
                                                            data-wizard-target="admin-status-analisar"
                                                        >
                                                            <FontAwesomeIcon icon={faEdit} className="me-1" />
                                                            Analisar
                                                        </Button>
                                                    )}
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
                        <Card className={styles.sectionCard} data-wizard-target="admin-recent-activities">
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
                                            className={`${styles.activityItem} ${index === recentActivities.length - 1 ? styles.activityItemLast : ''}`}
                                        >
                                            <div className={styles.activityTime}>{activity.time}</div>
                                            <div className={styles.activityDescription}>{activity.description}</div>
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
