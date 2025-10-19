import React, { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import DashboardPage from "./DashboardPage";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";

const queryClient = new QueryClient();

const NotFound = () => <div className="p-8 text-center">404 — Página não encontrada</div>;

const App = () => {
  useEffect(() => {
    // Indicação no console para confirmar que este App foi carregado
    console.log("App mounted — bundle atualizado (App.tsx)");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Rotas públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route path="/" element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="admin/dashboard" element={<DashboardPage />} />
            <Route path="admin/profile" element={<div>Página de Perfil</div>} />
            <Route path="admin/change-password" element={<div>Página de Alterar Senha</div>} />
            <Route path="admin/conteudo" element={<div>Página de Listas / Itens</div>} />
            <Route path="admin/categorias" element={<div>Página de Categorias / Tags</div>} />
            <Route path="admin/aprovacoes" element={<div>Página de Aprovações</div>} />
            <Route path="admin/historico-aprovacoes" element={<div>Página de Histórico de Aprovações</div>} />
            <Route path="admin/usuarios" element={<div>Página de Usuários</div>} />
            <Route path="admin/papeis-permissoes" element={<div>Página de Papéis & Permissões</div>} />
            <Route path="admin/relatorios" element={<div>Página de Relatórios</div>} />
            <Route path="admin/integracoes" element={<div>Página de Integrações / Webhooks</div>} />
            <Route path="admin/configuracoes" element={<div>Página de Configurações</div>} />
            <Route path="admin/auditoria" element={<div>Página de Auditoria (logs)</div>} />
            <Route path="admin/ajuda" element={<div>Página de Ajuda / Documentação</div>} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;