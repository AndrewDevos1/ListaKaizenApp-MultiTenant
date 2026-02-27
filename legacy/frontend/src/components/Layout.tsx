import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faTachometerAlt,
  faGlobe,
  faBolt,
  faShoppingCart,
  faBook,
  faClipboardCheck,
  faClipboardList,
  faListCheck,
  faLightbulb,
  faStore,
  faMapMarkerAlt,
  faMapSigns,
  faUsersCog,
  faTruck,
  faFileInvoiceDollar,
  faChartPie,
  faUserEdit,
  faKey,
  faSignOutAlt,
  faBell,
  faChevronLeft,
  faChevronRight,
  faPaperclip,
  faPen,
  faSave,
  faTimes,
  faEye,
  faEyeSlash,
  faGripLines,
  faPlus,
  faTrash,
  faBoxesStacked,
  faChartBar,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSugestoesPendentes } from '../hooks/useSugestoesPendentes';
import { useListasRapidasPendentes } from '../hooks/useListasRapidasPendentes';
import { useNotifications } from '../context/NotificationContext';
import UserAvatar from './UserAvatar';
import Breadcrumbs from './Breadcrumbs';
import TutorialController from './TutorialController';
import NotificationToasts from './NotificationToasts';
import TourWizard from './TourWizard';
import api from '../services/api';
import { formatarDataHoraBrasilia } from '../utils/dateFormatter';
import styles from './Layout.module.css';
import defaultAvatarLogo from '../assets/kaizen-logo-black.png';
import packageJson from '../../package.json';

type UserRole = 'ADMIN' | 'SUPER_ADMIN' | 'COLLABORATOR' | 'SUPPLIER';

interface MenuItemDefinition {
  key: string;
  path: string;
  icon: string;
  label: string;
  ariaLabel: string;
  roles: UserRole[];
}

interface LayoutGroup {
  id: string;
  title: string;
  items: string[];
}

interface NavbarLayoutConfig {
  groups: LayoutGroup[];
  hidden_items: string[];
  item_labels?: Record<string, string>;
}

interface MenuItemView extends MenuItemDefinition {
  hidden?: boolean;
  customLabel?: string;
}

interface MenuGroupView {
  id: string;
  title: string;
  items: MenuItemView[];
  hasConfiguredItems: boolean;
}

const VERSION_STORAGE_KEY = 'kaizen:serverVersion';
const UPDATE_REQUESTED_KEY = 'kaizen:updateRequested';

const getFrontendVersion = () => (
  process.env.REACT_APP_VERSION ||
  process.env.REACT_APP_COMMIT_SHA ||
  process.env.REACT_APP_BUILD_SHA ||
  process.env.REACT_APP_BUILD_ID ||
  packageJson.version ||
  'dev'
);

const SHORT_SHA_LENGTH = 7;
const SHA_REGEX = /^[a-f0-9]{12,}$/i;
const SEMVER_REGEX = /^v?\d+\.\d+\.\d+(?:[-+].*)?$/;

const isSemverLike = (version: string) => SEMVER_REGEX.test(version);

const toShortVersion = (version: string) => {
  if (version.startsWith('v')) {
    const raw = version.slice(1);
    if (SHA_REGEX.test(raw)) {
      return `v${raw.slice(0, SHORT_SHA_LENGTH)}`;
    }
    return version;
  }
  if (SHA_REGEX.test(version)) {
    return `v${version.slice(0, SHORT_SHA_LENGTH)}`;
  }
  return version;
};

const formatVersionLabel = (version: string) => {
  if (!version) {
    return 'v';
  }
  if (version === 'dev' || version === 'unknown') {
    return version;
  }
  return toShortVersion(version.startsWith('v') ? version : `v${version}`);
};

const isKnownVersion = (version: string) => version !== 'dev' && version !== 'unknown';

