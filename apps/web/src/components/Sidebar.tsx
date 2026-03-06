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
} from 'react-icons/fa';
import styles from './Sidebar.module.css';
import Breadcrumbs from './Breadcrumbs';
import NotificationBell from './NotificationBell';
import {
  type NavbarStyle,
  getNavbarStyle,
  NAVBAR_STYLE_CHANGE_EVENT,
  NAVBAR_STYLE_STORAGE_KEY,
  normalizeNavbarStyle,
} from '@/lib/navbarStyle';

interface MenuItem {
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

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const { user, logout, isAdmin, isSuperAdmin } = useAuth();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isToggled, setIsToggled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileCollapsed, setIsMobileCollapsed] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [navbarStyle, setNavbarStyle] = useState<NavbarStyle>('current');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const searchRef = useRef<HTMLInputElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);
  const isLegacyStyle = navbarStyle === 'next';
  const isMenuCollapsed = isLegacyStyle ? (isMobile ? isMobileCollapsed : isCollapsed) : isCollapsed;

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
    setNavbarStyle(getNavbarStyle());

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== NAVBAR_STYLE_STORAGE_KEY) return;
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
  }, []);

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
    const defaultGroups: Record<string, boolean> = isAdmin
      ? {
          'visao-geral': true,
          'listas-estoque': true,
          pop: true,
          itens: true,
          gestao: true,
          configuracoes: true,
          perfil: true,
        }
      : { dashboard: true, atividades: true, perfil: true };

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
  }, [isAdmin]);

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
        ...(isSuperAdmin
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
        ...(isSuperAdmin
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
  ], [isSuperAdmin]);

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
  const profileMenuGroup = useMemo<MenuGroup>(() => ({
    id: 'perfil',
    label: 'PERFIL',
    items: [
      {
        label: 'Editar Perfil',
        href: isAdmin ? '/admin/editar-perfil' : '/collaborator/perfil',
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
  }), [isAdmin, logout]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const allMenuGroups = useMemo(
    () => [...(isAdmin ? adminMenuGroups : collaboratorMenuGroups), profileMenuGroup],
    [isAdmin, adminMenuGroups, collaboratorMenuGroups, profileMenuGroup],
  );

  // Filter groups and items based on search
  // allMenuGroups já é memoizado — só recalcula quando searchTerm ou menu mudam
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return allMenuGroups;
    const term = searchTerm.toLowerCase();
    return allMenuGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.label.toLowerCase().includes(term)),
      }))
      .filter((group) => group.items.length > 0);
  }, [searchTerm, allMenuGroups]);

  useEffect(() => {
    if (!searchTerm.trim() || filteredGroups.length === 0) return;

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
  }, [searchTerm, filteredGroups]);

  const isMenuItemActive = (href: string): boolean => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

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
                  isAdmin ? <FaUserShield /> : <FaUser />
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
            <div className={styles.userRole}>{isAdmin ? 'Administrador' : 'Colaborador'}</div>
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

        {/* Menu Container */}
        <div className={styles.menuContainer}>
          {filteredGroups.map((group, groupIndex) => (
            <div key={group.id} className={styles.menuGroup}>
              {isLegacyStyle && isMenuCollapsed && groupIndex > 0 ? (
                <div className={styles.menuDivider} aria-hidden="true" />
              ) : (
                <button
                  className={styles.groupLabel}
                  onClick={() => toggleGroup(group.id)}
                  aria-label={`${expandedGroups[group.id] ? 'Recolher' : 'Expandir'} ${group.label}`}
                >
                  <span>{group.label}</span>
                  <FaChevronRight className={expandedGroups[group.id] ? styles.rotated : ''} />
                </button>
              )}
              {(isMenuCollapsed || expandedGroups[group.id]) && (
                <div className={styles.menuItems}>
                  {group.items.map((item, itemIndex) => {
                    const isDisabled = item.status === 'soon' || !item.href;
                    const title = isMenuCollapsed
                      ? item.status === 'soon'
                        ? `${item.label} (em breve)`
                        : item.label
                      : item.status === 'soon'
                        ? 'Em breve'
                        : undefined;

                    if (item.onClick) {
                      return (
                        <button
                          key={itemIndex}
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
                          key={itemIndex}
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
                        key={itemIndex}
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
          ))}
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
                href={isAdmin ? '/admin/configuracoes' : '/collaborator/configuracoes'}
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
                href={isAdmin ? '/admin/configuracoes' : '/collaborator/configuracoes'}
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
