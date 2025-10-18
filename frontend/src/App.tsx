import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Login from './features/auth/Login';
import Register from './features/auth/Register';
import Dashboard from './features/dashboard/Dashboard';
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
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Layout from './components/Layout';
import { useAuth } from './context/AuthContext';
import './App.css';

function App() {
  return (
    <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Envolve todas as rotas protegidas com o componente de Layout */}
          <Route element={<Layout />}>
            <Route path="/" element={<ProtectedRoute />}>
              <Route index element={<Dashboard />} />
              <Route path="me/submissions" element={<MinhasSubmissoes />} />
              <Route path="area/:areaId/estoque" element={<EstoqueLista />} />
            </Route>

            <Route path="/admin" element={<AdminRoute />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="items" element={<ItemManagement />} />
              <Route path="areas" element={<AreaManagement />} />
              <Route path="fornecedores" element={<FornecedorManagement />} />
              <Route path="gerar-cotacao" element={<GerarCotacao />} />
              <Route path="cotacoes" element={<CotacaoList />} />
              <Route path="cotacoes/:cotacaoId" element={<CotacaoDetail />} />
            </Route>
          </Route>

        </Routes>
    </Router>
  );
}

export default App;