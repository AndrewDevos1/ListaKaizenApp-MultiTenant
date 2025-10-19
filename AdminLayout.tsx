"use client";

import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "./adminSidebar";

// Topbar simples inline
const AdminTopbar: React.FC<{ onMenuToggle: () => void }> = ({ onMenuToggle }) => {
  return (
    <header className="flex items-center justify-between border-b px-4 h-14">
      <div className="flex items-center gap-3">
        <button onClick={onMenuToggle} className="p-2 rounded-md border sm:hidden">☰</button>
        <div className="text-lg font-semibold">Kaizen Lista App</div>
        {/* Badge visual para identificar nova versão */}
        <span className="ml-3 inline-block rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-semibold">NOVA VERSÃO</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-sm">Admin</div>
      </div>
    </header>
  );
};

const AdminLayout: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const m = window.matchMedia("(max-width: 640px)");
    const listener = () => setIsMobile(m.matches);
    listener();
    m.addEventListener?.("change", listener);
    return () => m.removeEventListener?.("change", listener);
  }, []);

  const handleToggleCollapse = () => setIsSidebarCollapsed((s) => !s);
  const handleMobileMenuToggle = () => setIsMobileSidebarOpen((s) => !s);

  return (
    <div className="flex min-h-screen w-full">
      {isMobile ? (
        <div className={isMobileSidebarOpen ? "block" : "hidden"}>
          <div className="fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/40" onClick={() => setIsMobileSidebarOpen(false)} />
            <div className="relative w-64 bg-sidebar h-full">
              <AdminSidebar isCollapsed={false} onToggleCollapse={() => setIsMobileSidebarOpen(false)} />
            </div>
          </div>
        </div>
      ) : (
        <AdminSidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={handleToggleCollapse} />
      )}

      <div className="flex flex-col flex-1">
        <AdminTopbar onMenuToggle={handleMobileMenuToggle} />
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;