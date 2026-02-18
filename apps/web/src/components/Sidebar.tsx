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
  FaBars,
  FaTimes,
  FaChevronRight,
  FaSearch,
} from 'react-icons/fa';
import styles from './Sidebar.module.css';

interface MenuItem {
  label: string;
  href: string;
  icon: React.ReactNode;
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
    const saved = localStorage.getItem('expandedGroups');
    if (saved) {
      try {
        setExpandedGroups(JSON.parse(saved));
      } catch {
        // Fallback to default state
        setExpandedGroups(isAdmin ? { 'visao-geral': true, gestao: true } : { dashboard: true, atividades: true });
      }
    } else {
      // Default: expand all groups
      setExpandedGroups(isAdmin ? { 'visao-geral': true, gestao: true } : { dashboard: true, atividades: true });
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
        searchRef.current?.focus();
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
  }, [isToggled]);

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
          label: 'Dashboard',
          href: '/admin/dashboard',
          icon: <FaTachometerAlt />,
        },
      ],
    },
    {
      id: 'gestao',
      label: 'GESTÃO',
      items: [
        {
          label: 'Itens',
          href: '/admin/items',
          icon: <FaBoxes />,
        },
        {
          label: 'Áreas',
          href: '/admin/areas',
          icon: <FaMapMarkerAlt />,
        },
        {
          label: 'Listas',
          href: '/admin/listas',
          icon: <FaList />,
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
      ],
    },
  ];

  const allMenuGroups = isAdmin ? adminMenuGroups : collaboratorMenuGroups;

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
    return pathname === href;
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
          <div className={styles.userAvatar}>{user.nome.charAt(0).toUpperCase()}</div>
          <div className={styles.userDetails}>
            <div className={styles.userName}>{user.nome}</div>
            <div className={styles.userRole}>{isAdmin ? 'Administrador' : 'Colaborador'}</div>
          </div>
        </div>

        {/* Search */}
        <div className={styles.searchContainer}>
          <FaSearch className={styles.searchIcon} />
          <input
            ref={searchRef}
            type="text"
            className={styles.searchInput}
            placeholder="Buscar... (/)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Buscar menu"
          />
          {searchTerm && (
            <button
              className={styles.searchClear}
              onClick={() => setSearchTerm('')}
              aria-label="Limpar busca"
            >
              <FaTimes />
            </button>
          )}
        </div>

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
                  {group.items.map((item, itemIndex) => (
                    <Link
                      key={itemIndex}
                      href={item.href}
                      className={`${styles.menuItem} ${isMenuItemActive(item.href) ? styles.active : ''}`}
                      onClick={closeMobileMenu}
                    >
                      {item.icon}
                      <span className={styles.menuItemLabel}>{item.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className={styles.sidebarFooter}>
          <button
            className={styles.themeToggleBtn}
            onClick={handleToggleDarkMode}
            aria-label={isDarkMode ? 'Modo claro' : 'Modo escuro'}
            title={isDarkMode ? 'Modo claro' : 'Modo escuro'}
          >
            {isDarkMode ? <FaSun /> : <FaMoon />}
          </button>
          <label className={styles.themeToggleLabel}>{isDarkMode ? 'Claro' : 'Escuro'}</label>
        </div>

        {/* Logout */}
        <button className={styles.logoutBtn} onClick={logout}>
          <FaSignOutAlt />
          <span className={styles.menuItemLabel}>Sair</span>
        </button>
      </nav>

      {/* Page Content Wrapper */}
      <div className={styles.pageContentWrapper}>{children}</div>

      {/* Mobile Floating Tab */}
      <button
        className={styles.sidebarTab}
        onClick={handleToggleMobile}
        aria-label={isToggled ? 'Fechar menu' : 'Abrir menu'}
        title={isToggled ? 'Fechar menu' : 'Abrir menu'}
      >
        {isToggled ? <FaTimes /> : <FaBars />}
        MENU
      </button>
    </div>
  );
}
