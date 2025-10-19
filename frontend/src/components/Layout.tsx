
import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

const Layout: React.FC = ({ children }) => {
  const [isToggled, setIsToggled] = React.useState(false);
  const location = useLocation();

  const handleToggle = () => {
    setIsToggled(!isToggled);
  };

  const getLinkClass = (path) => {
    return location.pathname === path 
      ? "list-group-item list-group-item-action active"
      : "list-group-item list-group-item-action";
  };

  return (
    <div className={`d-flex ${isToggled ? 'toggled' : ''}`} id="wrapper">
      {/* Sidebar */}
      <div id="sidebar-wrapper">
        <div className="sidebar-heading text-center py-4 primary-text fs-4 fw-bold text-uppercase border-bottom">
          <i className="fas fa-stream me-2"></i>Kaizen
        </div>
        <div className="list-group list-group-flush my-3">
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
      <div id="page-content-wrapper">
        <nav className="navbar navbar-expand-lg navbar-light bg-transparent py-4 px-4">
          <div className="d-flex align-items-center">
            <i className="fas fa-align-left primary-text fs-4 me-3" id="menu-toggle" onClick={handleToggle}></i>
            <h2 className="fs-2 m-0">Kaizen Lists</h2>
          </div>

          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="navbarSupportedContent">
            <ul className="navbar-nav ms-auto mb-2 mb-lg-0">
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
    </div>
  );
};

export default Layout;
