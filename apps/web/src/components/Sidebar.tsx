'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  FaTachometerAlt,
  FaList,
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
  FaKey,
  FaQuestionCircle,
  FaCog,
  FaGripLinesVertical,
  FaChevronLeft,
  FaUsersCog,
  FaClipboardCheck,
  FaListAlt,
  FaTasks,
  FaGlobeAmericas,
  FaLightbulb,
  FaBolt,
  FaTruck,
  FaTruckLoading,
  FaFileInvoiceDollar,
  FaClipboard,
} from 'react-icons/fa';
import styles from './Sidebar.module.css';
import Breadcrumbs from './Breadcrumbs';

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
  const { user, logout, isAdmin } = useAuth();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isToggled, setIsToggled] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const searchRef = useRef<HTMLInputElement>(null);
  const touchStartX = useRef(0);

  const expandSidebarForSearch = useCallback(() => {
    setIsCollapsed((prev) => {
      if (prev) {
        localStorage.setItem('sidebarCollapsed', 'false');
      }
      return false;
    });
  }, []);

  // Initialize dark mode from localStorage
  useEffect(() => {
    const theme = localStorage.getItem('theme') || 'light';
    setIsDarkMode(theme === 'dark');
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  // Initialize collapsed state from localStorage (desktop only)
  useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) {
      const savedCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
      setIsCollapsed(savedCollapsed);
    }
  }, []);

  // Initialize expanded groups from localStorage
  useEffect(() => {
    const defaultGroups: Record<string, boolean> = isAdmin
      ? {
          'visao-geral': true,
          pop: true,
          itens: true,
          'listas-compras': true,
          fornecedores: true,
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
    setIsCollapsed((prev) => {
      const newState = !prev;
      localStorage.setItem('sidebarCollapsed', newState.toString());
      return newState;
    });
  }, []);

  // Toggle mobile sidebar
  const handleToggleMobile = useCallback(() => {
    setIsToggled((prev) => !prev);
  }, []);

  // Close mobile sidebar on link click
  const closeMobileMenu = useCallback(() => {
    setIsToggled(false);
  }, []);

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
      if (e.key === 'Escape' && isToggled) {
        setIsToggled(false);
      }
      if (e.key === '/' && !isToggled) {
        e.preventDefault();
        if (isCollapsed) {
          expandSidebarForSearch();
          setTimeout(() => searchRef.current?.focus(), 0);
        } else {
          searchRef.current?.focus();
        }
      }
    };

    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsToggled(false);
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
  }, [isToggled, isCollapsed, expandSidebarForSearch]);

  // Swipe gesture for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 50) {
      // Swipe left → close
      setIsToggled(false);
    }
    if (diff < -50) {
      // Swipe right → open
      setIsToggled(true);
    }
  };

  if (!user) return null;

  // Menu groups based on role
  const adminMenuGroups: MenuGroup[] = [
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
        {
          label: 'Submissões',
          href: '/admin/submissoes',
          icon: <FaClipboardCheck />,
          status: 'available',
        },
        {
          label: 'Gerenciar Usuários',
          href: '/admin/usuarios',
          icon: <FaUsersCog />,
          status: 'available',
        },
      ],
    },
    {
      id: 'pop',
      label: 'POP',
      items: [
        {
          label: 'Templates POP',
          href: '/admin/pop/templates',
          icon: <FaClipboard />,
          status: 'available',
        },
        {
          label: 'Execucoes POP',
          href: '/admin/pop/execucoes',
          icon: <FaListAlt />,
          status: 'available',
        },
        {
          label: 'POP Atividades',
          status: 'soon',
          icon: <FaTasks />,
        },
      ],
    },
    {
      id: 'itens',
      label: 'ITENS',
      items: [
        {
          label: 'Itens Regionais',
          status: 'soon',
          icon: <FaGlobeAmericas />,
        },
        {
          label: 'Itens Cadastrados',
          href: '/admin/items',
          icon: <FaBoxes />,
          status: 'available',
        },
        {
          label: 'Sugestoes de Itens',
          href: '/admin/sugestoes',
          icon: <FaLightbulb />,
          status: 'available',
        },
      ],
    },
    {
      id: 'listas-compras',
      label: 'LISTAS & COMPRAS',
      items: [
        {
          label: 'Listas Rapidas',
          href: '/admin/listas-rapidas',
          icon: <FaBolt />,
          status: 'available',
        },
        {
          label: 'Listas de Compras',
          href: '/admin/listas',
          icon: <FaList />,
          status: 'available',
        },
        {
          label: 'Cotações',
          href: '/admin/cotacoes',
          icon: <FaFileInvoiceDollar />,
          status: 'available',
        },
        {
          label: 'Checklists de Compras',
          href: '/admin/checklists',
          icon: <FaClipboardList />,
          status: 'available',
        },
      ],
    },
    {
      id: 'fornecedores',
      label: 'FORNECEDORES & ÁREAS',
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
          label: 'Fornecedores da Região',
          status: 'soon',
          icon: <FaTruckLoading />,
        },
      ],
    },
  ];

  const collaboratorMenuGroups: MenuGroup[] = [
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
          label: 'Minhas Listas',
          href: '/collaborator/listas',
          icon: <FaClipboardList />,
        },
        {
          label: 'Minhas Submissoes',
          href: '/collaborator/submissoes',
          icon: <FaClipboardCheck />,
        },
        {
          label: 'Listas Rapidas',
          href: '/collaborator/listas-rapidas',
          icon: <FaBolt />,
          status: 'available',
        },
        {
          label: 'Sugestoes de Itens',
          href: '/collaborator/sugestoes',
          icon: <FaLightbulb />,
          status: 'available',
        },
        {
          label: 'POPs',
          href: '/collaborator/pop',
          icon: <FaClipboard />,
          status: 'available',
        },
      ],
    },
  ];

  const profileMenuGroup: MenuGroup = {
    id: 'perfil',
    label: 'PERFIL',
    items: [
      {
        label: 'Editar Perfil',
        href: isAdmin ? undefined : '/collaborator/perfil',
        icon: <FaUserEdit />,
        status: isAdmin ? 'soon' : 'available',
      },
      {
        label: 'Mudar Senha',
        href: isAdmin ? undefined : '/collaborator/mudar-senha',
        icon: <FaKey />,
        status: isAdmin ? 'soon' : 'available',
      },
      {
        label: 'Sair',
        href: '#',
        icon: <FaSignOutAlt />,
        onClick: logout,
      },
    ],
  };

  const allMenuGroups = [...(isAdmin ? adminMenuGroups : collaboratorMenuGroups), profileMenuGroup];

  // Filter groups and items based on search
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) {
      return allMenuGroups;
    }

    const term = searchTerm.toLowerCase();
    return allMenuGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.label.toLowerCase().includes(term)),
      }))
      .filter((group) => group.items.length > 0);
  }, [searchTerm, allMenuGroups]);

  const isMenuItemActive = (href: string): boolean => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className={`${styles.wrapper} ${isCollapsed ? styles.collapsed : ''} ${isToggled ? styles.toggled : ''}`}>
      {/* Overlay for mobile */}
      <div className={styles.overlay} onClick={closeMobileMenu} />

      {/* Sidebar Navigation */}
      <nav className={styles.sidebarWrapper} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {/* Header */}
        <div className={styles.sidebarHeader}>
          <h1>Kaizen</h1>
          <button
            className={styles.collapseBtn}
            onClick={handleToggleCollapse}
            aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
            title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            <FaChevronRight style={{ transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          </button>
        </div>

        {/* User Info */}
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>
            {isCollapsed ? (
              <div className={styles.userAvatarIcon}>{isAdmin ? <FaUserShield /> : <FaUser />}</div>
            ) : (
              user.nome.charAt(0).toUpperCase()
            )}
          </div>
          <div className={styles.userDetails}>
            <div className={styles.userName}>{user.nome}</div>
            <div className={styles.userRole}>{isAdmin ? 'Administrador' : 'Colaborador'}</div>
          </div>
        </div>

        {/* Search */}
        {!isCollapsed && (
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
          {filteredGroups.map((group) => (
            <div key={group.id} className={styles.menuGroup}>
              <button
                className={styles.groupLabel}
                onClick={() => toggleGroup(group.id)}
                aria-label={`${expandedGroups[group.id] ? 'Recolher' : 'Expandir'} ${group.label}`}
              >
                <span>{group.label}</span>
                <FaChevronRight className={expandedGroups[group.id] ? styles.rotated : ''} />
              </button>
              {expandedGroups[group.id] && (
                <div className={styles.menuItems}>
                  {group.items.map((item, itemIndex) => {
                    const isDisabled = item.status === 'soon' || !item.href;
                    const title = isCollapsed
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
        <div className={styles.sidebarFooter}>
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
            {!isCollapsed && <label className={styles.themeToggleLabel}>{isDarkMode ? 'Claro' : 'Escuro'}</label>}
          </div>

          {!isCollapsed ? (
            <div className={styles.footerLinks}>
              <Link href="#" className={styles.footerLink}>
                <FaQuestionCircle />
                Ajuda & Suporte
              </Link>
              <Link href="#" className={styles.footerLink}>
                <FaCog />
                Configurações
              </Link>
            </div>
          ) : (
            <div className={styles.footerIconLinks}>
              <Link href="#" className={styles.footerIconLink} title="Ajuda & Suporte">
                <FaQuestionCircle />
              </Link>
              <Link href="#" className={styles.footerIconLink} title="Configurações">
                <FaCog />
              </Link>
            </div>
          )}
          <div className={styles.footerVersion}>v3.0.29</div>
        </div>
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
        <FaGripLinesVertical />
        <FaChevronLeft />
      </button>
    </div>
  );
}
