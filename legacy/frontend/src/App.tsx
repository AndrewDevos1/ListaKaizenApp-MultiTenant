
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import Login from './features/auth/Login';
import Register from './features/auth/Register';
import RegisterConvite from './features/auth/RegisterConvite';
import RegisterRestaurant from './features/auth/RegisterRestaurant';
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
import ItensRegionais from './features/admin/ItensRegionais';
import UserManagement from './features/admin/UserManagement';
import ListasCompras from './features/admin/ListasCompras';
import ListaMaeConsolidada from './features/admin/ListaMaeConsolidada';
import GerenciarItensLista from './features/admin/GerenciarItensLista';
import GerenciarUsuarios from './features/admin/GerenciarUsuarios';
import GerenciarRestaurantes from './features/admin/GerenciarRestaurantes';
import GerenciarPedidos from './features/admin/GerenciarPedidos';
import GerenciarChecklists from './features/admin/GerenciarChecklists';
import DetalhesChecklist from './features/admin/DetalhesChecklist';
import GerenciarSubmissoes from './features/admin/GerenciarSubmissoes';
import DetalhesSubmissao from './features/admin/DetalhesSubmissao';
import GerenciarSugestoes from './features/admin/GerenciarSugestoes';
import GerenciarListasRapidas from './features/admin/GerenciarListasRapidas';
import GerarConvite from './features/admin/GerarConvite';
import GerenciarConvitesFornecedor from './features/admin/GerenciarConvitesFornecedor';
import GerenciarFornecedoresCadastrados from './features/admin/GerenciarFornecedoresCadastrados';
import DetalhesFornecedorCadastrado from './features/admin/DetalhesFornecedorCadastrado';
import POPTemplates from './features/admin/POPTemplates';
import POPListas from './features/admin/POPListas';
import POPListaDetalhes from './features/admin/POPListaDetalhes';
import POPAuditoria from './features/admin/POPAuditoria';
import FornecedoresRegiao from './features/fornecedores/FornecedoresRegiao';
import SolicitacoesRestaurante from './features/admin/SolicitacoesRestaurante';
import StatisticsDashboard from './features/admin/StatisticsDashboard';
import Configuracoes from './features/admin/Configuracoes';
import MudarSenha from './features/admin/MudarSenha';
import EditarPerfil from './features/admin/EditarPerfil';
import CriarUsuario from './features/admin/CriarUsuario';
import CollaboratorDashboard from './features/collaborator/CollaboratorDashboard';
import AdminLanding from './components/AdminLanding';
import CollaboratorConfiguracoes from './features/collaborator/Configuracoes';
import MinhasListasCompras from './features/collaborator/MinhasListasCompras';
import EstoqueListaCompras from './features/collaborator/EstoqueListaCompras';
import MinhasPOPListas from './features/collaborator/MinhasPOPListas';
import ExecutarPOPChecklist from './features/collaborator/ExecutarPOPChecklist';
import HistoricoPOPExecucoes from './features/collaborator/HistoricoPOPExecucoes';
import MinhasSugestoes from './features/colaborador/MinhasSugestoes';
import CriarListaRapida from './features/colaborador/CriarListaRapida';
import MinhasListasRapidas from './features/colaborador/MinhasListasRapidas';
import DetalhesListaRapida from './features/colaborador/DetalhesListaRapida';
import DetalhesListaRapidaAdmin from './features/admin/DetalhesListaRapida';
import EditarListaRapida from './features/colaborador/EditarListaRapida';
import VisualizarCatalogo from './features/colaborador/VisualizarCatalogo';
import AdminRoute from './components/AdminRoute';
import CollaboratorRoute from './components/CollaboratorRoute';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import SupplierLogin from './features/supplier/SupplierLogin';
import SupplierRegister from './features/supplier/SupplierRegister';
import SupplierRegisterConvite from './features/supplier/SupplierRegisterConvite';
import SupplierRoute from './features/supplier/SupplierRoute';
import SupplierDashboard from './features/supplier/SupplierDashboard';
import SupplierProfile from './features/supplier/SupplierProfile';
import SupplierItems from './features/supplier/SupplierItems';
import SupplierItemForm from './features/supplier/SupplierItemForm';
import SupplierItemPriceHistory from './features/supplier/SupplierItemPriceHistory';
import './App.css';

