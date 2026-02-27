// Types for Super Admin Global Dashboard

export interface DashboardFilters {
  restauranteId: number | null;
  period: number;
}

export interface UsersByRole {
  super_admin: number;
  admin: number;
  collaborator: number;
}

export interface DashboardSummary {
  total_restaurantes: number;
  total_users: number;
  users_by_role: UsersByRole;
  pending_approvals: number;
  total_listas: number;
  total_itens: number;
  total_submissoes: number;
  submissoes_hoje: number;
  pending_cotacoes: number;
  completed_cotacoes: number;
}

export interface ChartData {
  labels: string[];
  data: number[];
}

export interface TemporalData {
  submissions_per_day: ChartData;
  submissions_per_week: ChartData;
  users_created_per_month: ChartData;
  users_active_per_month: ChartData;
  submission_status_distribution: ChartData;
}

export interface QuickListsByPriority {
  prevencao: number;
  precisa_comprar: number;
  urgente: number;
}

export interface WeeklyListStatus {
  id: number;
  nome: string;
  submissoes_semana: number;
  ultima_submissao: string | null;
  status: string;
}

export interface ListsData {
  weekly_status: WeeklyListStatus[];
  quick_lists_by_priority: QuickListsByPriority;
  quick_lists_pending: number;
  approval_rate: number;
}

export interface ChecklistsData {
  active_count: number;
  completed_count: number;
  completion_rate: number;
  avg_completion_time_hours: number | null;
  recent_checklists: RecentChecklist[];
}

export interface RecentChecklist {
  id: number;
  nome: string;
  status: string;
  criado_em: string;
  total_itens: number;
  itens_marcados: number;
}

export interface MostActiveUser {
  id: number;
  nome: string;
  submissoes: number;
  restaurante: string;
}

export interface UsersData {
  new_users_timeline: ChartData;
  most_active_users: MostActiveUser[];
  admin_avg_response_time_hours: number | null;
}

export interface SupplierByRestaurant {
  restaurante: string;
  restaurante_id: number;
  total_fornecedores: number;
}

export interface SuppliersData {
  total_fornecedores: number;
  by_restaurant: SupplierByRestaurant[];
  quotation_status: {
    pendente: number;
    concluida: number;
  };
  avg_quotation_value: number | null;
}

export interface MostSuggestedItem {
  nome: string;
  count: number;
}

export interface SuggestionsData {
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  approval_rate: number;
  most_suggested_items: MostSuggestedItem[];
}

export interface NotificationsData {
  total_count: number;
  unread_count: number;
  read_rate: number;
  types_distribution: Record<string, number>;
}

export interface RecentActivity {
  type: 'submissao' | 'cotacao' | 'usuario' | 'checklist' | 'lista_rapida' | 'sugestao';
  description: string;
  timestamp: string;
  restaurante: string | null;
  id: number;
}

export interface DashboardMeta {
  generated_at: string;
  period_days: number;
  filtered_restaurante_id: number | null;
}

export interface SuperDashboardData {
  summary: DashboardSummary;
  temporal: TemporalData;
  lists: ListsData;
  checklists: ChecklistsData;
  users: UsersData;
  suppliers: SuppliersData;
  suggestions: SuggestionsData;
  notifications: NotificationsData;
  recent_activities: RecentActivity[];
  meta: DashboardMeta;
}

export interface Restaurante {
  id: number;
  nome: string;
  slug: string;
  ativo: boolean;
}

export interface DashboardState {
  data: SuperDashboardData | null;
  restaurantes: Restaurante[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}
