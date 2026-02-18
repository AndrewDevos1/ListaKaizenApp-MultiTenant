'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  FaUser,
} from 'react-icons/fa';
import styles from './Sidebar.module.css';

interface MenuItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const { user, logout, isAdmin } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [toggled, setToggled] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

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
      setCollapsed(savedCollapsed);
    }
  }, []);

  // Persist collapsed state
  const handleToggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const newState = !prev;
      localStorage.setItem('sidebarCollapsed', newState.toString());
      return newState;
    });
  }, []);

  // Toggle mobile sidebar
  const handleToggleMobile = useCallback(() => {
    setToggled((prev) => !prev);
  }, []);

  // Close mobile sidebar on link click
  const closeMobileMenu = useCallback(() => {
    setToggled(false);
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

  if (!user) return null;

  // Menu groups based on role
  const adminMenuGroups: MenuGroup[] = [
    {
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

  const menuGroups = isAdmin ? adminMenuGroups : collaboratorMenuGroups;

  const isMenuItemActive = (href: string): boolean => {
    return pathname === href;
  };

  return (
    <div className={`${styles.wrapper} ${collapsed ? styles.collapsed : ''} ${toggled ? styles.toggled : ''}`}>
      {/* Overlay for mobile */}
      <div className={styles.overlay} onClick={closeMobileMenu} />

      {/* Sidebar Navigation */}
      <nav className={styles.sidebarWrapper}>
        {/* Header */}
        <div className={styles.sidebarHeader}>
          <h1>Kaizen</h1>
          <button
            className={styles.collapseBtn}
            onClick={handleToggleCollapse}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            <FaChevronRight style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          </button>
        </div>

        {/* User Info */}
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>
            <FaUser />
          </div>
          <div className={styles.userDetails}>
            <div className={styles.userName}>{user.nome}</div>
            <div className={styles.userRole}>{isAdmin ? 'Administrador' : 'Colaborador'}</div>
          </div>
        </div>

        {/* Menu Container */}
        <div className={styles.menuContainer}>
          {menuGroups.map((group, groupIndex) => (
            <div key={groupIndex} className={styles.menuGroup}>
              <label className={styles.groupLabel}>{group.label}</label>
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
          <label className={styles.themeToggleLabel}>
            {isDarkMode ? 'Claro' : 'Escuro'}
          </label>
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
        aria-label={toggled ? 'Fechar menu' : 'Abrir menu'}
        title={toggled ? 'Fechar menu' : 'Abrir menu'}
      >
        {toggled ? <FaTimes /> : <FaBars />}
        MENU
      </button>
    </div>
  );
}
