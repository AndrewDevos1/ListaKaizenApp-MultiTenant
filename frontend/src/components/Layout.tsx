
import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import styles from './Layout.module.css'; // Import the CSS module

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isToggled, setIsToggled] = React.useState(false);
  const location = useLocation();

  const handleToggle = () => {
    setIsToggled(!isToggled);
  };

  const getLinkClass = (path: string) => { // Added type for path
    return location.pathname === path 
      ? `${styles.listGroupItem} ${styles.active}` // Use CSS module classes
      : styles.listGroupItem; // Use CSS module class
  };

  return (
    <div className={`d-flex ${isToggled ? styles.toggled : ''} ${styles.wrapper}`}> {/* Apply wrapper class */}
      {/* Sidebar */}
      <div className={styles.sidebarWrapper}> {/* Apply sidebarWrapper class */}
        <div className={`${styles.sidebarHeading} text-center py-4 primary-text fs-4 fw-bold text-uppercase border-bottom`}> {/* Apply sidebarHeading class */}
          <i className="fas fa-stream me-2"></i>Kaizen
        </div>
        <div className={`${styles.listGroup} list-group-flush my-3`}> {/* Apply listGroup class */}
          <Link to="/admin" className={getLinkClass("/admin")}>
            <i className="fas fa-tachometer-alt me-2"></i>Dashboard
          </Link>
          <Link to="/admin/users" className={getLinkClass("/admin/users")}>
            <i className="fas fa-users-cog me-2"></i>Gestão de Usuários
          </Link>
          <Link to="/admin/listas" className={getLinkClass("/admin/listas")}>
            <i className="fas fa-list-alt me-2"></i>Gestão de Listas
          </Link>
          <Link to="/admin/items" className={getLinkClass("/admin/items")}>
            <i className="fas fa-boxes me-2"></i>Itens
          </Link>
          <Link to="/admin/areas" className={getLinkClass("/admin/areas")}>
            <i className="fas fa-map-marker-alt me-2"></i>Áreas
          </Link>
          <Link to="/admin/fornecedores" className={getLinkClass("/admin/fornecedores")}>
            <i className="fas fa-truck me-2"></i>Fornecedores
          </Link>
          <Link to="/admin/cotacoes" className={getLinkClass("/admin/cotacoes")}>
            <i className="fas fa-chart-pie me-2"></i>Cotações
          </Link>
        </div>
      </div>
      {/* /#sidebar-wrapper */}

      {/* Page Content */}
      <div className={styles.pageContentWrapper}> {/* Apply pageContentWrapper class */}
        <nav className={`${styles.navbar} navbar navbar-expand-lg navbar-light bg-transparent py-4 px-4`}> {/* Apply navbar class */}
          <div className="d-flex align-items-center">
            <h2 className="fs-2 m-0">Kaizen Lists</h2>
          </div>

          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarSupportedContent">
            <ul className="navbar-nav ms-auto mb-2 mb-lg-0">
              <li className="nav-item dropdown">
                <a className="nav-link dropdown-toggle second-text fw-bold" href="#!" id="navbarDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                  <i className="fas fa-bell me-2"></i> {/* Notification Icon */}
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                    99+
                    <span className="visually-hidden">unread messages</span>
                  </span>
                </a>
              </li>
              <li className="nav-item dropdown">
                <a className="nav-link dropdown-toggle second-text fw-bold" href="#!" id="navbarDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                  <i className="fas fa-user me-2"></i>Administrador
                </a>
                <ul className="dropdown-menu" aria-labelledby="navbarDropdown">
                  <li><a className="dropdown-item" href="#!">Perfil</a></li>
                  <li><a className="dropdown-item" href="#!">Configurações</a></li>
                  <li><Link className="dropdown-item" to="/login">Logout</Link></li>
                </ul>
              </li>
            </ul>
          </div>
        </nav>

        <div className="container-fluid px-4">
          {children}
        </div>
      </div>
      {/* Mobile Menu Toggle (Bottom Right) */}
      <div className={styles.mobileMenuToggle} onClick={handleToggle}>
        <i className="fas fa-bars fs-4"></i>
      </div>
    </div>
  );
};

export default Layout;
