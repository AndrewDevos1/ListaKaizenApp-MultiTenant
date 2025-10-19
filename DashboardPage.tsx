"use client";

import React from "react";
import DashboardCard from "./DashboardCard";
import {
  Users,
  List,
  CheckCircle,
  FileText,
  Plug,
  Settings,
  ScrollText,
  HelpCircle,
} from "lucide-react";

const DashboardPage = () => {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Dashboard Administrativo</h1>
      {/* Banner visível para identificar o novo Dashboard */}
      <div className="mt-1 inline-block rounded px-2 py-1 text-sm font-semibold text-red-700 bg-red-100">
        Layout atualizado — versão de desenvolvimento
      </div>
      <p className="text-muted-foreground">
        Visão geral e atalhos para as principais funcionalidades do sistema.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <DashboardCard
          icon={Users}
          title="Usuários"
          mainMetric="1.234"
          description="Total de usuários registrados no sistema."
          quickActions={[
            { label: "+ Novo Usuário", onClick: () => console.log("Novo Usuário") },
            { label: "Ver Pendentes", onClick: () => console.log("Ver Pendentes") },
          ]}
          footerLinkText="Ir para Usuários"
          footerLinkPath="/admin/usuarios"
        >
          <ul className="text-sm text-muted-foreground">
            <li>5 novos hoje</li>
            <li>2 pendentes de verificação</li>
          </ul>
        </DashboardCard>

        <DashboardCard
          icon={List}
          title="Conteúdo"
          mainMetric="567"
          description="Total de listas e itens de conteúdo."
          quickActions={[
            { label: "+ Nova Lista", onClick: () => console.log("Nova Lista") },
            { label: "Limpar Lixo", onClick: () => console.log("Limpar Lixo") },
          ]}
          footerLinkText="Ir para Conteúdo"
          footerLinkPath="/admin/conteudo"
        >
          <ul className="text-sm text-muted-foreground">
            <li>12 itens sem categoria</li>
            <li>3 rascunhos</li>
          </ul>
        </DashboardCard>

        <DashboardCard
          icon={CheckCircle}
          title="Aprovações"
          mainMetric="15"
          description="Itens aguardando sua aprovação."
          quickActions={[
            { label: "Abrir Fila", onClick: () => console.log("Abrir Fila") },
            { label: "Aprovar em Massa", onClick: () => console.log("Aprovar em Massa") },
          ]}
          footerLinkText="Ir para Aprovações"
          footerLinkPath="/admin/aprovacoes"
        >
          <ul className="text-sm text-muted-foreground">
            <li>Tempo médio de espera: 2h</li>
            <li>3 itens urgentes</li>
          </ul>
        </DashboardCard>

        <DashboardCard
          icon={FileText}
          title="Relatórios"
          mainMetric="8"
          description="Últimos relatórios gerados."
          quickActions={[
            { label: "Gerar Novo", onClick: () => console.log("Gerar Novo Relatório") },
            { label: "Exportar CSV", onClick: () => console.log("Exportar CSV") },
          ]}
          footerLinkText="Ir para Relatórios"
          footerLinkPath="/admin/relatorios"
        >
          <ul className="text-sm text-muted-foreground">
            <li>Relatório de Vendas (Ontem)</li>
            <li>Relatório de Acessos (Semana)</li>
          </ul>
        </DashboardCard>

        <DashboardCard
          icon={Plug}
          title="Integrações"
          mainMetric="3 Ativas"
          description="Status das integrações do sistema."
          quickActions={[
            { label: "Reexecutar Sync", onClick: () => console.log("Reexecutar Sync") },
            { label: "Editar Chaves", onClick: () => console.log("Editar Chaves") },
          ]}
          footerLinkText="Ir para Integrações"
          footerLinkPath="/admin/integracoes"
        >
          <ul className="text-sm text-muted-foreground">
            <li>2 falhas nas últimas 24h</li>
            <li>Última sincronização: 10 min atrás</li>
          </ul>
        </DashboardCard>

        <DashboardCard
          icon={Settings}
          title="Configurações"
          mainMetric="OK"
          description="Ajustes e configurações gerais do sistema."
          quickActions={[
            { label: "Abrir Painel", onClick: () => console.log("Abrir Painel de Configurações") },
            { label: "Ver Logs", onClick: () => console.log("Ver Logs de Configurações") },
          ]}
          footerLinkText="Ir para Configurações"
          footerLinkPath="/admin/configuracoes"
        >
          <ul className="text-sm text-muted-foreground">
            <li>Limites de upload: 100MB</li>
            <li>Modo de ambiente: Produção</li>
          </ul>
        </DashboardCard>

        <DashboardCard
          icon={ScrollText}
          title="Auditoria"
          mainMetric="2.5K"
          description="Registro de eventos e atividades do sistema."
          quickActions={[
            { label: "Ver Logs Detalhados", onClick: () => console.log("Ver Logs Detalhados") },
            { label: "Filtrar Eventos", onClick: () => console.log("Filtrar Eventos") },
          ]}
          footerLinkText="Ir para Auditoria"
          footerLinkPath="/admin/auditoria"
        >
          <ul className="text-sm text-muted-foreground">
            <li>Usuário 'Admin' logou (agora)</li>
            <li>Item 'X' aprovado (5 min atrás)</li>
          </ul>
        </DashboardCard>

        <DashboardCard
          icon={HelpCircle}
          title="Ajuda"
          mainMetric="Suporte"
          description="Recursos de ajuda e documentação."
          quickActions={[
            { label: "Criar Ticket", onClick: () => console.log("Criar Ticket de Suporte") },
            { label: "Ver Docs", onClick: () => console.log("Ver Documentação") },
          ]}
          footerLinkText="Ir para Ajuda"
          footerLinkPath="/admin/ajuda"
        >
          <ul className="text-sm text-muted-foreground">
            <li>FAQ atualizado</li>
            <li>Contato: suporte@exemplo.com</li>
          </ul>
        </DashboardCard>
      </div>

      {/* Componente simples de rodapé visual para representar 'MadeWithDyad' */}
      <footer className="mt-4 text-xs text-muted-foreground">
        Feito com ♥ — Kaizen Lista App
      </footer>
    </div>
  );
};

export default DashboardPage;