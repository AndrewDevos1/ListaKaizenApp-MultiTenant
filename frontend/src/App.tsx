
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import Login from './features/auth/Login';
import Register from './features/auth/Register';
import Dashboard from './features/dashboard/Dashboard';
import GlobalDashboard from './features/dashboard/GlobalDashboard';
import EstoqueLista from './features/inventory/EstoqueLista';
import MinhasSubmissoes from './features/inventory/MinhasSubmissoes';
import GerarCotacao from './features/admin/GerarCotacao';
import CotacaoList from './features/admin/CotacaoList';
import CotacaoDetail from './features/admin/CotacaoDetail';
import FornecedorManagement from './features/admin/FornecedorManagement';
import AreaManagement from './features/admin/AreaManagement';
import ItemManagement from './features/admin/ItemManagement';
import AdminDashboard from './features/admin/AdminDashboard';
import UserManagement from './features/admin/UserManagement';
import ListManagement from './features/admin/ListManagement';
import CriarLista from './features/admin/CriarLista';
import ListasCompras from './features/admin/ListasCompras';
import GerenciarUsuarios from './features/admin/GerenciarUsuarios';
import Configuracoes from './features/admin/Configuracoes';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Layout from './components/Layout';
import './App.css';

function App() {
  return (
    <Router>
        <Routes>
          {/* Rota Pública - HomePage */}
          <Route path="/" element={<HomePage />} />

          {/* Rotas de Autenticação */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Dashboard Admin CoreUI - Rota Especial */}
          <Route element={<Layout />}>
            <Route path="/dashboardadm" element={<AdminRoute />}>
              <Route index element={<AdminDashboard />} />
            </Route>

            {/* Rotas protegidas de usuário colaborador */}
            <Route path="/dashboard" element={<ProtectedRoute />}>
              <Route index element={<Dashboard />} />
              <Route path="submissions" element={<MinhasSubmissoes />} />
              <Route path="area/:areaId/estoque" element={<EstoqueLista />} />
            </Route>

            {/* Rotas administrativas */}
            <Route path="/admin" element={<AdminRoute />}>
              <Route index element={<AdminDashboard />} />
              <Route path="gerenciar-usuarios" element={<GerenciarUsuarios />} />
              <Route path="configuracoes" element={<Configuracoes />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="listas" element={<ListManagement />} />
              <Route path="lista-tarefas" element={<CriarLista />} />
              <Route path="listas-compras" element={<ListasCompras />} />
              <Route path="items" element={<ItemManagement />} />
              <Route path="areas" element={<AreaManagement />} />
              <Route path="fornecedores" element={<FornecedorManagement />} />
              <Route path="gerar-cotacao" element={<GerarCotacao />} />
              <Route path="cotacoes" element={<CotacaoList />} />
              <Route path="cotacoes/:cotacaoId" element={<CotacaoDetail />} />
              <Route path="global" element={<GlobalDashboard />} />
            </Route>
          </Route>

        </Routes>
    </Router>
  );
}

export default App;
