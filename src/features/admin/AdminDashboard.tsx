import React from 'react';
import { Link } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
    return (
        <div>
            <h2>Dashboard do Administrador</h2>
            <ul>
                <li><Link to="/admin/users">Gerenciar Usuários</Link></li>
                <li><Link to="/admin/items">Gerenciar Itens</Link></li>
                <li><Link to="/admin/areas">Gerenciar Áreas</Link></li>
                <li><Link to="/admin/fornecedores">Gerenciar Fornecedores</Link></li>
                <hr />
                <li><Link to="/admin/gerar-cotacao">Gerar Nova Cotação</Link></li>
                <li><Link to="/admin/cotacoes">Ver Cotações</Link></li>
                <li><Link to="/admin/exportar-pedidos">Exportar Pedidos</Link></li>
                {/* Links para outras seções de gerenciamento virão aqui */}
            </ul>
        </div>
    );
};

export default AdminDashboard;
