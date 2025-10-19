"use client";

import React from "react";
import { Link } from "react-router-dom";
import { LucideIcon } from "lucide-react";

interface DashboardCardProps {
  icon: LucideIcon;
  title: string;
  mainMetric: string;
  description: string;
  quickActions?: { label: string; onClick: () => void; variant?: "default" | "secondary" | "ghost" }[];
  footerLinkText: string;
  footerLinkPath: string;
  children?: React.ReactNode;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  icon: Icon,
  title,
  mainMetric,
  description,
  quickActions,
  footerLinkText,
  footerLinkPath,
  children,
}) => {
  return (
    // Card simples substituindo a implementação customizada de UI
    <div className="flex flex-col h-full rounded-md border bg-card p-4">
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <div className="text-lg font-medium">{title}</div>
        </div>
        <span className="text-2xl font-bold">{mainMetric}</span>
      </div>

      <div className="flex-1">
        <p className="mb-4 text-sm text-muted-foreground">{description}</p>
        {children}
        {quickActions && quickActions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className="rounded-md border px-3 py-1 text-sm hover:bg-muted/20"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <Link to={footerLinkPath} className="text-sm font-medium text-primary hover:underline flex items-center gap-2">
          <span>{footerLinkText}</span>
          <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
};

export default DashboardCard;