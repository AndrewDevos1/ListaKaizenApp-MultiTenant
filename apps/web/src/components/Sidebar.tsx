'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  FaTachometerAlt,
  FaBoxes,
  FaMapMarkerAlt,
  FaClipboardList,
  FaSignOutAlt,
  FaMoon,
  FaSun,
  FaTimes,
  FaChevronRight,
  FaSearch,
  FaUserShield,
  FaUser,
  FaUserEdit,

  FaQuestionCircle,
  FaCog,
  FaGripLinesVertical,
  FaChevronLeft,
  FaUsersCog,
  FaClipboardCheck,
  FaTasks,
  FaGlobeAmericas,
  FaLightbulb,
  FaBolt,
  FaTruck,
  FaFileInvoiceDollar,
  FaEnvelope,
  FaHistory,
  FaShoppingCart,
  FaBook,
  FaChartBar,
  FaStore,
  FaGlobe,
  FaEye,
  FaEyeSlash,
  FaPencilAlt,
  FaSave,
} from 'react-icons/fa';
import { UserRole } from 'shared';
import styles from './Sidebar.module.css';
import Breadcrumbs from './Breadcrumbs';
import NotificationBell from './NotificationBell';
import {
  type NavbarStyle,
  getNavbarStyle,
  setNavbarStyle as persistNavbarStyle,
  NAVBAR_STYLE_CHANGE_EVENT,
  NAVBAR_STYLE_STORAGE_KEY,
  normalizeNavbarStyle,
} from '@/lib/navbarStyle';
import api from '@/lib/api';

interface MenuItem {
  key?: string;
  label: string;
  href?: string;
  icon: React.ReactNode;
  onClick?: () => void;
  status?: 'available' | 'soon';
}

interface MenuGroup {
  id: string;
  label: string;
  items: MenuItem[];
}

interface RoleNavbarCustomization {
  hiddenGroupIds: string[];
  hiddenItemKeys: string[];
}

type NavbarCustomizationState = Record<UserRole, RoleNavbarCustomization>;

const NAVBAR_NEXT_LAYOUT_STORAGE_KEY = 'navbar:next:layout';

function createEmptyNavbarCustomizationState(): NavbarCustomizationState {
  return {
    [UserRole.SUPER_ADMIN]: { hiddenGroupIds: [], hiddenItemKeys: [] },
    [UserRole.ADMIN]: { hiddenGroupIds: [], hiddenItemKeys: [] },
    [UserRole.COLLABORATOR]: { hiddenGroupIds: [], hiddenItemKeys: [] },
    [UserRole.SUPPLIER]: { hiddenGroupIds: [], hiddenItemKeys: [] },
  };
}

