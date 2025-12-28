
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import Login from './features/auth/Login';
import Register from './features/auth/Register';
import GlobalDashboard from './features/dashboard/GlobalDashboard';
import EstoqueLista from './features/inventory/EstoqueLista';
import MinhasSubmissoes from './features/inventory/MinhasSubmissoes';
import DetalhesSubmissaoColaborador from './features/inventory/DetalhesSubmissaoColaborador';
import GerarCotacao from './features/admin/GerarCotacao';
import CotacaoList from './features/admin/CotacaoList';
import CotacaoDetail from './features/admin/CotacaoDetail';
import FornecedorManagement from './features/admin/FornecedorManagement';
import FornecedorDetalhes from './features/admin/FornecedorDetalhes';
import AreaManagement from './features/admin/AreaManagement';
import ItemManagement from './features/admin/ItemManagement';
import CatalogoGlobal from './features/admin/CatalogoGlobal';
import AdminDashboard from './features/admin/AdminDashboard';
import UserManagement from './features/admin/UserManagement';
import ListasCompras from './features/admin/ListasCompras';
import ListaMaeConsolidada from './features/admin/ListaMaeConsolidada';
import GerenciarItensLista from './features/admin/GerenciarItensLista';
import GerenciarUsuarios from './features/admin/GerenciarUsuarios';
import GerenciarPedidos from './features/admin/GerenciarPedidos';
import GerenciarSubmissoes from './features/admin/GerenciarSubmissoes';
import DetalhesSubmissao from './features/admin/DetalhesSubmissao';
import GerenciarSugestoes from './features/admin/GerenciarSugestoes';
import GerenciarListasRapidas from './features/admin/GerenciarListasRapidas';
import Configuracoes from './features/admin/Configuracoes';
import MudarSenha from './features/admin/MudarSenha';
import EditarPerfil from './features/admin/EditarPerfil';
import CriarUsuario from './features/admin/CriarUsuario';
import CollaboratorDashboard from './features/collaborator/CollaboratorDashboard';
import MinhasListasCompras from './features/collaborator/MinhasListasCompras';
import EstoqueListaCompras from './features/collaborator/EstoqueListaCompras';
import MinhasSugestoes from './features/colaborador/MinhasSugestoes';
import CriarListaRapida from './features/colaborador/CriarListaRapida';
import MinhasListasRapidas from './features/colaborador/MinhasListasRapidas';
import DetalhesListaRapida from './features/colaborador/DetalhesListaRapida';
import AdminRoute from './components/AdminRoute';
import CollaboratorRoute from './components/CollaboratorRoute';
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

          {/* Rotas Administrativas */}
          <Route element={<Layout />}>
            <Route path="/admin" element={<AdminRoute />}>
              <Route index element={<AdminDashboard />} />
              <Route path="gerenciar-usuarios" element={<GerenciarUsuarios />} />
              <Route path="gerenciar-pedidos" element={<GerenciarPedidos />} />
              <Route path="submissoes" element={<GerenciarSubmissoes />} />
              <Route path="submissoes/:id" element={<DetalhesSubmissao />} />
              <Route path="sugestoes" element={<GerenciarSugestoes />} />
              <Route path="listas-rapidas" element={<GerenciarListasRapidas />} />
              <Route path="configuracoes" element={<Configuracoes />} />
              <Route path="mudar-senha" element={<MudarSenha />} />
              <Route path="editar-perfil" element={<EditarPerfil />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="users/new" element={<CriarUsuario />} />
              <Route path="listas-compras" element={<ListasCompras />} />
              <Route path="listas/:listaId/lista-mae" element={<ListaMaeConsolidada />} />
              <Route path="listas/:listaId/gerenciar-itens" element={<GerenciarItensLista />} />
              <Route path="items" element={<ItemManagement />} />
              <Route path="catalogo-global" element={<CatalogoGlobal />} />
              <Route path="areas" element={<AreaManagement />} />
              <Route path="fornecedores" element={<FornecedorManagement />} />
              <Route path="fornecedores/:fornecedorId/detalhes" element={<FornecedorDetalhes />} />
              <Route path="gerar-cotacao" element={<GerarCotacao />} />
              <Route path="cotacoes" element={<CotacaoList />} />
              <Route path="cotacoes/:cotacaoId" element={<CotacaoDetail />} />
              <Route path="global" element={<GlobalDashboard />} />
            </Route>

            {/* Rotas de Colaborador */}
            <Route path="/collaborator" element={<CollaboratorRoute />}>
              <Route index element={<CollaboratorDashboard />} />
              <Route path="areas" element={<MinhasSubmissoes />} />
              <Route path="submissions" element={<MinhasSubmissoes />} />
              <Route path="submissions/:id" element={<DetalhesSubmissaoColaborador />} />
              <Route path="sugestoes" element={<MinhasSugestoes />} />
              <Route path="lista-rapida/criar" element={<CriarListaRapida />} />
              <Route path="lista-rapida/:id/detalhes" element={<DetalhesListaRapida />} />
              <Route path="minhas-listas-rapidas" element={<MinhasListasRapidas />} />
              <Route path="areas/:areaId/estoque" element={<EstoqueLista />} />
              <Route path="listas" element={<MinhasListasCompras />} />
              <Route path="listas/:listaId/estoque" element={<EstoqueListaCompras />} />
              <Route path="perfil" element={<EditarPerfil />} />
              <Route path="mudar-senha" element={<MudarSenha />} />
            </Route>
          </Route>

        </Routes>
    </Router>
  );
}

export default App;
