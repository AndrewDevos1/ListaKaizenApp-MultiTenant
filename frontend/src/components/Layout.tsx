
import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Layout.module.css';

interface MenuItem {
  path: string;
  icon: string;
  label: string;
  ariaLabel: string;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

const Layout: React.FC = () => {
  const [isToggled, setIsToggled] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(
    localStorage.getItem('sidebarCollapsed') === 'true'
  );
  const [searchTerm, setSearchTerm] = React.useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Admin menu structure
  const adminMenuGroups: MenuGroup[] = [
    {
      title: 'VISÃO GERAL',
      items: [
        { path: '/admin', icon: 'fa-tachometer-alt', label: 'Dashboard Admin', ariaLabel: 'Dashboard - Painel de controle' },
        { path: '/admin/global', icon: 'fa-globe', label: 'Dashboard Global', ariaLabel: 'Dashboard Global' }
      ]
    },
    {
      title: 'LISTAS & ESTOQUE',
      items: [
        { path: '/admin/listas-compras', icon: 'fa-shopping-cart', label: 'Listas de Compras', ariaLabel: 'Listas de Compras' },
        { path: '/admin/catalogo-global', icon: 'fa-book', label: 'Catálogo Global', ariaLabel: 'Catálogo Global de Itens' },
        { path: '/admin/areas', icon: 'fa-map-marker-alt', label: 'Áreas', ariaLabel: 'Áreas' }
      ]
    },
    {
      title: 'GESTÃO',
      items: [
        { path: '/admin/gerenciar-usuarios', icon: 'fa-users-cog', label: 'Gerenciar Usuários', ariaLabel: 'Gerenciar Usuários' },
        { path: '/admin/submissoes', icon: 'fa-clipboard-check', label: 'Submissões', ariaLabel: 'Gerenciar Submissões' },
        { path: '/admin/fornecedores', icon: 'fa-truck', label: 'Fornecedores', ariaLabel: 'Fornecedores' },
        { path: '/admin/gerar-cotacao', icon: 'fa-file-invoice-dollar', label: 'Gerar Cotação', ariaLabel: 'Gerar Cotação' },
        { path: '/admin/cotacoes', icon: 'fa-chart-pie', label: 'Cotações', ariaLabel: 'Cotações' }
      ]
    },
    {
      title: 'PERFIL',
      items: [
        { path: '/admin/editar-perfil', icon: 'fa-user-edit', label: 'Editar Perfil', ariaLabel: 'Editar Perfil' },
        { path: '/admin/mudar-senha', icon: 'fa-key', label: 'Mudar Senha', ariaLabel: 'Mudar senha' },
        { path: '/logout', icon: 'fa-sign-out-alt', label: 'Sair', ariaLabel: 'Sair do sistema' }
      ]
    }
  ];

  // Collaborator menu structure
  const collaboratorMenuGroups: MenuGroup[] = [
    {
      title: 'DASHBOARD',
      items: [
        { path: '/collaborator', icon: 'fa-tachometer-alt', label: 'Meu Dashboard', ariaLabel: 'Dashboard - Painel de controle' }
      ]
    },
    {
      title: 'MINHAS ATIVIDADES',
      items: [
        { path: '/collaborator/listas', icon: 'fa-shopping-cart', label: 'Minhas Listas', ariaLabel: 'Minhas Listas' },
        { path: '/collaborator/submissions', icon: 'fa-clipboard-list', label: 'Minhas Submissões', ariaLabel: 'Minhas Submissões' }
      ]
    },
    {
      title: 'PERFIL',
      items: [
        { path: '/collaborator/perfil', icon: 'fa-user-edit', label: 'Editar Perfil', ariaLabel: 'Editar Perfil' },
        { path: '/collaborator/mudar-senha', icon: 'fa-key', label: 'Mudar Senha', ariaLabel: 'Mudar senha' },
        { path: '/logout', icon: 'fa-sign-out-alt', label: 'Sair', ariaLabel: 'Sair do sistema' }
      ]
    }
  ];

  // Select menu based on user role
  const menuGroups: MenuGroup[] = user?.role === 'ADMIN' ? adminMenuGroups : collaboratorMenuGroups;

  // Filter menu items based on search
  const filteredGroups = React.useMemo(() => {
    if (!searchTerm) return menuGroups;

    return menuGroups
      .map(group => ({
        ...group,
        items: group.items.filter(item =>
          item.label.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }))
      .filter(group => group.items.length > 0);
  }, [searchTerm, menuGroups]);

  const handleToggle = () => {
    setIsToggled(!isToggled);
  };

  const handleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    localStorage.setItem('sidebarCollapsed', newCollapsed.toString());
  };

  const handleOverlayClick = () => {
    setIsToggled(false);
  };

  const handleLinkClick = () => {
    if (window.innerWidth < 768) {
      setIsToggled(false);
    }
  };

  const handleSearchFocus = () => {
    if (isCollapsed && window.innerWidth >= 768) {
      setIsCollapsed(false);
      localStorage.setItem('sidebarCollapsed', 'false');
    }
  };

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
      if (window.innerWidth >= 768 && isToggled) {
        setIsToggled(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isToggled]);

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
    } else if (isRightSwipe && isToggled) {
      // Swipe to the right (close sidebar)
      setIsToggled(false);
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
      className={`d-flex ${isToggled ? styles.toggled : ''} ${isCollapsed ? styles.collapsed : ''} ${styles.wrapper}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
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
      >
        {/* Header */}
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarHeading}>
            <i className="fas fa-stream me-2" aria-hidden="true"></i>
            {!isCollapsed && <span>Kaizen</span>}
          </div>

          {/* Collapse button (desktop only) */}
          <button
            className={styles.collapseButton}
            onClick={handleCollapse}
            aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
            title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            <i className={`fas ${isCollapsed ? 'fa-chevron-left' : 'fa-chevron-right'}`} aria-hidden="true"></i>
          </button>
        </div>

        {/* User Profile Section */}
        {user && (
          <div className={styles.userProfileSection}>
            <div className={styles.userAvatar}>
              <i className={`fas ${user.role === 'ADMIN' ? 'fa-user-shield' : 'fa-user'}`} aria-hidden="true"></i>
            </div>
            {!isCollapsed && (
              <div className={styles.userInfo}>
                <div className={styles.userName}>{user.nome}</div>
                <div className={styles.userRole}>
                  {user.role === 'ADMIN' ? 'Administrador' : 'Colaborador'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search bar */}
        {!isCollapsed && (
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

        {/* Menu groups */}
        <div className={styles.menuContainer}>
          {filteredGroups.map((group, groupIndex) => (
            <div key={groupIndex} className={styles.menuGroup}>
              {!isCollapsed && (
                <div className={styles.menuGroupTitle}>{group.title}</div>
              )}
              {isCollapsed && groupIndex > 0 && (
                <div className={styles.menuDivider}></div>
              )}
              <div className={styles.menuGroupItems}>
                {group.items.map((item, itemIndex) => {
                  // Tratamento especial para o item "Sair" (logout)
                  if (item.path === '/logout') {
                    return (
                      <button
                        key={itemIndex}
                        className={styles.listGroupItem}
                        onClick={() => {
                          handleLinkClick();
                          handleLogout();
                        }}
                        aria-label={item.ariaLabel}
                        title={isCollapsed ? item.label : undefined}
                        style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none' }}
                      >
                        <i className={`fas ${item.icon}`} aria-hidden="true"></i>
                        {!isCollapsed && <span className={styles.menuItemText}>{item.label}</span>}
                      </button>
                    );
                  }

                  // Renderização normal para outros itens
                  return (
                    <Link
                      key={itemIndex}
                      to={item.path}
                      className={getLinkClass(item.path)}
                      onClick={handleLinkClick}
                      aria-label={item.ariaLabel}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <i className={`fas ${item.icon}`} aria-hidden="true"></i>
                      {!isCollapsed && <span className={styles.menuItemText}>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className={styles.sidebarFooter}>
          {!isCollapsed ? (
            <>
              <div className={styles.footerVersion}>v1.0.0</div>
              <a href="#!" className={styles.footerLink}>
                <i className="fas fa-question-circle me-2" aria-hidden="true"></i>
                Ajuda & Suporte
              </a>
              <a href="#!" className={styles.footerLink}>
                <i className="fas fa-cog me-2" aria-hidden="true"></i>
                Configurações
              </a>
            </>
          ) : (
            <>
              <a href="#!" className={styles.footerIconLink} title="Ajuda & Suporte">
                <i className="fas fa-question-circle" aria-hidden="true"></i>
              </a>
              <a href="#!" className={styles.footerIconLink} title="Configurações">
                <i className="fas fa-cog" aria-hidden="true"></i>
              </a>
            </>
          )}
        </div>
      </nav>

      {/* Page Content */}
      <div className={styles.pageContentWrapper}>
        <div className="container-fluid px-4">
          <Outlet />
        </div>
      </div>

      {/* Sidebar Tab/Handle (Orelha) */}
      <button
        className={styles.sidebarTab}
        onClick={handleToggle}
        aria-label={isToggled ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={isToggled}
      >
        <i className={`fas fa-chevron-left`} aria-hidden="true"></i>
        <span className={styles.sidebarTabText}>Menu</span>
        <i className={`fas fa-grip-lines-vertical`} aria-hidden="true" style={{ fontSize: '0.875rem', opacity: 0.7 }}></i>
      </button>
    </div>
  );
};

export default Layout;
