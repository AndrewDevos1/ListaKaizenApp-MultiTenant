"use client";

import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  List,
  CheckCircle,
  Users,
  FileText,
  Plug,
  Settings,
  ScrollText,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Tag,
  History,
  Shield,
} from "lucide-react";

const navItems = [
  {
    group: "Visão Geral",
    items: [
      {
        name: "Dashboard",
        icon: LayoutDashboard,
        path: "/admin/dashboard",
      },
    ],
  },
  {
    group: "Conteúdo",
    items: [
      {
        name: "Listas / Itens",
        icon: List,
        path: "/admin/conteudo",
      },
      {
        name: "Categorias / Tags",
        icon: Tag,
        path: "/admin/categorias",
      },
    ],
  },
  {
    group: "Fluxos",
    items: [
      {
        name: "Aprovações",
        icon: CheckCircle,
        path: "/admin/aprovacoes",
      },
      {
        name: "Histórico de Aprovações",
        icon: History,
        path: "/admin/historico-aprovacoes",
      },
    ],
  },
  {
    group: "Gestão",
    items: [
      {
        name: "Usuários",
        icon: Users,
        path: "/admin/usuarios",
      },
      {
        name: "Papéis & Permissões",
        icon: Shield,
        path: "/admin/papeis-permissoes",
      },
    ],
  },
  {
    group: "Operações",
    items: [
      {
        name: "Relatórios",
        icon: FileText,
        path: "/admin/relatorios",
      },
      {
        name: "Integrações / Webhooks",
        icon: Plug,
        path: "/admin/integracoes",
      },
    ],
  },
  {
    group: "Sistema",
    items: [
      {
        name: "Configurações",
        icon: Settings,
        path: "/admin/configuracoes",
      },
      {
        name: "Auditoria (logs)",
        icon: ScrollText,
        path: "/admin/auditoria",
      },
    ],
  },
  {
    group: "Suporte",
    items: [
      {
        name: "Ajuda / Documentação",
        icon: HelpCircle,
        path: "/admin/ajuda",
      },
    ],
  },
];

// Função cn mínima para unir classes
const cn = (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(" ");

interface AdminSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isCollapsed, onToggleCollapse }) => {
  return (
    <aside className={cn("group flex flex-col h-full border-r bg-sidebar transition-all duration-300", isCollapsed ? "w-16" : "w-64")}>
      <div className="relative flex h-14 items-center justify-center border-b px-4">
        {!isCollapsed && <span className="text-lg font-semibold text-sidebar-primary">Admin Menu</span>}
        <button
          onClick={onToggleCollapse}
          aria-expanded={!isCollapsed}
          className="absolute -right-3 top-1/2 -translate-y-1/2 rounded-full bg-background border border-border hidden sm:flex p-2"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          <span className="sr-only">Toggle Sidebar</span>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {navItems.map((group, groupIndex) => (
          <div key={group.group} className="mb-4">
            {!isCollapsed && <h3 className="mb-2 px-3 text-sm font-semibold text-sidebar-foreground">{group.group}</h3>}
            {group.items.map((item) => (
              <div key={item.name} className="mb-1">
                <NavLink
                  to={item.path}
                  title={isCollapsed ? item.name : undefined} // tooltip nativo quando colapsado
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      isActive && "bg-sidebar-primary text-sidebar-primary-foreground",
                      isCollapsed && "justify-center",
                    )
                  }
                >
                  <item.icon className="h-5 w-5" />
                  {!isCollapsed && <span className="text-sm">{item.name}</span>}
                  <span className="sr-only">{item.name}</span>
                </NavLink>
              </div>
            ))}
            {groupIndex < navItems.length - 1 && !isCollapsed && <hr className="my-2 border-sidebar-border" />}
          </div>
        ))}
      </nav>

      {/* Painel de conta no rodapé (visual) */}
      <div className="border-t px-3 py-3">
        <div className={cn("flex items-center gap-3", isCollapsed ? "justify-center" : "")}>
          <div className="h-9 w-9 rounded-full bg-muted" />
          {!isCollapsed && (
            <div className="flex-1">
              <div className="text-sm font-medium">Admin</div>
              <div className="text-xs text-muted-foreground">admin@exemplo.com</div>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <div className="mt-3 flex flex-col gap-2">
            <NavLink to="/admin/profile" className="text-sm hover:underline">
              Perfil
            </NavLink>
            <NavLink to="/admin/change-password" className="text-sm hover:underline">
              Alterar senha
            </NavLink>
            <NavLink to="/login" className="text-sm text-destructive hover:underline">
              Logout
            </NavLink>
          </div>
        )}
      </div>
    </aside>
  );
};

export default AdminSidebar;