const MENU_ITEMS: MenuItemDefinition[] = [
  {
    key: 'admin_dashboard',
    path: '/admin',
    icon: 'fa-tachometer-alt',
    label: 'Dashboard Admin',
    ariaLabel: 'Dashboard - Painel de controle',
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  {
    key: 'admin_global',
    path: '/admin/global',
    icon: 'fa-globe',
    label: 'Dashboard Global',
    ariaLabel: 'Dashboard Global',
    roles: ['SUPER_ADMIN']
  },
  {
    key: 'admin_lista_rapida',
    path: '/admin/lista-rapida/criar',
    icon: 'fa-bolt',
    label: 'Lista Rápida',
    ariaLabel: 'Criar Lista Rápida',
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  {
    key: 'admin_listas_compras',
    path: '/admin/listas-compras',
    icon: 'fa-shopping-cart',
    label: 'Listas de Compras',
    ariaLabel: 'Listas de Compras',
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  {
    key: 'admin_catalogo_global',
    path: '/admin/catalogo-global',
    icon: 'fa-book',
    label: 'Itens Cadastrados',
    ariaLabel: 'Itens Cadastrados no Sistema',
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  {
    key: 'admin_itens_regionais',
    path: '/admin/itens-regionais',
    icon: 'fa-boxes-stacked',
    label: 'Itens Regionais',
    ariaLabel: 'Itens Regionais',
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  {
    key: 'admin_submissoes',
    path: '/admin/submissoes',
    icon: 'fa-clipboard-check',
    label: 'Submissões',
    ariaLabel: 'Gerenciar Submissões',
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  {
    key: 'admin_checklists',
    path: '/admin/checklists',
    icon: 'fa-list-check',
    label: 'Checklists de Compras',
    ariaLabel: 'Gerenciar Checklists de Compras',
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  {
    key: 'admin_pop_templates',
    path: '/admin/pop-templates',
    icon: 'fa-clipboard-list',
    label: 'POP Atividades',
    ariaLabel: 'Atividades POP',
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  {
    key: 'admin_pop_listas',
    path: '/admin/pop-listas',
    icon: 'fa-clipboard-check',
    label: 'POP Listas',
    ariaLabel: 'Listas de POP',
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  {
    key: 'admin_pop_auditoria',
    path: '/admin/pop-auditoria',
    icon: 'fa-clipboard-check',
    label: 'POP Auditoria',
    ariaLabel: 'Auditoria de POP',
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  {
    key: 'admin_sugestoes',
    path: '/admin/sugestoes',
    icon: 'fa-lightbulb',
    label: 'Sugestões de Itens',
    ariaLabel: 'Gerenciar Sugestões de Itens',
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  {
    key: 'admin_restaurantes',
    path: '/admin/restaurantes',
    icon: 'fa-store',
    label: 'Restaurantes',
    ariaLabel: 'Restaurantes',
    roles: ['SUPER_ADMIN']
  },
  {
    key: 'admin_solicitacoes_restaurante',
    path: '/admin/solicitacoes-restaurante',
    icon: 'fa-paperclip',
    label: 'Solicitações de Restaurante',
    ariaLabel: 'Solicitações de Restaurante',
    roles: ['SUPER_ADMIN']
  },
  {
    key: 'admin_convites_fornecedor',
    path: '/admin/convites-fornecedor',
    icon: 'fa-paperclip',
    label: 'Convites Fornecedor',
    ariaLabel: 'Convites de Fornecedor',
    roles: ['SUPER_ADMIN']
  },
  {
    key: 'admin_fornecedores_cadastrados',
    path: '/admin/fornecedores-cadastrados',
    icon: 'fa-truck',
    label: 'Fornecedores Cadastrados',
    ariaLabel: 'Fornecedores Cadastrados',
    roles: ['SUPER_ADMIN']
  },
  {
    key: 'admin_areas',
    path: '/admin/areas',
    icon: 'fa-map-marker-alt',
    label: 'Áreas',
    ariaLabel: 'Áreas',
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  {
    key: 'admin_gerenciar_usuarios',
    path: '/admin/gerenciar-usuarios',
    icon: 'fa-users-cog',
    label: 'Gerenciar Usuários',
    ariaLabel: 'Gerenciar Usuários',
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  {
    key: 'admin_fornecedores',
    path: '/admin/fornecedores',
    icon: 'fa-truck',
    label: 'Fornecedores',
    ariaLabel: 'Fornecedores',
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  {
    key: 'admin_fornecedores_regiao',
    path: '/fornecedores-regiao',
    icon: 'fa-store',
    label: 'Fornecedores da Região',
    ariaLabel: 'Fornecedores da Região',
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  {
    key: 'admin_gerar_cotacao',
    path: '/admin/gerar-cotacao',
    icon: 'fa-file-invoice-dollar',
    label: 'Gerar Cotação',
    ariaLabel: 'Gerar Cotação',
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  {
    key: 'admin_cotacoes',
    path: '/admin/cotacoes',
    icon: 'fa-chart-pie',
    label: 'Cotações',
    ariaLabel: 'Cotações',
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  {
    key: 'admin_estatisticas',
    path: '/admin/estatisticas',
    icon: 'fa-chart-bar',
    label: 'Estatísticas',
    ariaLabel: 'Dashboard de Estatísticas',
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  {
    key: 'admin_editar_perfil',
    path: '/admin/editar-perfil',
    icon: 'fa-user-edit',
    label: 'Editar Perfil',
    ariaLabel: 'Editar Perfil',
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  {
    key: 'admin_mudar_senha',
    path: '/admin/mudar-senha',
    icon: 'fa-key',
    label: 'Mudar Senha',
    ariaLabel: 'Mudar senha',
    roles: ['ADMIN', 'SUPER_ADMIN']
  },
  {
    key: 'collab_dashboard',
    path: '/collaborator',
    icon: 'fa-tachometer-alt',
    label: 'Meu Dashboard',
    ariaLabel: 'Dashboard - Painel de controle',
    roles: ['COLLABORATOR']
  },
  {
    key: 'collab_lista_rapida',
    path: '/collaborator/lista-rapida/criar',
    icon: 'fa-bolt',
    label: 'Lista Rápida',
    ariaLabel: 'Criar Lista Rápida',
    roles: ['COLLABORATOR']
  },
  {
    key: 'collab_listas',
    path: '/collaborator/listas',
    icon: 'fa-shopping-cart',
    label: 'Minhas Listas',
    ariaLabel: 'Minhas Listas',
    roles: ['COLLABORATOR']
  },
  {
    key: 'collab_pop_listas',
    path: '/collaborator/pop-listas',
    icon: 'fa-clipboard-list',
    label: 'POPs Diarios',
    ariaLabel: 'Checklists diarios',
    roles: ['COLLABORATOR']
  },
  {
    key: 'collab_pop_historico',
    path: '/collaborator/pop-historico',
    icon: 'fa-list-check',
    label: 'Historico POP',
    ariaLabel: 'Historico de POPs',
    roles: ['COLLABORATOR']
  },
  {
    key: 'collab_submissions',
    path: '/collaborator/submissions',
    icon: 'fa-clipboard-list',
    label: 'Minhas Submissões',
    ariaLabel: 'Minhas Submissões',
    roles: ['COLLABORATOR']
  },
  {
    key: 'collab_catalogo',
    path: '/collaborator/catalogo',
    icon: 'fa-book',
    label: 'Catálogo Global',
    ariaLabel: 'Catálogo Global de Itens',
    roles: ['COLLABORATOR']
  },
  {
    key: 'collab_fornecedores_regiao',
    path: '/fornecedores-regiao',
    icon: 'fa-store',
    label: 'Fornecedores da Região',
    ariaLabel: 'Fornecedores da Região',
    roles: ['COLLABORATOR']
  },
  {
    key: 'collab_sugestoes',
    path: '/collaborator/sugestoes',
    icon: 'fa-lightbulb',
    label: 'Minhas Sugestões',
    ariaLabel: 'Minhas Sugestões de Itens',
    roles: ['COLLABORATOR']
  },
  {
    key: 'collab_perfil',
    path: '/collaborator/perfil',
    icon: 'fa-user-edit',
    label: 'Editar Perfil',
    ariaLabel: 'Editar Perfil',
    roles: ['COLLABORATOR']
  },
  {
    key: 'collab_mudar_senha',
    path: '/collaborator/mudar-senha',
    icon: 'fa-key',
    label: 'Mudar Senha',
    ariaLabel: 'Mudar senha',
    roles: ['COLLABORATOR']
  },
  {
    key: 'supplier_dashboard',
    path: '/supplier/dashboard',
    icon: 'fa-tachometer-alt',
    label: 'Dashboard Fornecedor',
    ariaLabel: 'Dashboard do Fornecedor',
    roles: ['SUPPLIER']
  },
  {
    key: 'supplier_itens',
    path: '/supplier/itens',
    icon: 'fa-boxes-stacked',
    label: 'Meus Itens',
    ariaLabel: 'Itens do Fornecedor',
    roles: ['SUPPLIER']
  },
  {
    key: 'supplier_perfil',
    path: '/supplier/perfil',
    icon: 'fa-user-edit',
    label: 'Meu Perfil',
    ariaLabel: 'Perfil do Fornecedor',
    roles: ['SUPPLIER']
  },
  {
    key: 'logout',
    path: '/logout',
    icon: 'fa-sign-out-alt',
    label: 'Sair',
    ariaLabel: 'Sair do sistema',
    roles: ['ADMIN', 'SUPER_ADMIN', 'COLLABORATOR', 'SUPPLIER']
  }
];

const MENU_ITEM_MAP = MENU_ITEMS.reduce<Record<string, MenuItemDefinition>>((acc, item) => {
  acc[item.key] = item;
  return acc;
}, {});

const DEFAULT_LAYOUT: NavbarLayoutConfig = {
  groups: [
    {
      id: 'visao_geral',
      title: 'VISÃO GERAL',
      items: ['admin_dashboard', 'admin_global']
    },
    {
      id: 'listas_estoque',
      title: 'LISTAS & ESTOQUE',
      items: [
        'admin_lista_rapida',
        'admin_listas_compras',
        'admin_catalogo_global',
        'admin_itens_regionais',
        'admin_submissoes',
        'admin_checklists',
        'admin_pop_templates',
        'admin_pop_listas',
        'admin_pop_auditoria',
        'admin_sugestoes'
      ]
    },
    {
      id: 'gestao',
      title: 'GESTÃO',
      items: [
        'admin_restaurantes',
        'admin_solicitacoes_restaurante',
        'admin_convites_fornecedor',
        'admin_fornecedores_cadastrados',
        'admin_areas',
        'admin_gerenciar_usuarios',
        'admin_fornecedores',
        'admin_fornecedores_regiao',
        'admin_gerar_cotacao',
        'admin_cotacoes',
        'admin_estatisticas'
      ]
    },
    {
      id: 'dashboard_supplier',
      title: 'FORNECEDOR',
      items: ['supplier_dashboard', 'supplier_itens', 'supplier_perfil']
    },
    {
      id: 'dashboard_colaborador',
      title: 'DASHBOARD',
      items: ['collab_dashboard']
    },
    {
      id: 'minhas_atividades',
      title: 'ATIVIDADES',
      items: [
        'collab_lista_rapida',
        'collab_listas',
        'collab_submissions',
        'collab_pop_listas',
        'collab_pop_historico',
        'collab_catalogo',
        'collab_fornecedores_regiao',
        'collab_sugestoes'
      ]
    },
    {
      id: 'perfil',
      title: 'PERFIL',
      items: [
        'admin_editar_perfil',
        'admin_mudar_senha',
        'collab_perfil',
        'collab_mudar_senha',
        'supplier_perfil',
        'logout'
      ]
    }
  ],
  hidden_items: [],
  item_labels: {}
};

const MAX_RECENT_ACTIVITY_ITEMS = 6;

const normalizeForSearch = (value: string) =>
  value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const normalizeLayoutConfig = (rawLayout: any): NavbarLayoutConfig => {
  const baseLayout = rawLayout && Array.isArray(rawLayout.groups) ? rawLayout : DEFAULT_LAYOUT;
  const hiddenItems = Array.isArray(rawLayout?.hidden_items) ? rawLayout.hidden_items : [];
  const rawLabels = rawLayout?.item_labels;
  const validLabels: Record<string, string> = {};
  if (rawLabels && typeof rawLabels === 'object') {
    Object.entries(rawLabels).forEach(([itemKey, labelValue]) => {
      if (MENU_ITEM_MAP[itemKey] && typeof labelValue === 'string') {
        const trimmed = labelValue.trim();
        if (trimmed) {
          validLabels[itemKey] = trimmed;
        }
      }
    });
  }

  const usedItems = new Set<string>();
  const groups: LayoutGroup[] = (baseLayout.groups || []).map((group: any) => {
    const items = Array.isArray(group.items) ? group.items : [];
    const cleanedItems = items.filter((itemKey: string) => {
      if (!MENU_ITEM_MAP[itemKey]) {
        return false;
      }
      if (usedItems.has(itemKey)) {
        return false;
      }
      usedItems.add(itemKey);
      return true;
    });

    const groupId = String(group.id || group.title || '');
    let groupTitle = String(group.title || '').trim() || 'SEM NOME';
    if (groupId === 'minhas_atividades') {
      groupTitle = 'ATIVIDADES';
    }

    return {
      id: groupId,
      title: groupTitle,
      items: cleanedItems
    };
  }).filter((group: LayoutGroup) => group.id);

  const missingItems = MENU_ITEMS
    .map((item) => item.key)
    .filter((itemKey) => !usedItems.has(itemKey));

  if (missingItems.length > 0) {
    let outrosGroup = groups.find((group) => group.id === 'outros');
    if (!outrosGroup) {
      outrosGroup = { id: 'outros', title: 'OUTROS', items: [] };
      groups.push(outrosGroup);
    }
    outrosGroup.items = [...outrosGroup.items, ...missingItems];
  }

  const validHiddenItems = hiddenItems.filter((itemKey: string) => MENU_ITEM_MAP[itemKey]);

  return {
    groups,
    hidden_items: validHiddenItems,
    item_labels: validLabels
  };
};

const filterLayoutByRoles = (layout: NavbarLayoutConfig, roles: string[]): NavbarLayoutConfig => {
  const allowedRoles = new Set(roles);
  const isAllowedItem = (itemKey: string) => {
    const item = MENU_ITEM_MAP[itemKey];
    return Boolean(item && item.roles.some((role) => allowedRoles.has(role)));
  };

  return {
    ...layout,
    groups: layout.groups.map((group) => ({
      ...group,
      items: group.items.filter(isAllowedItem)
    })),
    hidden_items: (layout.hidden_items || []).filter(isAllowedItem),
    item_labels: layout.item_labels
      ? Object.fromEntries(
          Object.entries(layout.item_labels).filter(([itemKey]) => isAllowedItem(itemKey))
        )
      : {}
  };
};

const getAllowedRoles = (role?: string) => {
  if (role === 'SUPER_ADMIN') {
    return ['SUPER_ADMIN', 'ADMIN'];
  }
  if (role === 'ADMIN') {
    return ['ADMIN'];
  }
  if (role === 'COLLABORATOR') {
    return ['COLLABORATOR'];
  }
  if (role === 'SUPPLIER') {
    return ['SUPPLIER'];
  }
  return [];
};

const Layout: React.FC = () => {
  const [isToggled, setIsToggled] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(
    localStorage.getItem('sidebarCollapsed') === 'true'
  );
  const [isMobile, setIsMobile] = React.useState(() => window.innerWidth < 768);
  const [isMobileCollapsed, setIsMobileCollapsed] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [recentActivityKeys, setRecentActivityKeys] = React.useState<string[]>([]);
  const [editingItemKey, setEditingItemKey] = React.useState<string | null>(null);
  const [itemLabelDraft, setItemLabelDraft] = React.useState('');
  const editingItemInputRef = React.useRef<HTMLInputElement | null>(null);
  const [expandedGroups, setExpandedGroups] = React.useState<{ [key: string]: boolean }>({});
  const [preferencesLoaded, setPreferencesLoaded] = React.useState(false);
  const [savedExpandedGroups, setSavedExpandedGroups] = React.useState<{ [key: string]: boolean }>({});
  const [layoutConfig, setLayoutConfig] = React.useState<NavbarLayoutConfig>(DEFAULT_LAYOUT);
  const [layoutLoaded, setLayoutLoaded] = React.useState(false);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [isSavingLayout, setIsSavingLayout] = React.useState(false);
  const [editRole, setEditRole] = React.useState<UserRole>('ADMIN');
  const [newGroupName, setNewGroupName] = React.useState('');
  const [dragData, setDragData] = React.useState<{
    type: 'group' | 'item';
    groupId?: string;
    itemKey?: string;
  } | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = React.useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = React.useState<{ groupId: string; itemKey: string; insertAfter: boolean } | null>(null);
  const [editingGroupId, setEditingGroupId] = React.useState<string | null>(null);
  const editingGroupOriginalTitleRef = React.useRef<string | null>(null);
  const groupTitleInputRef = React.useRef<HTMLInputElement | null>(null);
  const layoutBackupRef = React.useRef<NavbarLayoutConfig | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showOnlineNotice, setShowOnlineNotice] = React.useState(false);
  const [appVersion] = React.useState(() => getFrontendVersion());
  const [serverVersion, setServerVersion] = React.useState<string | null>(null);
  const [swUpdateAvailable, setSwUpdateAvailable] = React.useState(false);
  const [versionUpdateAvailable, setVersionUpdateAvailable] = React.useState(false);
  const [showUpdateSuccess, setShowUpdateSuccess] = React.useState(false);
  const swRegistrationRef = React.useRef<ServiceWorkerRegistration | null>(null);
  const isRefreshingRef = React.useRef(false);
  const [isExitingImpersonation, setIsExitingImpersonation] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user, login } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { count: sugestoesPendentes } = useSugestoesPendentes(user?.role);
  const { count: listasRapidasPendentes } = useListasRapidasPendentes(user?.role);
  const { notifications, unreadCount, addNotification, markAllRead, markRead, clearAll } = useNotifications();
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const notificationsRef = React.useRef<HTMLDivElement>(null);
  const sugestoesPrevRef = React.useRef<number | null>(null);
  const listasRapidasPrevRef = React.useRef<number | null>(null);
  const dashboardRoutes = new Set(['/admin', '/admin/global', '/collaborator', '/supplier', '/supplier/dashboard']);
  const isDashboardRoute = dashboardRoutes.has(location.pathname);
  const updateAvailable = swUpdateAvailable || versionUpdateAvailable;
  const displayVersion = isSemverLike(appVersion) ? appVersion : (serverVersion || appVersion);
  const versionLabel = formatVersionLabel(displayVersion);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const impersonationActive = Boolean(user?.impersonated_by);
  const isMenuCollapsed = isMobile ? isMobileCollapsed : isCollapsed;
  const layoutRole = isSuperAdmin ? editRole : (user?.role as UserRole | undefined);
  const hiddenItemKeys = React.useMemo(() => layoutConfig.hidden_items || [], [layoutConfig.hidden_items]);
  const hiddenItems = React.useMemo(() => new Set(hiddenItemKeys), [hiddenItemKeys]);
  const itemLabelOverrides = React.useMemo(() => layoutConfig.item_labels || {}, [layoutConfig.item_labels]);

  // Mapeamento de strings para objetos FontAwesome
  const iconMap: Record<string, IconDefinition> = {
    'fa-tachometer-alt': faTachometerAlt,
    'fa-globe': faGlobe,
    'fa-bolt': faBolt,
    'fa-shopping-cart': faShoppingCart,
    'fa-book': faBook,
    'fa-clipboard-check': faClipboardCheck,
    'fa-clipboard-list': faClipboardList,
    'fa-list-check': faListCheck,
    'fa-lightbulb': faLightbulb,
    'fa-store': faStore,
    'fa-map-marker-alt': faMapMarkerAlt,
    'fa-users-cog': faUsersCog,
    'fa-truck': faTruck,
    'fa-file-invoice-dollar': faFileInvoiceDollar,
    'fa-chart-pie': faChartPie,
    'fa-user-edit': faUserEdit,
    'fa-key': faKey,
    'fa-sign-out-alt': faSignOutAlt,
    'fa-paperclip': faPaperclip,
    'fa-boxes-stacked': faBoxesStacked,
    'fa-chart-bar': faChartBar,
  };

  const getLabelForItem = (item: MenuItemView) => {
    if (item.customLabel && item.customLabel.trim()) {
      return item.customLabel;
    }
    return item.label;
  };

  const allowedRoles = getAllowedRoles(layoutRole);

  const menuGroups: MenuGroupView[] = React.useMemo(() => {
    return layoutConfig.groups.map((group) => {
      const configuredItemsCount = group.items.filter((itemKey) => {
        const item = MENU_ITEM_MAP[itemKey];
        if (!item) {
          return false;
        }
        const isAllowed = item.roles.some((role) => allowedRoles.includes(role));
        if (!isAllowed) {
          return false;
        }
        if (!isEditMode && hiddenItems.has(itemKey)) {
          return false;
        }
        return true;
      }).length;

      const items = group.items
        .map((itemKey) => {
          const item = MENU_ITEM_MAP[itemKey];
          if (!item) {
            return null;
          }
          const isAllowed = item.roles.some((role) => allowedRoles.includes(role));
          if (!isAllowed) {
            return null;
          }
          if (!isEditMode && hiddenItems.has(itemKey)) {
            return null;
          }
          return {
            ...item,
            hidden: hiddenItems.has(itemKey),
            customLabel: itemLabelOverrides[itemKey]
          };
        })
        .filter(Boolean) as MenuItemView[];

      return {
        id: group.id,
        title: group.title,
        items,
        hasConfiguredItems: group.id === 'minhas_atividades' ? true : configuredItemsCount > 0
      };
    });
  }, [allowedRoles, layoutConfig, isEditMode, hiddenItems, itemLabelOverrides]);

  const recentActivityItems: MenuItemView[] = React.useMemo(() => {
    const excludedKeys = new Set([
      'admin_dashboard',
      'admin_global',
      'collab_dashboard',
      'supplier_dashboard'
    ]);
    const items: MenuItemView[] = [];
    for (const itemKey of recentActivityKeys) {
      if (items.length >= MAX_RECENT_ACTIVITY_ITEMS) {
        break;
      }
      if (excludedKeys.has(itemKey)) {
        continue;
      }
      const item = MENU_ITEM_MAP[itemKey];
      if (!item) {
        continue;
      }
      const isAllowed = item.roles.some((role) => allowedRoles.includes(role));
      if (!isAllowed || hiddenItems.has(itemKey)) {
        continue;
      }
      items.push({
        ...item,
        hidden: false,
        customLabel: itemLabelOverrides[itemKey]
      });
    }
    return items;
  }, [recentActivityKeys, allowedRoles, hiddenItems, itemLabelOverrides]);

  const groupsForDisplay = React.useMemo(() => {
    if (isEditMode) {
      return menuGroups;
    }
    return menuGroups.map((group) => {
      if (group.id === 'minhas_atividades') {
        return {
          ...group,
          items: recentActivityItems,
          hasConfiguredItems: true
        };
      }
      return group;
    });
  }, [isEditMode, menuGroups, recentActivityItems]);

  const filteredGroups = React.useMemo(() => {
    const baseGroups = isEditMode
      ? groupsForDisplay
      : groupsForDisplay.filter(
        (group) => group.items.length > 0 || (isSuperAdmin && group.hasConfiguredItems)
      );

    const normalizedTerm = normalizeForSearch(searchTerm.trim());
    if (!normalizedTerm) {
      return baseGroups;
    }

    const filtered = baseGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          normalizeForSearch(getLabelForItem(item)).includes(normalizedTerm)
        )
      }))
      .filter((group) => group.items.length > 0);

    if (!isEditMode && filtered.length > 0) {
      const newExpandedGroups = { ...expandedGroups };
      filtered.forEach((group) => {
        newExpandedGroups[group.id] = true;
      });
      if (JSON.stringify(newExpandedGroups) !== JSON.stringify(expandedGroups)) {
        setExpandedGroups(newExpandedGroups);
      }
    }

    return filtered;
  }, [searchTerm, groupsForDisplay, expandedGroups, isEditMode, isSuperAdmin]);

  const handleToggle = () => {
    if (!isMobile) {
      setIsToggled(!isToggled);
      return;
    }

    if (!isToggled) {
      setIsMobileCollapsed(true);
      setIsToggled(true);
      return;
    }

    if (isMobileCollapsed) {
      setIsMobileCollapsed(false);
      return;
    }

    setIsToggled(false);
    setIsMobileCollapsed(true);
  };

  const handleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    localStorage.setItem('sidebarCollapsed', newCollapsed.toString());
  };

  const canEditNavbar = isSuperAdmin && !isMobile && !isMenuCollapsed && layoutLoaded;

  const handleEnterEditMode = () => {
    if (!canEditNavbar) return;
    layoutBackupRef.current = JSON.parse(JSON.stringify(layoutConfig));
    setIsEditMode(true);
    setSearchTerm('');
  };

  const handleCancelEditMode = () => {
    if (layoutBackupRef.current) {
      setLayoutConfig(layoutBackupRef.current);
    }
    setIsEditMode(false);
    setDragData(null);
    setDragOverGroupId(null);
    setDragOverItem(null);
    setEditingGroupId(null);
    editingGroupOriginalTitleRef.current = null;
    closeItemEditor();
  };

  const handleSaveLayout = async () => {
    if (!canEditNavbar) return;

    try {
      setIsSavingLayout(true);
      const payload: { layout: NavbarLayoutConfig; role?: UserRole } = { layout: layoutConfig };
      if (isSuperAdmin && isEditMode && layoutRole) {
        payload.role = layoutRole;
      }
      const response = await api.post('/auth/navbar-layout', payload);
      setLayoutConfig(normalizeLayoutConfig(response.data?.layout || layoutConfig));
      setIsEditMode(false);
      layoutBackupRef.current = null;
      setEditingGroupId(null);
      editingGroupOriginalTitleRef.current = null;
      closeItemEditor();
    } catch (error) {
      console.error('[NAVBAR] Erro ao salvar layout:', error);
    } finally {
      setIsSavingLayout(false);
    }
  };

  const handleAddGroup = () => {
    const nome = newGroupName.trim();
    if (!nome) return;

    const id = `grupo-${Date.now()}`;
    setLayoutConfig((prev) => ({
      ...prev,
      groups: [...prev.groups, { id, title: nome, items: [] }]
    }));
    setNewGroupName('');
  };

  const handleRenameGroup = (groupId: string, title: string) => {
    setLayoutConfig((prev) => ({
      ...prev,
      groups: prev.groups.map((group) =>
        group.id === groupId ? { ...group, title } : group
      )
    }));
  };

  const handleDeleteGroup = (groupId: string) => {
    setLayoutConfig((prev) => {
      const group = prev.groups.find((item) => item.id === groupId);
      if (!group || group.items.length > 0) {
        return prev;
      }
      return {
        ...prev,
        groups: prev.groups.filter((item) => item.id !== groupId)
      };
    });
  };

  const handleGroupTitleDoubleClick = (group: MenuGroupView) => (event: React.MouseEvent) => {
    if (!canEditNavbar || !isEditMode) return;
    event.preventDefault();
    event.stopPropagation();
    editingGroupOriginalTitleRef.current = group.title;
    setEditingGroupId(group.id);
  };

  const handleGroupTitleKeyDown = (groupId: string) => (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      setEditingGroupId(null);
      editingGroupOriginalTitleRef.current = null;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      if (editingGroupOriginalTitleRef.current) {
        handleRenameGroup(groupId, editingGroupOriginalTitleRef.current);
      }
      setEditingGroupId(null);
      editingGroupOriginalTitleRef.current = null;
    }
  };

  const handleGroupTitleBlur = () => {
    setEditingGroupId(null);
    editingGroupOriginalTitleRef.current = null;
  };

  const closeItemEditor = () => {
    setEditingItemKey(null);
    setItemLabelDraft('');
    editingItemInputRef.current = null;
  };

  const handleItemLabelSave = (itemKey: string, value: string) => {
    const trimmed = value.trim();
    setLayoutConfig((prev) => {
      const existing = prev.item_labels || {};
      const updated = { ...existing };
      if (trimmed) {
        updated[itemKey] = trimmed;
      } else {
        delete updated[itemKey];
      }
      return { ...prev, item_labels: updated };
    });
    closeItemEditor();
  };

  const handleItemLabelDoubleClick = (item: MenuItemView) => (event: React.MouseEvent) => {
    if (!canEditNavbar || !isEditMode) return;
    event.preventDefault();
    event.stopPropagation();
    setEditingItemKey(item.key);
    setItemLabelDraft(getLabelForItem(item));
  };

  const handleItemLabelKeyDown = (itemKey: string) => (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleItemLabelSave(itemKey, itemLabelDraft);
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closeItemEditor();
    }
  };

  const handleItemLabelBlur = (itemKey: string) => () => {
    if (editingItemKey !== itemKey) return;
    handleItemLabelSave(itemKey, itemLabelDraft);
  };

  const toggleItemHidden = (itemKey: string) => {
    setLayoutConfig((prev) => {
      const hidden = new Set(prev.hidden_items || []);
      if (hidden.has(itemKey)) {
        hidden.delete(itemKey);
      } else {
        hidden.add(itemKey);
      }
      return {
        ...prev,
        hidden_items: Array.from(hidden)
      };
    });
  };

  const toggleGroupHidden = (groupId: string) => {
    const group = menuGroups.find((g) => g.id === groupId);
    if (!group || group.items.length === 0) return;
    const groupItemKeys = group.items.map((item) => item.key);
    const allHidden = groupItemKeys.every((key) => hiddenItems.has(key));
    setLayoutConfig((prev) => {
      const hidden = new Set(prev.hidden_items || []);
      if (allHidden) {
        groupItemKeys.forEach((key) => hidden.delete(key));
      } else {
        groupItemKeys.forEach((key) => hidden.add(key));
      }
      return { ...prev, hidden_items: Array.from(hidden) };
    });
  };

  const moveGroup = (fromId: string, toId: string) => {
    if (fromId === toId) return;

    setLayoutConfig((prev) => {
      const groups = [...prev.groups];
      const fromIndex = groups.findIndex((group) => group.id === fromId);
      const toIndex = groups.findIndex((group) => group.id === toId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const [moved] = groups.splice(fromIndex, 1);
      groups.splice(toIndex, 0, moved);
      return { ...prev, groups };
    });
  };

  const moveItem = (
    itemKey: string,
    toGroupId: string,
    targetItemKey?: string,
    insertAfter?: boolean
  ) => {
    setLayoutConfig((prev) => {
      const groups = prev.groups.map((group) => {
        const filteredItems = group.items.filter((key) => key !== itemKey);
        if (group.id === toGroupId) {
          const insertIndex = targetItemKey
            ? filteredItems.indexOf(targetItemKey)
            : -1;
          if (insertIndex >= 0) {
            const finalIndex = insertAfter ? insertIndex + 1 : insertIndex;
            filteredItems.splice(finalIndex, 0, itemKey);
          } else {
            filteredItems.push(itemKey);
          }
        }
        return { ...group, items: filteredItems };
      });
      return { ...prev, groups };
    });
  };

  const handleDragStart = (
    type: 'group' | 'item',
    payload: { groupId: string; itemKey?: string }
  ) => (event: React.DragEvent) => {
    if (!isEditMode) return;
    if (event.detail > 1) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', payload.groupId);
    setDragData({ type, groupId: payload.groupId, itemKey: payload.itemKey });
  };

  const handleDragEnd = () => {
    setDragData(null);
    setDragOverGroupId(null);
    setDragOverItem(null);
  };

  const handleGroupDragOver = (groupId: string) => (event: React.DragEvent) => {
    if (!isEditMode) return;
    event.preventDefault();
    setDragOverGroupId(groupId);
  };

  const handleGroupDrop = (groupId: string) => (event: React.DragEvent) => {
    if (!isEditMode || !dragData) return;
    event.preventDefault();
    if (dragData.type === 'group' && dragData.groupId) {
      moveGroup(dragData.groupId, groupId);
    }
    if (dragData.type === 'item' && dragData.itemKey) {
      if (dragOverItem && dragOverItem.groupId === groupId) {
        moveItem(dragData.itemKey, groupId, dragOverItem.itemKey, dragOverItem.insertAfter);
      } else {
        moveItem(dragData.itemKey, groupId);
      }
    }
    handleDragEnd();
  };

  const handleItemDragOver = (groupId: string, itemKey: string) => (event: React.DragEvent) => {
    if (!isEditMode) return;
    event.preventDefault();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const insertAfter = event.clientY > rect.top + rect.height / 2;
    setDragOverItem({ groupId, itemKey, insertAfter });
  };

  const handleItemDrop = (groupId: string, itemKey: string) => (event: React.DragEvent) => {
    if (!isEditMode || !dragData || dragData.type !== 'item' || !dragData.itemKey) return;
    event.preventDefault();
    if (dragData.itemKey === itemKey && dragData.groupId === groupId) {
      handleDragEnd();
      return;
    }
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const insertAfter = event.clientY > rect.top + rect.height / 2;
    moveItem(dragData.itemKey, groupId, itemKey, insertAfter);
    handleDragEnd();
  };

  // Carregar layout global da navbar
  React.useEffect(() => {
    const loadNavbarLayout = async () => {
      if (!user || !layoutRole) return;

      try {
        const response = await api.get('/auth/navbar-layout', {
          params: isSuperAdmin ? { role: layoutRole } : undefined
        });
        const normalized = normalizeLayoutConfig(response.data?.layout);
        const filtered = filterLayoutByRoles(normalized, getAllowedRoles(layoutRole));
        setLayoutConfig(filtered);
        if (isEditMode) {
          layoutBackupRef.current = JSON.parse(JSON.stringify(filtered));
        }
      } catch (error) {
        console.error('[NAVBAR] Erro ao carregar layout:', error);
        const normalized = normalizeLayoutConfig(null);
        const filtered = filterLayoutByRoles(normalized, getAllowedRoles(layoutRole));
        setLayoutConfig(filtered);
      } finally {
        setLayoutLoaded(true);
      }
    };

    loadNavbarLayout();
  }, [user, layoutRole, isSuperAdmin]);

  // Carregar preferências da navbar do backend
  React.useEffect(() => {
    const loadNavbarPreferences = async () => {
      if (!user) return;

      try {
        const response = await api.get('/auth/navbar-preferences');
        const { categorias_estado } = response.data;
        setSavedExpandedGroups(categorias_estado || {});
      } catch (error) {
        console.error('[NAVBAR] Erro ao carregar preferências:', error);
        setSavedExpandedGroups({});
      } finally {
        setPreferencesLoaded(true);
      }
    };

    loadNavbarPreferences();
  }, [user]);

  React.useEffect(() => {
    const loadRecentActivity = async () => {
      if (!user) {
        setRecentActivityKeys([]);
        return;
      }
      setRecentActivityKeys([]);
      try {
        const response = await api.get('/auth/navbar-activity');
        setRecentActivityKeys(response.data?.items || []);
      } catch (error) {
        console.error('[NAVBAR] Erro ao carregar atividades recentes:', error);
        setRecentActivityKeys([]);
      }
    };

    loadRecentActivity();
  }, [user]);

  // Sincroniza expansão de grupos com layout atual
  React.useEffect(() => {
    if (!layoutLoaded || !preferencesLoaded) return;

    setExpandedGroups((prev) => {
      const next = { ...prev };
      layoutConfig.groups.forEach((group) => {
        if (next[group.id] === undefined) {
          next[group.id] = savedExpandedGroups[group.id] ??
            savedExpandedGroups[group.title] ??
            false;
        }
      });
      return next;
    });
  }, [layoutLoaded, preferencesLoaded, layoutConfig, savedExpandedGroups]);

  // Salvar preferências da navbar no backend
  const saveNavbarPreferences = async (newExpandedGroups: { [key: string]: boolean }) => {
    if (!user || !preferencesLoaded) return;

    try {
      await api.post('/auth/navbar-preferences', {
        categorias_estado: newExpandedGroups
      });
    } catch (error) {
      console.error('[NAVBAR] Erro ao salvar preferências:', error);
    }
  };

  // Toggle de categoria (expandir/colapsar)
  const toggleGroup = (groupId: string) => {
    const newExpandedGroups = {
      ...expandedGroups,
      [groupId]: !expandedGroups[groupId]
    };
    setExpandedGroups(newExpandedGroups);
    saveNavbarPreferences(newExpandedGroups);
  };

  const handleOverlayClick = () => {
    setIsNotificationsOpen(false);
    setIsToggled(false);
    if (isMobile) {
      setIsMobileCollapsed(true);
    }
  };

  const handleLinkClick = () => {
    setIsNotificationsOpen(false);
    if (isMobile) {
      setIsToggled(false);
      setIsMobileCollapsed(true);
    }
  };

  const handleStartTour = () => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event('wizard-start'));
  };

  const recordNavbarActivity = React.useCallback(async (itemKey?: string) => {
    if (!user || !itemKey) return;
    try {
      await api.post('/auth/navbar-activity', { item_key: itemKey });
    } catch (error) {
      console.error('[NAVBAR] Erro ao registrar atividade:', error);
    }
  }, [user]);

  const handleMenuItemClick = (itemKey?: string) => {
    if (editingItemKey && editingItemKey === itemKey) {
      return;
    }
    handleLinkClick();
    if (!itemKey) return;
    setRecentActivityKeys((prev) => {
      const next = [itemKey, ...prev.filter((key) => key !== itemKey)];
      return next.slice(0, MAX_RECENT_ACTIVITY_ITEMS);
    });
    void recordNavbarActivity(itemKey);
  };

  const handleSearchFocus = () => {
    if (isCollapsed && window.innerWidth >= 768) {
      setIsCollapsed(false);
      localStorage.setItem('sidebarCollapsed', 'false');
    }
  };

  React.useEffect(() => {
    if (!user) return;
    setEditRole(user.role as UserRole);
  }, [user]);

  const formatNotificationTime = (isoDate: string) => {
    if (!isoDate) return '';
    return formatarDataHoraBrasilia(isoDate);
  };

  React.useEffect(() => {
    if (!isAdmin) return;

    if (sugestoesPrevRef.current === null) {
      sugestoesPrevRef.current = sugestoesPendentes;
      return;
    }

    if (sugestoesPendentes > sugestoesPrevRef.current) {
      const delta = sugestoesPendentes - sugestoesPrevRef.current;
      addNotification({
        title: 'Novas sugestões pendentes',
        message:
          delta === 1
            ? '1 nova sugestão aguardando análise.'
            : `${delta} novas sugestões aguardando análise.`,
        type: 'warning',
        link: '/admin/sugestoes',
      });
    }

    sugestoesPrevRef.current = sugestoesPendentes;
  }, [sugestoesPendentes, isAdmin, addNotification]);

  React.useEffect(() => {
    if (!isAdmin) return;

    if (listasRapidasPrevRef.current === null) {
      listasRapidasPrevRef.current = listasRapidasPendentes;
      return;
    }

    if (listasRapidasPendentes > listasRapidasPrevRef.current) {
      const delta = listasRapidasPendentes - listasRapidasPrevRef.current;
      addNotification({
        title: 'Novas listas rápidas pendentes',
        message:
          delta === 1
            ? '1 lista rápida aguardando aprovação.'
            : `${delta} listas rápidas aguardando aprovação.`,
        type: 'info',
        link: '/admin/listas-rapidas',
      });
    }

    listasRapidasPrevRef.current = listasRapidasPendentes;
  }, [listasRapidasPendentes, isAdmin, addNotification]);

  React.useEffect(() => {
    if (!isNotificationsOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!notificationsRef.current) return;
      if (!notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [isNotificationsOpen]);

  React.useEffect(() => {
    setIsNotificationsOpen(false);
  }, [location.pathname]);

  React.useEffect(() => {
    if (!isEditMode) {
      setEditingGroupId(null);
      editingGroupOriginalTitleRef.current = null;
    }
  }, [isEditMode]);

  React.useEffect(() => {
    if (!isEditMode) {
      closeItemEditor();
      return;
    }
    if (editingItemKey && editingItemInputRef.current) {
      editingItemInputRef.current.focus();
      editingItemInputRef.current.select();
    }
  }, [editingItemKey, isEditMode]);

  React.useEffect(() => {
    if (!editingGroupId) {
      groupTitleInputRef.current = null;
      return;
    }
    if (groupTitleInputRef.current) {
      groupTitleInputRef.current.focus();
      groupTitleInputRef.current.select();
    }
  }, [editingGroupId]);

  React.useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }
    const handleControllerChange = () => {
      if (isRefreshingRef.current) {
        return;
      }
      isRefreshingRef.current = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const setNetworkStatus = React.useCallback((nextOnline: boolean) => {
    setIsOnline((prev) => {
      if (prev === nextOnline) {
        return prev;
      }
      if (nextOnline) {
        setShowOnlineNotice(true);
      } else {
        setShowOnlineNotice(false);
      }
      return nextOnline;
    });
  }, []);

  React.useEffect(() => {
    const handleOnline = () => setNetworkStatus(true);
    const handleOffline = () => setNetworkStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setNetworkStatus]);

  React.useEffect(() => {
    const handleNetworkStatus = (event: Event) => {
      const detail = (event as CustomEvent<{ status?: string }>).detail;
      if (!detail?.status) {
        return;
      }
      if (detail.status === 'offline') {
        setNetworkStatus(false);
        return;
      }
      if (detail.status === 'online') {
        setNetworkStatus(true);
      }
    };

    window.addEventListener('kaizen-network-status', handleNetworkStatus as EventListener);
    return () => {
      window.removeEventListener('kaizen-network-status', handleNetworkStatus as EventListener);
    };
  }, [setNetworkStatus]);

  React.useEffect(() => {
    const handleSwUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ registration?: ServiceWorkerRegistration }>).detail;
      if (!detail?.registration) {
        return;
      }
      swRegistrationRef.current = detail.registration;
      setSwUpdateAvailable(true);
    };
    window.addEventListener('kaizen-sw-update', handleSwUpdate as EventListener);
    return () => {
      window.removeEventListener('kaizen-sw-update', handleSwUpdate as EventListener);
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    const fetchServerVersion = async () => {
      try {
        const response = await api.get('/v1/health');
        const version = response.data?.version;
        if (!version || cancelled) {
          return;
        }

        setServerVersion(version);

        const updateRequested = localStorage.getItem(UPDATE_REQUESTED_KEY);
        const shouldCompareSemver = isKnownVersion(appVersion) && isSemverLike(appVersion) && isSemverLike(version);

        if (shouldCompareSemver) {
          if (version !== appVersion) {
            setVersionUpdateAvailable(true);
          } else {
            setVersionUpdateAvailable(false);
            localStorage.setItem(VERSION_STORAGE_KEY, version);
          }
          if (updateRequested && version === appVersion) {
            setShowUpdateSuccess(true);
            localStorage.removeItem(UPDATE_REQUESTED_KEY);
          }
          return;
        }

        const storedVersion = localStorage.getItem(VERSION_STORAGE_KEY);
        if (!storedVersion) {
          localStorage.setItem(VERSION_STORAGE_KEY, version);
          setVersionUpdateAvailable(false);
          return;
        }

        if (storedVersion !== version) {
          setVersionUpdateAvailable(true);
        } else {
          setVersionUpdateAvailable(false);
          if (updateRequested) {
            setShowUpdateSuccess(true);
            localStorage.removeItem(UPDATE_REQUESTED_KEY);
          }
        }
      } catch (error) {
        // Silencia erros de rede para evitar ruído no layout.
      }
    };

    fetchServerVersion();

    return () => {
      cancelled = true;
    };
  }, [appVersion]);

  const handleAppUpdate = () => {
    if (serverVersion) {
      localStorage.setItem(VERSION_STORAGE_KEY, serverVersion);
    }
    localStorage.setItem(UPDATE_REQUESTED_KEY, '1');
    const registration = swRegistrationRef.current;
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      return;
    }
    window.location.reload();
  };

  const handleExitImpersonation = async () => {
    if (isExitingImpersonation) {
      return;
    }
    setIsExitingImpersonation(true);
    try {
      const response = await api.post('/admin/impersonar/encerrar');
      const token = response.data?.access_token;
      if (token) {
        login(token);
      } else {
        logout();
      }
    } catch (error) {
      logout();
    } finally {
      setIsExitingImpersonation(false);
    }
  };

  React.useEffect(() => {
    if (!showOnlineNotice) {
      return;
    }
    const timeoutId = window.setTimeout(() => setShowOnlineNotice(false), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [showOnlineNotice]);

  React.useEffect(() => {
    if (!showUpdateSuccess) {
      return;
    }
    const timeoutId = window.setTimeout(() => setShowUpdateSuccess(false), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [showUpdateSuccess]);

  // Close sidebar with Escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isToggled) {
        setIsToggled(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isToggled]);

  // Keyboard shortcut "/" to focus search
  React.useEffect(() => {
    const handleSlashKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleSlashKey);
    return () => document.removeEventListener('keydown', handleSlashKey);
  }, []);

  // Reset toggle state when resizing to desktop
  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      if (!mobile && isToggled) {
        setIsToggled(false);
        setIsMobileCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isToggled]);

  React.useEffect(() => {
    if (!isEditMode || canEditNavbar) return;
    if (layoutBackupRef.current) {
      setLayoutConfig(layoutBackupRef.current);
    }
    setIsEditMode(false);
    setDragData(null);
    setDragOverGroupId(null);
    setDragOverItem(null);
  }, [isEditMode, canEditNavbar]);

  // Touch gesture handlers (swipe)
  const [touchStart, setTouchStart] = React.useState<number | null>(null);
  const [touchEnd, setTouchEnd] = React.useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && touchStart > window.innerWidth - 50) {
      // Swipe from right edge (open sidebar)
      setIsToggled(true);
      setIsMobileCollapsed(true);
    } else if (isRightSwipe && isToggled) {
      // Swipe to the right (close sidebar)
      setIsToggled(false);
      setIsMobileCollapsed(true);
    }
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getLinkClass = (path: string) => {
    return location.pathname === path
      ? `${styles.listGroupItem} ${styles.active}`
      : styles.listGroupItem;
  };

  return (
    <div
      className={`d-flex ${isToggled ? styles.toggled : ''} ${isMenuCollapsed ? styles.collapsed : ''} ${styles.wrapper}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <TourWizard />
      <div className="wizard-spotlight" aria-hidden="true" />
      {/* Overlay (mobile only) */}
      <div
        className={styles.overlay}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <nav
        className={styles.sidebarWrapper}
        role="navigation"
        aria-label="Menu principal"
        data-wizard-target="nav"
      >
        {/* Header */}
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarHeading}>
            <i className="fas fa-stream me-2" aria-hidden="true"></i>
            {!isMenuCollapsed && <span>Kaizen</span>}
          </div>

          <div className={styles.headerActions}>
            {isSuperAdmin && (
              <button
                type="button"
                className={styles.notificationButton}
                onClick={() => {
                  navigate('/admin/convites-fornecedor');
                  handleLinkClick();
                }}
                aria-label="Convites de fornecedor"
                title="Convites de fornecedor"
              >
                <FontAwesomeIcon icon={faPaperclip} />
              </button>
            )}
            <div className={styles.notificationWrapper} ref={notificationsRef}>
              <button
                type="button"
                className={styles.notificationButton}
                onClick={() => setIsNotificationsOpen((prev) => !prev)}
                aria-label="Notificações"
                aria-expanded={isNotificationsOpen}
                aria-haspopup="dialog"
                title="Notificações"
                data-wizard-target="nav-notifications"
              >
                <FontAwesomeIcon icon={faBell} />
                {unreadCount > 0 && (
                  <span className={styles.notificationBadge}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className={styles.notificationPanel} role="dialog" aria-label="Notificações">
                  <div className={styles.notificationPanelHeader}>
                    <span>Notificações</span>
                    {notifications.length > 0 && (
                      <div className={styles.notificationPanelActions}>
                        <button
                          type="button"
                          className={styles.notificationPanelButton}
                          onClick={markAllRead}
                        >
                          Marcar como lidas
                        </button>
                        <button
                          type="button"
                          className={styles.notificationPanelButton}
                          onClick={clearAll}
                        >
                          Limpar
                        </button>
                      </div>
                    )}
                  </div>
                  <div className={styles.notificationList}>
                    {notifications.length === 0 ? (
                      <div className={styles.notificationEmpty}>Nenhuma notificação por aqui.</div>
                    ) : (
                      notifications.map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          className={`${styles.notificationItem} ${!item.read ? styles.notificationUnread : ''}`}
                          onClick={() => {
                            markRead(item.id);
                            if (item.link) {
                              navigate(item.link);
                              handleLinkClick();
                            }
                            setIsNotificationsOpen(false);
                          }}
                        >
                          <div className={styles.notificationTitle}>{item.title}</div>
                          {item.message && (
                            <div className={styles.notificationMessage}>{item.message}</div>
                          )}
                          <div className={styles.notificationMeta}>
                            {formatNotificationTime(item.createdAt)}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Collapse button (desktop only) */}
            <button
              className={styles.collapseButton}
              onClick={handleCollapse}
              aria-label={isMenuCollapsed ? 'Expandir menu' : 'Recolher menu'}
              title={isMenuCollapsed ? 'Expandir menu' : 'Recolher menu'}
              data-wizard-target="nav-collapse"
            >
              <FontAwesomeIcon
                icon={isMenuCollapsed ? faChevronRight : faChevronLeft}
                size="lg"
              />
            </button>
          </div>
        </div>

        {/* User Profile Section */}
        {user && !isMenuCollapsed && (
          <div data-wizard-target="nav-profile">
            <UserAvatar nome={user.nome} role={user.role} size="medium" />
          </div>
        )}
        
        {user && isMenuCollapsed && (
          <div className={styles.userProfileSection} data-wizard-target="nav-profile">
            <div className={styles.userAvatar}>
              <img
                src={defaultAvatarLogo}
                alt=""
                className={styles.userAvatarImage}
              />
            </div>
          </div>
        )}

        {/* Search bar */}
        {!isMenuCollapsed && (
          <div className={styles.searchContainer}>
            <i className="fas fa-search" aria-hidden="true"></i>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar página... (/)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={handleSearchFocus}
              className={styles.searchInput}
              aria-label="Buscar no menu"
              data-wizard-target="nav-search"
            />
            {searchTerm && (
              <button
                className={styles.searchClear}
                onClick={() => setSearchTerm('')}
                aria-label="Limpar busca"
              >
                <i className="fas fa-times" aria-hidden="true"></i>
              </button>
            )}
          </div>
        )}

        {canEditNavbar && (
          <div className={styles.editModeBar} data-wizard-target="nav-editmode">
            {!isEditMode ? (
              <>
                {/* Seletor de perfil — sempre visível para Super Admin */}
                <div className={styles.editModeRole}>
                  <span className={styles.editModeRoleLabel}>Visualizar como:</span>
                  <select
                    className={styles.editModeRoleSelect}
                    value={editRole}
                    onChange={(event) => setEditRole(event.target.value as UserRole)}
                  >
                    <option value="SUPER_ADMIN">Super Admin</option>
                    <option value="ADMIN">Admin</option>
                    <option value="COLLABORATOR">Colaborador</option>
                    <option value="SUPPLIER">Fornecedor</option>
                  </select>
                </div>
                <button
                  type="button"
                  className={styles.editModeButton}
                  onClick={handleEnterEditMode}
                >
                  <FontAwesomeIcon icon={faPen} className={styles.editModeIcon} />
                  Editar navbar
                </button>
              </>
            ) : (
              <div className={styles.editModeActions}>
                <span className={styles.editModeRoleLabel} style={{ alignSelf: 'center' }}>
                  Editando: <strong style={{ color: '#fff' }}>{editRole === 'SUPER_ADMIN' ? 'Super Admin' : editRole === 'ADMIN' ? 'Admin' : editRole === 'COLLABORATOR' ? 'Colaborador' : 'Fornecedor'}</strong>
                </span>
                <button
                  type="button"
                  className={styles.editModeButton}
                  onClick={handleSaveLayout}
                  disabled={isSavingLayout}
                >
                  <FontAwesomeIcon icon={faSave} className={styles.editModeIcon} />
                  {isSavingLayout ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  type="button"
                  className={styles.editModeButton}
                  onClick={handleCancelEditMode}
                >
                  <FontAwesomeIcon icon={faTimes} className={styles.editModeIcon} />
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Menu groups */}
        <div className={styles.menuContainer} data-wizard-target="nav-menu">
          {isEditMode && canEditNavbar && (
            <div className={styles.editAddGroup}>
              <input
                type="text"
                value={newGroupName}
                placeholder="Nova categoria"
                onChange={(e) => setNewGroupName(e.target.value)}
                className={styles.editAddGroupInput}
              />
              <button
                type="button"
                className={styles.editAddGroupButton}
                onClick={handleAddGroup}
                disabled={!newGroupName.trim()}
              >
                <FontAwesomeIcon icon={faPlus} />
              </button>
            </div>
          )}
          {filteredGroups.map((group, groupIndex) => {
            const isExpanded = isEditMode ? true : expandedGroups[group.id];
            
            return (
              <div
                key={group.id}
                className={`${styles.menuGroup} ${
                  dragOverGroupId === group.id ? styles.dropTarget : ''
                }`}
                onDragOver={handleGroupDragOver(group.id)}
                onDrop={handleGroupDrop(group.id)}
              >
                {!isMenuCollapsed && (
                  <>
                    {isEditMode ? (
                      (() => {
                        const isGroupHidden = group.items.length > 0 && group.items.every((item) => item.hidden);
                        return (
                          <div
                            className={`${styles.menuGroupTitleEdit} ${isGroupHidden ? styles.menuGroupHidden : ''}`}
                            draggable
                            onDragStart={handleDragStart('group', { groupId: group.id })}
                            onDragEnd={handleDragEnd}
                            onDoubleClick={handleGroupTitleDoubleClick(group)}
                          >
                            <span className={styles.dragHandle}>
                              <FontAwesomeIcon icon={faGripLines} />
                            </span>
                            {editingGroupId === group.id ? (
                              <input
                                ref={(el) => {
                                  if (editingGroupId === group.id) {
                                    groupTitleInputRef.current = el;
                                  }
                                }}
                                className={styles.groupTitleInput}
                                value={group.title}
                                onChange={(e) => handleRenameGroup(group.id, e.target.value)}
                                onKeyDown={handleGroupTitleKeyDown(group.id)}
                                onBlur={handleGroupTitleBlur}
                              />
                            ) : (
                              <span
                                className={styles.groupTitleText}
                                onDoubleClick={handleGroupTitleDoubleClick(group)}
                                title="Clique duplo para editar"
                                draggable={false}
                              >
                                {group.title}
                              </span>
                            )}
                            <button
                              type="button"
                              className={styles.groupDeleteButton}
                              onClick={(e) => { e.stopPropagation(); toggleGroupHidden(group.id); }}
                              title={isGroupHidden ? 'Exibir categoria' : 'Ocultar categoria'}
                              disabled={group.items.length === 0}
                            >
                              <FontAwesomeIcon icon={isGroupHidden ? faEyeSlash : faEye} />
                            </button>
                            <button
                              type="button"
                              className={styles.groupDeleteButton}
                              onClick={() => handleDeleteGroup(group.id)}
                              disabled={group.items.length > 0}
                              title={group.items.length > 0 ? 'Remova os itens antes' : 'Excluir categoria'}
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </div>
                        );
                      })()
                    ) : (
                      <div
                        className={styles.menuGroupTitle}
                        onClick={() => toggleGroup(group.id)}
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                      >
                        <i
                          className={`fas fa-chevron-${isExpanded ? 'down' : 'right'}`}
                          style={{ marginRight: '8px', fontSize: '0.8rem' }}
                          aria-hidden="true"
                        ></i>
                        {group.title}
                      </div>
                    )}
                  </>
                )}
                {isMenuCollapsed && groupIndex > 0 && (
                  <div className={styles.menuDivider}></div>
                )}
                {(isMenuCollapsed || isExpanded) && (
                  <div className={styles.menuGroupItems}>
                    {group.items.map((item, itemIndex) => {
                      const isHidden = !!item.hidden;
                      const isDropTarget = dragOverItem?.groupId === group.id && dragOverItem?.itemKey === item.key;
                      // Tratamento especial para o item "Sair" (logout)
                      if (item.path === '/logout' && !isEditMode) {
                        return (
                          <button
                            key={item.key}
                            className={styles.listGroupItem}
                            onClick={() => {
                              handleLinkClick();
                              handleLogout();
                            }}
                            aria-label={item.ariaLabel}
                            title={isMenuCollapsed ? item.label : undefined}
                            style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none' }}
                            data-wizard-target="nav-logout"
                          >
                            <FontAwesomeIcon
                              icon={iconMap[item.icon]}
                              className={styles.menuIcon}
                              aria-hidden="true"
                            />
                            {!isMenuCollapsed && <span className={styles.menuItemText}>{item.label}</span>}
                          </button>
                        );
                      }

                      // Renderização normal para outros itens
                      if (isEditMode) {
                        return (
                          <div
                            key={item.key}
                            className={`${styles.listGroupItem} ${styles.editableItem} ${
                              isHidden ? styles.menuItemHidden : ''
                            } ${isDropTarget ? styles.dropTargetItem : ''}`}
                            draggable
                            onDragStart={(event) => {
                              const target = event.target as HTMLElement;
                              if (target.closest(`.${styles.itemToggleButton}`)) {
                                event.preventDefault();
                                return;
                              }
                              handleDragStart('item', { groupId: group.id, itemKey: item.key })(event);
                            }}
                            onDragEnd={handleDragEnd}
                            onDragOver={handleItemDragOver(group.id, item.key)}
                            onDrop={handleItemDrop(group.id, item.key)}
                          >
                            <span
                              className={styles.dragHandle}
                              title="Arraste para reordenar"
                            >
                              <FontAwesomeIcon icon={faGripLines} />
                            </span>
                            <FontAwesomeIcon
                              icon={iconMap[item.icon]}
                              className={styles.menuIcon}
                              aria-hidden="true"
                            />
                            {!isMenuCollapsed && (
                              <span className={styles.menuItemText}>{item.label}</span>
                            )}
                            <button
                              type="button"
                              className={styles.itemToggleButton}
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleItemHidden(item.key);
                              }}
                              title={isHidden ? 'Exibir item' : 'Ocultar item'}
                            >
                              <FontAwesomeIcon icon={isHidden ? faEyeSlash : faEye} />
                            </button>
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={item.key}
                          to={item.path}
                          className={getLinkClass(item.path)}
                          onClick={(event) => {
                            if (editingItemKey === item.key) {
                              event.preventDefault();
                              return;
                            }
                            handleMenuItemClick(item.key);
                          }}
                          aria-label={item.ariaLabel}
                          title={isMenuCollapsed ? getLabelForItem(item) : undefined}
                        >
                          <FontAwesomeIcon
                            icon={iconMap[item.icon]}
                            className={styles.menuIcon}
                            aria-hidden="true"
                          />
                            {!isMenuCollapsed && (
                              <>
                                {editingItemKey === item.key ? (
                                  <input
                                    ref={(el) => {
                                      if (editingItemKey === item.key) {
                                        editingItemInputRef.current = el;
                                      }
                                    }}
                                    className={styles.menuItemLabelInput}
                                    value={itemLabelDraft}
                                    onChange={(e) => setItemLabelDraft(e.target.value)}
                                    onKeyDown={handleItemLabelKeyDown(item.key)}
                                    onBlur={handleItemLabelBlur(item.key)}
                                    onClick={(event) => event.stopPropagation()}
                                  />
                                ) : (
                                  <span
                                    className={styles.menuItemText}
                                    onDoubleClick={handleItemLabelDoubleClick(item)}
                                    draggable={false}
                                    title="Clique duplo para editar"
                                  >
                                    {getLabelForItem(item)}
                                  </span>
                                )}
                                {item.path === '/admin/sugestoes' && sugestoesPendentes > 0 && (
                                  <span className={styles.badge}>{sugestoesPendentes}</span>
                                )}
                              </>
                            )}
                            {isMenuCollapsed && item.path === '/admin/sugestoes' && sugestoesPendentes > 0 && (
                              <span className={styles.badgeDot}></span>
                            )}
                        </Link>
                      );
                    })}
                    {isEditMode && group.items.length === 0 && !isMenuCollapsed && (
                      <div className={styles.emptyGroupHint}>Arraste itens para esta categoria</div>
                    )}
                    {!isEditMode && isSuperAdmin && group.items.length === 0 && group.hasConfiguredItems && !isMenuCollapsed && (
                      <div className={styles.emptyGroupHint}>Nenhum item disponível para o seu perfil.</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {!isMenuCollapsed && (
          <div className={styles.sidebarFooter}>
            <>
              <button
                className={styles.darkModeToggle}
                onClick={toggleDarkMode}
                title={isDarkMode ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
                aria-label={isDarkMode ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
                data-wizard-target="nav-darkmode"
              >
                <div className={`${styles.toggleSwitch} ${isDarkMode ? styles.active : ''}`}>
                  <div className={styles.toggleSlider}>
                    <i className="fas fa-key" aria-hidden="true"></i>
                  </div>
                </div>
              </button>
              <button
                type="button"
                className={styles.tourButton}
                onClick={handleStartTour}
                data-wizard-target="nav-tour"
                aria-label="Tour guiado da aplicação"
              >
                <FontAwesomeIcon icon={faMapSigns} />
                <span>Tour da aplicação</span>
              </button>
              <div className={styles.footerVersion}>{versionLabel}</div>
              <Link
                to={isAdmin ? '/admin/configuracoes' : '/collaborator/configuracoes'}
                className={styles.footerLink}
                data-wizard-target="nav-config"
              >
                <i className="fas fa-cog me-2" aria-hidden="true"></i>
                Configurações
              </Link>
            </>
          </div>
        )}
      </nav>

      {/* Page Content */}
      <div className={styles.pageContentWrapper} data-wizard-target="dashboard">
        <Breadcrumbs />
        <div className={`container-fluid ${isDashboardRoute ? 'px-0' : 'px-4'}`}>
          {impersonationActive && (
            <div className={`${styles.networkBanner} ${styles.impersonationBanner}`} role="status" aria-live="polite">
              <div>
                <div>Modo camaleao ativo: voce esta como {user?.nome} ({user?.role}).</div>
                <div className={styles.impersonationBannerMeta}>
                  Impersonado por {user?.impersonated_by_nome || 'SUPER_ADMIN'}.
                </div>
              </div>
              <button
                type="button"
                className={styles.impersonationBannerAction}
                onClick={handleExitImpersonation}
                disabled={isExitingImpersonation}
              >
                {isExitingImpersonation ? 'Saindo...' : 'Sair da impersonacao'}
              </button>
            </div>
          )}
          {updateAvailable && (
            <div
              className={`${styles.networkBanner} ${styles.networkBannerUpdate}`}
              role="status"
              aria-live="polite"
            >
              <span>Nova versão disponível. Atualize para aplicar as mudanças.</span>
              <button
                type="button"
                className={styles.networkBannerAction}
                onClick={handleAppUpdate}
              >
                Atualizar app
              </button>
            </div>
          )}
          {showUpdateSuccess && (
            <div
              className={`${styles.networkBanner} ${styles.networkBannerSuccess}`}
              role="status"
              aria-live="polite"
            >
              Atualização aplicada com sucesso.
            </div>
          )}
          {!isOnline && (
            <div
              className={`${styles.networkBanner} ${styles.networkBannerOffline}`}
              role="status"
              aria-live="polite"
            >
              Você está offline. Conecte-se para submeter listas. Alterações ficam pendentes até a conexão voltar.
            </div>
          )}
          {isOnline && showOnlineNotice && (
            <div
              className={`${styles.networkBanner} ${styles.networkBannerOnline}`}
              role="status"
              aria-live="polite"
            >
              Conexão restabelecida. Alterações pendentes serão sincronizadas.
            </div>
          )}
          <Outlet />
        </div>
      </div>

      <TutorialController />
      <NotificationToasts />

      {/* Sidebar Tab/Handle (Orelha) */}
      <button
        className={styles.sidebarTab}
        onClick={handleToggle}
        aria-label={isToggled ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={isToggled}
        data-wizard-target="nav-tab"
      >
        <FontAwesomeIcon icon={faChevronLeft} className={styles.sidebarTabIcon} aria-hidden="true" />
      </button>
    </div>
  );
};

export default Layout;