function normalizeNavbarCustomization(raw: unknown): NavbarCustomizationState {
  const base = createEmptyNavbarCustomizationState();
  if (!raw || typeof raw !== 'object') return base;

  const source = raw as Partial<Record<UserRole, Partial<RoleNavbarCustomization>>>;
  (Object.values(UserRole) as UserRole[]).forEach((role) => {
    const roleData = source[role];
    if (!roleData) return;
    base[role] = {
      hiddenGroupIds: Array.isArray(roleData.hiddenGroupIds) ? roleData.hiddenGroupIds.filter((v): v is string => typeof v === 'string') : [],
      hiddenItemKeys: Array.isArray(roleData.hiddenItemKeys) ? roleData.hiddenItemKeys.filter((v): v is string => typeof v === 'string') : [],
    };
  });

  return base;
}

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const { user, logout, isSuperAdmin } = useAuth();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isToggled, setIsToggled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileCollapsed, setIsMobileCollapsed] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [navbarStyle, setNavbarStyle] = useState<NavbarStyle>('current');
  const [previewRole, setPreviewRole] = useState<UserRole>(UserRole.SUPER_ADMIN);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSavingNavbarLayout, setIsSavingNavbarLayout] = useState(false);
  const [navbarCustomization, setNavbarCustomization] = useState<NavbarCustomizationState>(
    createEmptyNavbarCustomizationState(),
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const editSnapshotRef = useRef<NavbarCustomizationState | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);
  const isLegacyStyle = navbarStyle === 'next';
  const isMenuCollapsed = isLegacyStyle ? (isMobile ? isMobileCollapsed : isCollapsed) : isCollapsed;
  // Super Admin sempre edita/visualiza a role selecionada no "Visualizar como",
  // independentemente do estilo de navbar ativo.
  const effectiveRole = isSuperAdmin ? previewRole : user?.role ?? UserRole.COLLABORATOR;
  const roleIsAdmin = effectiveRole === UserRole.ADMIN || effectiveRole === UserRole.SUPER_ADMIN;
  const roleIsSuperAdmin = effectiveRole === UserRole.SUPER_ADMIN;

  const expandSidebarForSearch = useCallback(() => {
    if (isLegacyStyle && isMobile) {
      setIsMobileCollapsed(false);
      return;
    }

    setIsCollapsed((prev) => {
      if (prev) {
        localStorage.setItem('sidebarCollapsed', 'false');
      }
      return false;
    });
  }, [isLegacyStyle, isMobile]);

  // Initialize dark mode from localStorage
  useEffect(() => {
    const theme = localStorage.getItem('theme') || 'light';
    setIsDarkMode(theme === 'dark');
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  // Initialize navbar style from localStorage and keep it in sync
  useEffect(() => {
    const userStorageKey =
      typeof user?.id === 'number'
        ? `${NAVBAR_STYLE_STORAGE_KEY}:${user.id}`
        : NAVBAR_STYLE_STORAGE_KEY;

    setNavbarStyle(getNavbarStyle(user?.id));

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== NAVBAR_STYLE_STORAGE_KEY && event.key !== userStorageKey) return;
      setNavbarStyle(normalizeNavbarStyle(event.newValue));
    };

    const handleNavbarStyleChange = (event: Event) => {
      const customEvent = event as CustomEvent<NavbarStyle>;
      setNavbarStyle(normalizeNavbarStyle(customEvent.detail));
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(NAVBAR_STYLE_CHANGE_EVENT, handleNavbarStyleChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(NAVBAR_STYLE_CHANGE_EVENT, handleNavbarStyleChange);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    const loadNavbarStyleFromServer = async () => {
      try {
        const response = await api.get('/v1/auth/navbar-style');
        const remoteStyle = normalizeNavbarStyle(response.data?.style);
        if (!isMounted) return;
        setNavbarStyle(remoteStyle);
        persistNavbarStyle(remoteStyle, user.id);
      } catch {
        // Fallback local já aplicado na inicialização.
      }
    };

    void loadNavbarStyleFromServer();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    const stored = localStorage.getItem(NAVBAR_NEXT_LAYOUT_STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      setNavbarCustomization(normalizeNavbarCustomization(parsed));
    } catch {
      setNavbarCustomization(createEmptyNavbarCustomizationState());
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    const loadNavbarLayoutFromServer = async () => {
      try {
        const response = await api.get('/v1/auth/navbar-layout');
        const remoteLayouts = normalizeNavbarCustomization(response.data?.layouts ?? response.data);
        if (!isMounted) return;
        setNavbarCustomization(remoteLayouts);
        localStorage.setItem(NAVBAR_NEXT_LAYOUT_STORAGE_KEY, JSON.stringify(remoteLayouts));
      } catch {
        // Fallback para localStorage já carregado; evita bloquear o menu por falha de rede.
      }
    };

    void loadNavbarLayoutFromServer();

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (user.role === UserRole.SUPER_ADMIN) {
      setPreviewRole(UserRole.SUPER_ADMIN);
    } else {
      setPreviewRole(user.role);
    }
  }, [user]);

  // Initialize collapsed state from localStorage
  useEffect(() => {
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);

    if (!mobile) {
      const savedCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
      setIsCollapsed(savedCollapsed);
    } else if (isLegacyStyle) {
      setIsMobileCollapsed(true);
    }
  }, [isLegacyStyle]);

  // Initialize expanded groups from localStorage
  useEffect(() => {
    const defaultGroups: Record<string, boolean> = {
      'visao-geral': true,
      'listas-estoque': true,
      pop: true,
      itens: true,
      gestao: true,
      configuracoes: true,
      dashboard: true,
      atividades: true,
      supplier: true,
      perfil: true,
    };

    const saved = localStorage.getItem('expandedGroups');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setExpandedGroups({ ...defaultGroups, ...parsed });
      } catch {
        // Fallback to default state
        setExpandedGroups(defaultGroups);
      }
    } else {
      // Default: expand all groups
      setExpandedGroups(defaultGroups);
    }
  }, []);

  // Persist collapsed state
  const handleToggleCollapse = useCallback(() => {
    if (isLegacyStyle && isMobile) {
      setIsMobileCollapsed((prev) => !prev);
      return;
    }

    setIsCollapsed((prev) => {
      const newState = !prev;
      localStorage.setItem('sidebarCollapsed', newState.toString());
      return newState;
    });
  }, [isLegacyStyle, isMobile]);

  // Toggle mobile sidebar
  const handleToggleMobile = useCallback(() => {
    if (!isLegacyStyle) {
      setIsToggled((prev) => !prev);
      return;
    }

    if (!isMobile) {
      setIsToggled((prev) => !prev);
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
  }, [isLegacyStyle, isMobile, isToggled, isMobileCollapsed]);

  // Close mobile sidebar on link click
  const closeMobileMenu = useCallback(() => {
    setIsToggled(false);
    if (isLegacyStyle) {
      setIsMobileCollapsed(true);
    }
  }, [isLegacyStyle]);

  // Toggle group expansion
  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const newState = { ...prev, [groupId]: !prev[groupId] };
      localStorage.setItem('expandedGroups', JSON.stringify(newState));
      return newState;
    });
  }, []);

  const updateCustomizationForRole = useCallback(
    (
      role: UserRole,
      updater: (current: RoleNavbarCustomization) => RoleNavbarCustomization,
    ) => {
      setNavbarCustomization((prev) => {
        const current = prev[role] ?? { hiddenGroupIds: [], hiddenItemKeys: [] };
        return {
          ...prev,
          [role]: updater(current),
        };
      });
    },
    [],
  );

  const handleEnterEditMode = useCallback(() => {
    editSnapshotRef.current = JSON.parse(JSON.stringify(navbarCustomization)) as NavbarCustomizationState;
    setIsEditMode(true);
  }, [navbarCustomization]);

  const handleCancelEditMode = useCallback(() => {
    if (editSnapshotRef.current) {
      setNavbarCustomization(editSnapshotRef.current);
    }
    setIsEditMode(false);
    editSnapshotRef.current = null;
  }, []);

  const handleSaveEditMode = useCallback(async () => {
    if (isSavingNavbarLayout) return;

    const targetLayout = navbarCustomization[effectiveRole] ?? {
      hiddenGroupIds: [],
      hiddenItemKeys: [],
    };

    // Salva localmente primeiro para feedback imediato.
    localStorage.setItem(NAVBAR_NEXT_LAYOUT_STORAGE_KEY, JSON.stringify(navbarCustomization));
    setIsSavingNavbarLayout(true);

    try {
      const response = await api.post('/v1/auth/navbar-layout', {
        role: effectiveRole,
        hiddenGroupIds: targetLayout.hiddenGroupIds,
        hiddenItemKeys: targetLayout.hiddenItemKeys,
      });

      const remoteLayouts = normalizeNavbarCustomization(response.data?.layouts ?? response.data);
      setNavbarCustomization(remoteLayouts);
      localStorage.setItem(NAVBAR_NEXT_LAYOUT_STORAGE_KEY, JSON.stringify(remoteLayouts));
    } catch {
      // Mantém fallback local se backend falhar.
    } finally {
      setIsSavingNavbarLayout(false);
      setIsEditMode(false);
      editSnapshotRef.current = null;
    }
  }, [effectiveRole, isSavingNavbarLayout, navbarCustomization]);

  // Toggle dark mode
  const handleToggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => {
      const newState = !prev;
      const theme = newState ? 'dark' : 'light';
      localStorage.setItem('theme', theme);
      if (newState) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
      return newState;
    });
  }, []);

  // Keyboard shortcuts: Escape to close, "/" to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && searchTerm) {
        setSearchTerm('');
      }

      if (e.key === 'Escape' && isToggled) {
        setIsToggled(false);
      }

      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        if (isMenuCollapsed) {
          expandSidebarForSearch();
          setTimeout(() => searchRef.current?.focus(), 0);
        } else {
          searchRef.current?.focus();
        }
      }
    };

    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      if (!mobile) {
        setIsToggled(false);
        setIsMobileCollapsed(true);
        const savedCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        setIsCollapsed(savedCollapsed);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [isToggled, isMenuCollapsed, searchTerm, expandSidebarForSearch]);

  // Swipe gesture for mobile (sidebar direita):
  // - Swipe para esquerda na borda direita abre
  // - Swipe para direita com menu aberto fecha
  // Ignora gestos predominantemente verticais para não conflitar com rolagem.
  const handleTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchEndY.current = null;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (
      touchStartX.current === null ||
      touchStartY.current === null ||
      touchEndX.current === null ||
      touchEndY.current === null
    ) {
      return;
    }

    const deltaX = touchStartX.current - touchEndX.current;
    const deltaY = touchStartY.current - touchEndY.current;
    const minSwipeDistance = 50;

    if (Math.abs(deltaX) < minSwipeDistance || Math.abs(deltaX) <= Math.abs(deltaY)) {
      return;
    }

    const isLeftSwipe = deltaX > 0;
    const isRightSwipe = deltaX < 0;

    if (isLeftSwipe && !isToggled && touchStartX.current > window.innerWidth - 60) {
      setIsToggled(true);
      if (isLegacyStyle) {
        setIsMobileCollapsed(true);
      }
    } else if (isRightSwipe && isToggled) {
      setIsToggled(false);
      if (isLegacyStyle) {
        setIsMobileCollapsed(true);
      }
    }
  };

  if (!user) return null;

  // Menu groups memoizados — evitam recriação de arrays a cada render
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const adminMenuGroups = useMemo<MenuGroup[]>(() => [
    {
      id: 'visao-geral',
      label: 'VISÃO GERAL',
      items: [
        {
          label: 'Dashboard Admin',
          href: '/admin/dashboard',
          icon: <FaTachometerAlt />,
          status: 'available',
        },
        ...(roleIsSuperAdmin
          ? [
              {
                label: 'Dashboard Global',
                href: '/admin/global',
                icon: <FaGlobe />,
                status: 'available' as const,
              },
            ]
          : []),
        {
          label: 'Gerenciar Usuários',
          href: '/admin/usuarios',
          icon: <FaUsersCog />,
          status: 'available',
        },
        {
          label: 'Estatísticas',
          href: '/admin/estatisticas',
          icon: <FaChartBar />,
          status: 'available',
        },
      ],
    },
    {
      id: 'listas-estoque',
      label: 'LISTAS & ESTOQUE',
      items: [
        {
          label: 'Listas Rápidas',
          href: '/admin/listas-rapidas',
          icon: <FaBolt />,
          status: 'available',
        },
        {
          label: 'Listas de Compras',
          href: '/admin/listas',
          icon: <FaShoppingCart />,
          status: 'available',
        },
        {
          label: 'Checklists de Compras',
          href: '/admin/checklists',
          icon: <FaClipboardList />,
          status: 'available',
        },
        {
          label: 'Submissões',
          href: '/admin/submissoes',
          icon: <FaClipboardCheck />,
          status: 'available',
        },
        {
          label: 'Sugestões de Itens',
          href: '/admin/sugestoes',
          icon: <FaLightbulb />,
          status: 'available',
        },
      ],
    },
    {
      id: 'pop',
      label: 'POP',
      items: [
        {
          label: 'POP Atividades',
          href: '/admin/pop/templates',
          icon: <FaClipboardList />,
          status: 'available',
        },
        {
          label: 'POP Listas',
          href: '/admin/pop/execucoes',
          icon: <FaClipboardCheck />,
          status: 'available',
        },
        {
          label: 'POP Auditoria',
          href: '/admin/pop-auditoria',
          icon: <FaTasks />,
          status: 'available',
        },
      ],
    },
    {
      id: 'itens',
      label: 'ITENS',
      items: [
        {
          label: 'Itens Cadastrados',
          href: '/admin/items',
          icon: <FaBoxes />,
          status: 'available',
        },
        {
          label: 'Catálogo Global',
          href: '/admin/catalogo-global',
          icon: <FaBook />,
          status: 'available',
        },
        {
          label: 'Itens Regionais',
          href: '/admin/itens-regionais',
          icon: <FaGlobeAmericas />,
          status: 'available',
        },
      ],
    },
    {
      id: 'gestao',
      label: 'GESTÃO',
      items: [
        {
          label: 'Áreas',
          href: '/admin/areas',
          icon: <FaMapMarkerAlt />,
          status: 'available',
        },
        {
          label: 'Fornecedores',
          href: '/admin/fornecedores',
          icon: <FaTruck />,
          status: 'available',
        },
        {
          label: 'Cotações',
          href: '/admin/cotacoes',
          icon: <FaFileInvoiceDollar />,
          status: 'available',
        },
        {
          label: 'Gerar Cotação',
          href: '/admin/gerar-cotacao',
          icon: <FaFileInvoiceDollar />,
          status: 'available',
        },
        {
          label: 'Fornecedores da Região',
          href: '/admin/fornecedores-regiao',
          icon: <FaStore />,
          status: 'available',
        },
        ...(roleIsSuperAdmin
          ? [
              {
                label: 'Restaurantes',
                href: '/admin/restaurantes',
                icon: <FaStore />,
              },
            ]
          : []),
      ],
    },
    {
      id: 'configuracoes',
      label: 'CONFIGURAÇÕES',
      items: [
        {
          label: 'Convites',
          href: '/admin/convites',
          icon: <FaEnvelope />,
          status: 'available',
        },
        {
          label: 'Logs',
          href: '/admin/logs',
          icon: <FaHistory />,
          status: 'available',
        },
      ],
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [roleIsSuperAdmin]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const collaboratorMenuGroups = useMemo<MenuGroup[]>(() => [
    {
      id: 'dashboard',
      label: 'DASHBOARD',
      items: [
        {
          label: 'Meu Dashboard',
          href: '/collaborator/dashboard',
          icon: <FaTachometerAlt />,
        },
      ],
    },
    {
      id: 'atividades',
      label: 'ATIVIDADES',
      items: [
        {
          label: 'Lista Rápida',
          href: '/collaborator/listas-rapidas',
          icon: <FaBolt />,
          status: 'available',
        },
        {
          label: 'Minhas Áreas',
          href: '/collaborator/areas',
          icon: <FaMapMarkerAlt />,
          status: 'available',
        },
        {
          label: 'Minhas Listas',
          href: '/collaborator/listas',
          icon: <FaShoppingCart />,
        },
        {
          label: 'Minhas Submissões',
          href: '/collaborator/submissoes',
          icon: <FaClipboardCheck />,
        },
        {
          label: 'POPs Diários',
          href: '/collaborator/pop',
          icon: <FaClipboardList />,
          status: 'available',
        },
        {
          label: 'Histórico POP',
          href: '/collaborator/pop/execucoes',
          icon: <FaHistory />,
          status: 'available',
        },
        {
          label: 'Catálogo Global',
          href: '/collaborator/catalogo',
          icon: <FaBook />,
          status: 'available',
        },
        {
          label: 'Sugestões de Itens',
          href: '/collaborator/sugestoes',
          icon: <FaLightbulb />,
          status: 'available',
        },
      ],
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const supplierMenuGroups = useMemo<MenuGroup[]>(() => [
    {
      id: 'supplier',
      label: 'PAINEL FORNECEDOR',
      items: [
        {
          label: 'Painel',
          href: '/supplier/dashboard',
          icon: <FaTachometerAlt />,
          status: 'available',
        },
      ],
    },
  ], []);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const profileMenuGroup = useMemo<MenuGroup>(() => ({
    id: 'perfil',
    label: 'PERFIL',
    items: [
      {
        label: 'Editar Perfil',
        href: roleIsAdmin ? '/admin/editar-perfil' : '/collaborator/perfil',
        icon: <FaUserEdit />,
        status: 'available' as const,
      },
      {
        label: 'Sair',
        href: '#',
        icon: <FaSignOutAlt />,
        onClick: logout,
      },
    ],
  }), [roleIsAdmin, logout]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const allMenuGroups = useMemo(
    () => [
      ...(
        roleIsAdmin
          ? adminMenuGroups
          : effectiveRole === UserRole.SUPPLIER
            ? supplierMenuGroups
            : collaboratorMenuGroups
      ),
      profileMenuGroup,
    ],
    [roleIsAdmin, effectiveRole, adminMenuGroups, collaboratorMenuGroups, supplierMenuGroups, profileMenuGroup],
  );

  const activeCustomization = navbarCustomization[effectiveRole] ?? {
    hiddenGroupIds: [],
    hiddenItemKeys: [],
  };
  const hiddenGroups = useMemo(
    () => new Set(activeCustomization.hiddenGroupIds),
    [activeCustomization.hiddenGroupIds],
  );
  const hiddenItems = useMemo(
    () => new Set(activeCustomization.hiddenItemKeys),
    [activeCustomization.hiddenItemKeys],
  );

  const getMenuItemKey = useCallback(
    (item: MenuItem) => item.key ?? item.href ?? item.label,
    [],
  );

  const toggleGroupHidden = useCallback((groupId: string) => {
    updateCustomizationForRole(effectiveRole, (current) => {
      const exists = current.hiddenGroupIds.includes(groupId);
      return {
        ...current,
        hiddenGroupIds: exists
          ? current.hiddenGroupIds.filter((id) => id !== groupId)
          : [...current.hiddenGroupIds, groupId],
      };
    });
  }, [effectiveRole, updateCustomizationForRole]);

  const toggleItemHidden = useCallback((itemKey: string) => {
    updateCustomizationForRole(effectiveRole, (current) => {
      const exists = current.hiddenItemKeys.includes(itemKey);
      return {
        ...current,
        hiddenItemKeys: exists
          ? current.hiddenItemKeys.filter((key) => key !== itemKey)
          : [...current.hiddenItemKeys, itemKey],
      };
    });
  }, [effectiveRole, updateCustomizationForRole]);

  const canEditNavbar = isSuperAdmin && !isMobile && !isMenuCollapsed;

  // Filter groups and items based on search
  // allMenuGroups já é memoizado — só recalcula quando searchTerm ou menu mudam
  const filteredGroups = useMemo(() => {
    const baseGroups = allMenuGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => isEditMode || !hiddenItems.has(getMenuItemKey(item))),
      }))
      .filter((group) => (isEditMode ? true : group.items.length > 0))
      .filter((group) => (isEditMode ? true : !hiddenGroups.has(group.id)));

    if (!searchTerm.trim()) return baseGroups;

    const term = searchTerm.toLowerCase();
    return baseGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.label.toLowerCase().includes(term)),
      }))
      .filter((group) => group.items.length > 0);
  }, [searchTerm, allMenuGroups, isEditMode, hiddenItems, hiddenGroups, getMenuItemKey]);

  useEffect(() => {
    if (!searchTerm.trim() || filteredGroups.length === 0 || isEditMode) return;

    setExpandedGroups((prev) => {
      const next = { ...prev };
      let changed = false;

      filteredGroups.forEach((group) => {
        if (!next[group.id]) {
          next[group.id] = true;
          changed = true;
        }
      });

      if (!changed) return prev;
      localStorage.setItem('expandedGroups', JSON.stringify(next));
      return next;
    });
  }, [searchTerm, filteredGroups, isEditMode]);

  useEffect(() => {
    if (canEditNavbar || !isEditMode) return;
    handleCancelEditMode();
  }, [canEditNavbar, isEditMode, handleCancelEditMode]);

  const isMenuItemActive = (href: string): boolean => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const roleLabel =
    effectiveRole === UserRole.SUPER_ADMIN
      ? 'Super Admin'
      : effectiveRole === UserRole.ADMIN
        ? 'Administrador'
        : effectiveRole === UserRole.SUPPLIER
          ? 'Fornecedor'
          : 'Colaborador';

  return (
    <div
      className={`${styles.wrapper} ${isMenuCollapsed ? styles.collapsed : ''} ${isToggled ? styles.toggled : ''}`}
      data-navbar-style={navbarStyle}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Overlay for mobile */}
      <div className={styles.overlay} onClick={closeMobileMenu} />

      {/* Sidebar Navigation */}
      <nav className={styles.sidebarWrapper} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {/* Header */}
        <div className={styles.sidebarHeader}>
          <h1>Kaizen</h1>
          <div className={styles.sidebarHeaderActions}>
            <NotificationBell />
            <button
              className={styles.collapseBtn}
              onClick={handleToggleCollapse}
              aria-label={isMenuCollapsed ? 'Expandir menu' : 'Recolher menu'}
              title={isMenuCollapsed ? 'Expandir menu' : 'Recolher menu'}
            >
              <FaChevronRight style={{ transform: isMenuCollapsed ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </button>
            {!isLegacyStyle && (
              <button
                className={styles.mobileCloseBtn}
                onClick={closeMobileMenu}
                aria-label="Fechar menu"
                title="Fechar menu"
                type="button"
              >
                <FaTimes />
              </button>
            )}
          </div>
        </div>

        {/* User Info */}
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>
            {isMenuCollapsed ? (
              <div className={styles.userAvatarIcon}>
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                ) : (
                  roleIsAdmin ? <FaUserShield /> : <FaUser />
                )}
              </div>
            ) : (
              user.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (
                user.nome.charAt(0).toUpperCase()
              )
            )}
          </div>
          <div className={styles.userDetails}>
            <div className={styles.userName}>{user.nome}</div>
            <div className={styles.userRole}>{roleLabel}</div>
          </div>
        </div>

        {/* Search */}
        {!isMenuCollapsed && (
          <div className={styles.searchContainer}>
            <FaSearch className={styles.searchIcon} />
            <input
              ref={searchRef}
              type="text"
              className={styles.searchInput}
              placeholder="Buscar... (/)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={expandSidebarForSearch}
              aria-label="Buscar menu"
            />
            {searchTerm && (
              <button
                className={styles.searchClear}
                onClick={() => setSearchTerm('')}
                aria-label="Limpar busca"
                type="button"
              >
                <FaTimes />
              </button>
            )}
          </div>
        )}

        {canEditNavbar && (
          <div className={styles.editModeBar}>
            {!isEditMode ? (
              <div className={styles.editModeRoleStack}>
                <span className={styles.editModeRoleLabel}>Visualizar como:</span>
                <div className={styles.editModeRoleRow}>
                  <select
                    className={styles.editModeRoleSelect}
                    value={previewRole}
                    onChange={(e) => setPreviewRole(e.target.value as UserRole)}
                  >
                    <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                    <option value={UserRole.ADMIN}>Admin</option>
                    <option value={UserRole.COLLABORATOR}>Colaborador</option>
                    <option value={UserRole.SUPPLIER}>Fornecedor</option>
                  </select>
                  <button
                    type="button"
                    className={styles.editModeButton}
                    onClick={handleEnterEditMode}
                  >
                    <FaPencilAlt className={styles.editModeIcon} /> Editar navbar
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.editModeActions}>
                <span className={styles.editModeRoleLabel}>Editando: {roleLabel}</span>
                <button
                  type="button"
                  className={styles.editModeButton}
                  onClick={() => void handleSaveEditMode()}
                  disabled={isSavingNavbarLayout}
                >
                  <FaSave className={styles.editModeIcon} /> {isSavingNavbarLayout ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  type="button"
                  className={styles.editModeButton}
                  onClick={handleCancelEditMode}
                  disabled={isSavingNavbarLayout}
                >
                  <FaTimes className={styles.editModeIcon} /> Cancelar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Menu Container */}
        <div className={styles.menuContainer}>
          {filteredGroups.map((group, groupIndex) => {
            const groupHidden = hiddenGroups.has(group.id);
            const groupExpanded = isEditMode ? true : expandedGroups[group.id];

            return (
            <div
              key={group.id}
              className={`${styles.menuGroup} ${isEditMode && groupHidden ? styles.menuGroupHidden : ''}`}
            >
              {isLegacyStyle && isMenuCollapsed && groupIndex > 0 ? (
                <div className={styles.menuDivider} aria-hidden="true" />
              ) : (
                <button
                  className={styles.groupLabel}
                  onClick={() => toggleGroup(group.id)}
                  aria-label={`${expandedGroups[group.id] ? 'Recolher' : 'Expandir'} ${group.label}`}
                >
                  <span>{group.label}</span>
                  <FaChevronRight className={groupExpanded ? styles.rotated : ''} />
                </button>
              )}

              {isEditMode && !isMenuCollapsed && (
                <div className={styles.groupEditActions}>
                  <button
                    type="button"
                    className={styles.itemToggleButton}
                    onClick={() => toggleGroupHidden(group.id)}
                    title={groupHidden ? 'Exibir grupo' : 'Ocultar grupo'}
                  >
                    {groupHidden ? <FaEye /> : <FaEyeSlash />}
                  </button>
                </div>
              )}

              {(isMenuCollapsed || groupExpanded) && (
                <div className={styles.menuItems}>
                  {group.items.map((item) => {
                    const isDisabled = item.status === 'soon' || !item.href;
                    const itemKey = getMenuItemKey(item);
                    const itemHidden = hiddenItems.has(itemKey);
                    const title = isMenuCollapsed
                      ? item.status === 'soon'
                        ? `${item.label} (em breve)`
                        : item.label
                      : item.status === 'soon'
                        ? 'Em breve'
                        : undefined;

                    if (isEditMode) {
                      return (
                        <div
                          key={itemKey}
                          className={`${styles.menuItem} ${itemHidden ? styles.menuItemHidden : ''}`}
                          title={title}
                        >
                          {item.icon}
                          <span className={styles.menuItemLabel}>{item.label}</span>
                          <button
                            type="button"
                            className={styles.itemToggleButton}
                            onClick={() => toggleItemHidden(itemKey)}
                            title={itemHidden ? 'Exibir item' : 'Ocultar item'}
                          >
                            {itemHidden ? <FaEye /> : <FaEyeSlash />}
                          </button>
                        </div>
                      );
                    }

                    if (item.onClick) {
                      return (
                        <button
                          key={itemKey}
                          type="button"
                          className={`${styles.menuItem} ${styles.menuItemButton}`}
                          onClick={() => {
                            item.onClick?.();
                            closeMobileMenu();
                          }}
                          title={title}
                        >
                          {item.icon}
                          <span className={styles.menuItemLabel}>{item.label}</span>
                        </button>
                      );
                    }

                    if (isDisabled) {
                      return (
                        <div
                          key={itemKey}
                          className={`${styles.menuItem} ${styles.menuItemDisabled}`}
                          title={title}
                          role="button"
                          aria-disabled="true"
                        >
                          {item.icon}
                          <span className={styles.menuItemLabel}>{item.label}</span>
                          <span className={styles.menuItemTag}>Em breve</span>
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={itemKey}
                        href={item.href!}
                        className={`${styles.menuItem} ${isMenuItemActive(item.href!) ? styles.active : ''}`}
                        onClick={closeMobileMenu}
                        title={title}
                      >
                        {item.icon}
                        <span className={styles.menuItemLabel}>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )})}
        </div>

        {/* Sidebar Footer */}
        {(!isLegacyStyle || !isMenuCollapsed) && <div className={styles.sidebarFooter}>
          <div className={styles.footerControls}>
            <button
              className={styles.themeToggleBtn}
              onClick={handleToggleDarkMode}
              aria-label={isDarkMode ? 'Modo claro' : 'Modo escuro'}
              title={isDarkMode ? 'Modo claro' : 'Modo escuro'}
              type="button"
            >
              {isDarkMode ? <FaSun /> : <FaMoon />}
            </button>
            {!isMenuCollapsed && <label className={styles.themeToggleLabel}>{isDarkMode ? 'Claro' : 'Escuro'}</label>}
          </div>

          {!isMenuCollapsed ? (
            <div className={styles.footerLinks}>
              <Link href="#" className={`${styles.footerLink} ${styles.footerLinkDisabled}`} title="Em breve">
                <FaQuestionCircle />
                Ajuda & Suporte
              </Link>
              <Link
                href={roleIsAdmin ? '/admin/configuracoes' : '/collaborator/configuracoes'}
                className={styles.footerLink}
                onClick={closeMobileMenu}
              >
                <FaCog />
                Configurações
              </Link>
            </div>
          ) : (
            <div className={styles.footerIconLinks}>
              <Link href="#" className={`${styles.footerIconLink} ${styles.footerLinkDisabled}`} title="Ajuda & Suporte (em breve)">
                <FaQuestionCircle />
              </Link>
              <Link
                href={roleIsAdmin ? '/admin/configuracoes' : '/collaborator/configuracoes'}
                className={styles.footerIconLink}
                title="Configurações"
                onClick={closeMobileMenu}
              >
                <FaCog />
              </Link>
            </div>
          )}
          <div className={styles.footerVersion}>v3.0.29</div>
        </div>}
      </nav>

      {/* Page Content Wrapper */}
      <div className={styles.pageContentWrapper}>
        <Breadcrumbs />
        {children}
      </div>

      {/* Mobile Floating Tab */}
      <button
        className={styles.sidebarTab}
        onClick={handleToggleMobile}
        aria-label={isToggled ? 'Fechar menu' : 'Abrir menu'}
        title={isToggled ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={isToggled}
      >
        {isLegacyStyle ? (
          <FaChevronLeft className={styles.sidebarTabIcon} aria-hidden="true" />
        ) : (
          <>
            <FaGripLinesVertical />
            <FaChevronLeft />
          </>
        )}
      </button>
    </div>
  );
}
