/**
 * Collaborator Dashboard - CoreUI Inspired Design
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
 * - Azul: #667eea (Áreas)
 * - Verde: #2eb85c (Submissões)
 * - Amarelo: #ffc107 (Pendentes)
 * - Vermelho: #e55353 (Pedidos)
 * - Roxo: #6f42c1 (Listas)
 * - Laranja: #f9b115 (Atividades)
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
    faListAlt,
    faCheckCircle,
    faFileInvoiceDollar,
    faChartLine,
    faArrowUp,
    faArrowDown,
    faArrowRight,
    faBolt,
    faGripVertical,
    faEdit,
    faSave,
    faUser,
    faKey,
    faClipboardList,
    faShoppingCart,
    faTasks,
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
import styles from './CollaboratorDashboard.module.css';

interface DashboardStats {
    minhas_areas: number;
    pending_submissions: number;
    completed_submissions: number;
    pedidos_pendentes: number;
}

interface AreaStatus {
    id: number;
    area: string;
    last_submission: string;
    pending_items: number;
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
    trend: string;
    trendType: 'positive' | 'negative';
}

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

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <Card className={`${styles.widgetCard} ${widget.color}`}>
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
        </div>
    );
};

const CollaboratorDashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats>({
        minhas_areas: 0,
        pending_submissions: 0,
        completed_submissions: 0,
        pedidos_pendentes: 0,
    });

    const [areaStatus, setAreaStatus] = useState<AreaStatus[]>([]);
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

    // DIAGNÓSTICO: Verificar se este componente está sendo carregado
    console.log('🎨 COLLABORATOR DASHBOARD CARREGADO!', {
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
                localStorage.setItem('collaboratorDashboardWidgetOrder', JSON.stringify(newOrder.map(w => w.id)));

                return newOrder;
            });
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsResponse] = await Promise.all([
                    api.get('/collaborator/dashboard-summary'),
                ]);

                setStats(statsResponse.data);

                // Mock data para demonstração (remover quando backend estiver pronto)
                setAreaStatus([
                    { id: 1, area: 'Cozinha', last_submission: '2025-10-20 14:30', pending_items: 3 },
                    { id: 2, area: 'Almoxarifado', last_submission: '2025-10-20 10:15', pending_items: 1 },
                    { id: 3, area: 'Manutenção', last_submission: '2025-10-19 16:45', pending_items: 5 },
                ]);

                setRecentActivities([
                    { time: '14:30', description: 'Você submeteu lista "Cozinha"' },
                    { time: '13:15', description: 'Pedido #89 aprovado pelo administrador' },
                    { time: '11:45', description: 'Você atualizou estoque de "Almoxarifado"' },
                    { time: '10:30', description: 'Nova lista "Manutenção" atribuída a você' },
                ]);
            } catch (error) {
                console.error('Failed to fetch dashboard data', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Initialize widgets with saved order
    useEffect(() => {
        const defaultWidgets: Widget[] = [
            {
                id: 'widget-completed',
                title: 'Submissões Concluídas',
                value: stats.completed_submissions,
                icon: faCheckCircle,
                color: styles.widgetGreen,
                link: '/collaborator/submissions',
                trend: '+5',
                trendType: 'positive',
            },
            {
                id: 'widget-compras',
                title: 'Minhas Compras',
                value: 0,
                icon: faShoppingCart,
                color: styles.widgetPurple,
                link: '/collaborator/compras',
                trend: '',
                trendType: 'positive',
            },
            {
                id: 'widget-tarefas',
                title: 'Minhas Tarefas',
                value: 0,
                icon: faTasks,
                color: styles.widgetOrange,
                link: '/collaborator/tarefas',
                trend: '',
                trendType: 'positive',
            },
        ];

        // Load saved order from localStorage
        const savedOrder = localStorage.getItem('collaboratorDashboardWidgetOrder');
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
            title: 'Meu Perfil',
            icon: faUser,
            link: '/collaborator/perfil',
        },
        {
            title: 'Mudar Senha',
            icon: faKey,
            link: '/collaborator/mudar-senha',
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
                    <div>
                        <h1 className={styles.dashboardTitle}>
                            <FontAwesomeIcon icon={faChartLine} style={{ marginRight: '1rem', color: '#667eea' }} />
                            Meu Dashboard
                        </h1>
                        <p className={styles.dashboardSubtitle}>
                            Visão geral das suas áreas de trabalho e atividades
                        </p>
                    </div>
                    <Button
                        variant={isEditMode ? 'success' : 'outline-primary'}
                        onClick={toggleEditMode}
                        className={styles.editModeButton}
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
                        <div className={styles.widgetsGrid}>
                            {widgets.map((widget) => (
                                <SortableWidget key={widget.id} widget={widget} isEditMode={isEditMode} />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>

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
                    {/* Status das Áreas */}
                    <Col lg={8} className="mb-4">
                        <Card className={styles.sectionCard}>
                            <div className={styles.sectionCardHeader}>
                                <h4 className={styles.sectionCardTitle}>
                                    <FontAwesomeIcon icon={faListAlt} />
                                    Minhas Áreas de Trabalho
                                </h4>
                            </div>
                            {areaStatus.length > 0 ? (
                                <Table responsive hover className={styles.customTable}>
                                    <thead>
                                        <tr>
                                            <th>Área</th>
                                            <th>Última Submissão</th>
                                            <th>Itens Pendentes</th>
                                            <th>Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {areaStatus.map((area) => (
                                            <tr key={area.id}>
                                                <td><strong>{area.area}</strong></td>
                                                <td>{area.last_submission}</td>
                                                <td>
                                                    <span className={styles.badgeWarning}>
                                                        {area.pending_items} pendente{area.pending_items !== 1 ? 's' : ''}
                                                    </span>
                                                </td>
                                                <td>
                                                    <Button
                                                        as={Link}
                                                        to={`/collaborator/areas/${area.id}/estoque`}
                                                        variant="outline-primary"
                                                        size="sm"
                                                    >
                                                        Ver Estoque
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            ) : (
                                <div className={styles.emptyState}>
                                    <FontAwesomeIcon icon={faListAlt} />
                                    <p>Nenhuma área atribuída a você</p>
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
                                    Minhas Atividades Recentes
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

export default CollaboratorDashboard;