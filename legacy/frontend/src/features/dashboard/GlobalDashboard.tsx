import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Spinner, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faHistory, faGripVertical } from '@fortawesome/free-solid-svg-icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { useDashboardData } from './hooks/useDashboardData';
import { DashboardFilters } from './types';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// Components
import DashboardHeader from './components/DashboardHeader';
import SummaryCards from './components/SummaryCards';
import TemporalCharts from './components/TemporalCharts';
import ListsSection from './components/ListsSection';
import ChecklistsSection from './components/ChecklistsSection';
import UsersSection from './components/UsersSection';
import SuppliersSection from './components/SuppliersSection';
import SuggestionsSection from './components/SuggestionsSection';
import ActivityTimeline from './components/ActivityTimeline';

import styles from './GlobalDashboard.module.css';

interface SortableSectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

const SortableSection: React.FC<SortableSectionProps> = ({ id, title, children }) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.sortableSection} ${isDragging ? styles.sortableSectionDragging : ''}`}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className={styles.dragHandle}
        aria-label={`Arrastar seção ${title}`}
        {...attributes}
        {...listeners}
      >
        <FontAwesomeIcon icon={faGripVertical} />
      </button>
      {children}
    </div>
  );
};

const GlobalDashboard: React.FC = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState<DashboardFilters>({
    restauranteId: null,
    period: 30
  });
  const defaultSectionOrder = useMemo(
    () => ['summary', 'temporal', 'lists', 'checklists', 'users', 'suppliers', 'suggestions', 'activity'],
    []
  );
  const storageKey = user?.id ? `superDashboardOrder:${user.id}` : 'superDashboardOrder:anonymous';
  const [sectionOrder, setSectionOrder] = useState<string[]>(defaultSectionOrder);

  const { data, restaurantes, loading, error, lastUpdated, refetch } = useDashboardData(filters);

  const handleRestauranteChange = useCallback((id: number | null) => {
    setFilters(prev => ({ ...prev, restauranteId: id }));
  }, []);

  const handlePeriodChange = useCallback((days: number) => {
    setFilters(prev => ({ ...prev, period: days }));
  }, []);

  const handleExportPDF = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.restauranteId) {
        params.append('restaurante_id', filters.restauranteId.toString());
      }
      params.append('period', filters.period.toString());

      const response = await api.get(`/admin/super-dashboard/export/pdf?${params}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `dashboard_global_${new Date().toISOString().slice(0, 10)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
      alert('Erro ao exportar PDF. Tente novamente.');
    }
  }, [filters]);

  const handleExportExcel = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.restauranteId) {
        params.append('restaurante_id', filters.restauranteId.toString());
      }
      params.append('period', filters.period.toString());

      const response = await api.get(`/admin/super-dashboard/export/excel?${params}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `dashboard_global_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao exportar Excel:', err);
      alert('Erro ao exportar Excel. Tente novamente.');
    }
  }, [filters]);

  useEffect(() => {
    const savedOrder = localStorage.getItem(storageKey);
    if (!savedOrder) {
      setSectionOrder(defaultSectionOrder);
      return;
    }

    try {
      const orderIds = JSON.parse(savedOrder) as string[];
      const ordered = orderIds.filter((id) => defaultSectionOrder.includes(id));
      const missing = defaultSectionOrder.filter((id) => !ordered.includes(id));
      setSectionOrder([...ordered, ...missing]);
    } catch (error) {
      setSectionOrder(defaultSectionOrder);
    }
  }, [storageKey, defaultSectionOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSectionOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem(storageKey, JSON.stringify(newOrder));
        return newOrder;
      });
    }
  };

  // Loading state
  if (loading && !data) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={styles.loadingContainer}>
          <Spinner animation="border" variant="primary" />
          <p className={styles.loadingText}>Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={styles.errorContainer}>
          <FontAwesomeIcon icon={faExclamationTriangle} className={styles.errorIcon} />
          <p className={styles.errorText}>Erro ao carregar dashboard</p>
          <p className={styles.errorSubtext}>{error}</p>
          <button className="btn btn-primary" onClick={refetch}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const safeSummary = data.summary ?? {
    total_restaurantes: 0,
    total_users: 0,
    users_by_role: { super_admin: 0, admin: 0, collaborator: 0 },
    pending_approvals: 0,
    total_listas: 0,
    total_itens: 0,
    total_submissoes: 0,
    submissoes_hoje: 0,
    pending_cotacoes: 0,
    completed_cotacoes: 0
  };

  const sectionTitles: Record<string, string> = {
    summary: 'Resumo',
    temporal: 'Indicadores',
    lists: 'Listas',
    checklists: 'Checklists',
    users: 'Usuarios',
    suppliers: 'Fornecedores',
    suggestions: 'Sugestoes',
    activity: 'Atividade Recente'
  };

  const sections: Record<string, React.ReactNode> = {
    summary: <SummaryCards summary={safeSummary} />,
    temporal: <TemporalCharts temporal={data.temporal} />,
    lists: <ListsSection data={data.lists} />,
    checklists: <ChecklistsSection data={data.checklists} />,
    users: <UsersSection data={data.users} />,
    suppliers: <SuppliersSection data={data.suppliers} />,
    suggestions: <SuggestionsSection data={data.suggestions} />,
    activity: (
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>
            <FontAwesomeIcon icon={faHistory} className={styles.sectionIcon} />
            Atividade Recente
          </h3>
        </div>
        <ActivityTimeline activities={data.recent_activities} />
      </div>
    )
  };

  return (
    <div className={styles.dashboardContainer}>
      {/* Header com filtros e controles */}
      <DashboardHeader
        restaurantes={restaurantes}
        selectedRestaurante={filters.restauranteId}
        period={filters.period}
        onRestauranteChange={handleRestauranteChange}
        onPeriodChange={handlePeriodChange}
        onRefresh={refetch}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        lastUpdated={lastUpdated}
        loading={loading}
      />

      {/* Alerta de loading durante refresh */}
      {loading && data && (
        <Alert variant="info" className="mb-3">
          <Spinner animation="border" size="sm" className="me-2" />
          Atualizando dados...
        </Alert>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sectionOrder} strategy={rectSortingStrategy}>
          {sectionOrder.map((sectionId) => {
            const content = sections[sectionId];
            if (!content) return null;
            const title = sectionTitles[sectionId] ?? 'Secao';
            return (
              <SortableSection key={sectionId} id={sectionId} title={title}>
                {content}
              </SortableSection>
            );
          })}
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default GlobalDashboard;