function App() {
  return (
    <Router>
        <Routes>
          <Route element={<PublicRoute />}>
            {/* Rota Pública - HomePage */}
            <Route path="/" element={<HomePage />} />

            {/* Rotas de Autenticação */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/convite" element={<RegisterConvite />} />
            <Route path="/register-restaurant" element={<RegisterRestaurant />} />
            <Route path="/supplier/login" element={<SupplierLogin />} />
            <Route path="/supplier/register" element={<SupplierRegister />} />
            <Route path="/supplier/register-convite" element={<SupplierRegisterConvite />} />
          </Route>

          {/* Rotas Administrativas */}
          <Route element={<Layout />}>
            <Route path="/fornecedores-regiao" element={<ProtectedRoute />}>
              <Route index element={<FornecedoresRegiao />} />
            </Route>

            <Route path="/admin" element={<AdminRoute />}>
              <Route index element={<AdminLanding />} />
              <Route path="gerenciar-usuarios" element={<GerenciarUsuarios />} />
              <Route path="restaurantes" element={<GerenciarRestaurantes />} />
              <Route path="gerenciar-pedidos" element={<GerenciarPedidos />} />
              <Route path="submissoes" element={<GerenciarSubmissoes />} />
              <Route path="submissoes/:id" element={<DetalhesSubmissao />} />
              <Route path="checklists" element={<GerenciarChecklists />} />
              <Route path="checklists/:id" element={<DetalhesChecklist />} />
              <Route path="sugestoes" element={<GerenciarSugestoes />} />
              <Route path="lista-rapida/criar" element={<CriarListaRapida />} />
              <Route path="listas-rapidas" element={<GerenciarListasRapidas />} />
              <Route path="listas-rapidas/:id" element={<DetalhesListaRapidaAdmin />} />
              <Route path="pop-templates" element={<POPTemplates />} />
              <Route path="pop-listas" element={<POPListas />} />
              <Route path="pop-listas/:listaId" element={<POPListaDetalhes />} />
              <Route path="pop-auditoria" element={<POPAuditoria />} />
              <Route path="configuracoes" element={<Configuracoes />} />
              <Route path="mudar-senha" element={<MudarSenha />} />
              <Route path="editar-perfil" element={<EditarPerfil />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="users/new" element={<CriarUsuario />} />
              <Route path="convites" element={<GerarConvite />} />
              <Route path="convites-fornecedor" element={<GerenciarConvitesFornecedor />} />
              <Route path="fornecedores-cadastrados" element={<GerenciarFornecedoresCadastrados />} />
              <Route path="fornecedores-cadastrados/:fornecedorId" element={<DetalhesFornecedorCadastrado />} />
              <Route path="solicitacoes-restaurante" element={<SolicitacoesRestaurante />} />
              <Route path="listas-compras" element={<ListasCompras />} />
              <Route path="listas/:listaId/lista-mae" element={<ListaMaeConsolidada />} />
              <Route path="listas/:listaId/gerenciar-itens" element={<GerenciarItensLista />} />
              <Route path="items" element={<ItemManagement />} />
              <Route path="catalogo-global" element={<CatalogoGlobal />} />
              <Route path="itens-regionais" element={<ItensRegionais />} />
              <Route path="areas" element={<AreaManagement />} />
              <Route path="fornecedores" element={<FornecedorManagement />} />
              <Route path="fornecedores/:fornecedorId/detalhes" element={<FornecedorDetalhes />} />
              <Route path="gerar-cotacao" element={<GerarCotacao />} />
              <Route path="cotacoes" element={<CotacaoList />} />
              <Route path="cotacoes/:cotacaoId" element={<CotacaoDetail />} />
              <Route path="estatisticas" element={<StatisticsDashboard />} />
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
              <Route path="lista-rapida/:id/editar" element={<EditarListaRapida />} />
              <Route path="minhas-listas-rapidas" element={<MinhasListasRapidas />} />
              <Route path="catalogo" element={<VisualizarCatalogo />} />
              <Route path="areas/:areaId/estoque" element={<EstoqueLista />} />
              <Route path="listas" element={<MinhasListasCompras />} />
              <Route path="listas/:listaId/estoque" element={<EstoqueListaCompras />} />
              <Route path="pop-listas" element={<MinhasPOPListas />} />
              <Route path="pop-execucoes/:execucaoId" element={<ExecutarPOPChecklist />} />
              <Route path="pop-historico" element={<HistoricoPOPExecucoes />} />
              <Route path="perfil" element={<EditarPerfil />} />
              <Route path="mudar-senha" element={<MudarSenha />} />
              <Route path="configuracoes" element={<CollaboratorConfiguracoes />} />
            </Route>

            {/* Rotas de Fornecedor */}
            <Route path="/supplier" element={<SupplierRoute />}>
              <Route index element={<SupplierDashboard />} />
              <Route path="dashboard" element={<SupplierDashboard />} />
              <Route path="perfil" element={<SupplierProfile />} />
              <Route path="itens" element={<SupplierItems />} />
              <Route path="itens/novo" element={<SupplierItemForm mode="create" />} />
              <Route path="itens/:id/editar" element={<SupplierItemForm mode="edit" />} />
              <Route path="itens/:id/historico" element={<SupplierItemPriceHistory />} />
            </Route>
          </Route>

        </Routes>
    </Router>
  );
}

export default App;
