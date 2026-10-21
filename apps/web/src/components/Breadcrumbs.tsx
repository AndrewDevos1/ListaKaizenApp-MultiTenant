'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Breadcrumbs.module.css';

interface Crumb {
  label: string;
  href?: string;
}

const ADMIN_SECTION_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  global: 'Dashboard Global',
  items: 'Itens',
  areas: 'Áreas',
  listas: 'Listas de Compras',
  'listas-rapidas': 'Listas Rápidas',
  'lista-rapida': 'Lista Rápida',
  submissoes: 'Submissões',
  sugestoes: 'Sugestões de Itens',
  checklists: 'Checklists de Compras',
  pop: 'POP',
  templates: 'POP Atividades',
  execucoes: 'Execuções',
  auditoria: 'POP Auditoria',
  fornecedores: 'Fornecedores',
  cotacoes: 'Cotações',
  'gerar-cotacao': 'Gerar Cotação',
  'catalogo-global': 'Catálogo Global',
  'itens-regionais': 'Itens Regionais',
  usuarios: 'Gerenciar Usuários',
  restaurantes: 'Restaurantes',
  convites: 'Convites',
  logs: 'Logs',
  estatisticas: 'Estatísticas',
  'editar-perfil': 'Editar Perfil',
  'mudar-senha': 'Mudar Senha',
  'gerenciar-usuarios': 'Gerenciar Usuários',
  'gerenciar-pedidos': 'Gerenciar Pedidos',
};

const COLLABORATOR_SECTION_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  listas: 'Minhas Listas',
  'listas-rapidas': 'Listas Rápidas',
  'lista-rapida': 'Lista Rápida',
  submissoes: 'Minhas Submissões',
  sugestoes: 'Sugestões de Itens',
  pop: 'POPs',
  execucoes: 'Execuções',
  catalogo: 'Catálogo Global',
  perfil: 'Editar Perfil',
  'mudar-senha': 'Mudar Senha',
  configuracoes: 'Configurações',
};

function buildCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return [];

  const crumbs: Crumb[] = [];

  if (segments[0] === 'admin') {
    crumbs.push({ label: 'Admin', href: '/admin/dashboard' });
    const section = segments[1];
    const sub = segments[2];
    const detail = segments[3];

    if (!section) return crumbs;

    // POP has nested structure: /admin/pop/templates, /admin/pop/execucoes
    if (section === 'pop') {
      crumbs.push({ label: 'POP' });
      if (sub) {
        const subLabel = sub === 'templates' ? 'POP Atividades' : sub === 'execucoes' ? 'Execuções' : sub;
        const subHref = `/admin/pop/${sub}`;
        if (detail) {
          crumbs.push({ label: subLabel, href: subHref });
          crumbs.push({ label: 'Detalhe' });
        } else {
          crumbs.push({ label: subLabel });
        }
      }
      return crumbs;
    }

    const sectionLabel = ADMIN_SECTION_LABELS[section] || section;
    const sectionHref = `/admin/${section}`;
    const isNumericDetail = sub && !isNaN(Number(sub));
    const hasDetail = sub && (isNumericDetail || detail);

    if (hasDetail || (sub && sub !== section)) {
      crumbs.push({ label: sectionLabel, href: sectionHref });
      if (sub && !isNumericDetail) {
        crumbs.push({ label: sub });
      } else {
        crumbs.push({ label: 'Detalhe' });
      }
    } else {
      crumbs.push({ label: sectionLabel });
    }

  } else if (segments[0] === 'collaborator') {
    crumbs.push({ label: 'Colaborador', href: '/collaborator/dashboard' });
    const section = segments[1];
    const sub = segments[2];
    const detail = segments[3];

    if (!section) return crumbs;

    // POP nested: /collaborator/pop, /collaborator/pop/execucoes, /collaborator/pop/execucoes/:id
    if (section === 'pop') {
      if (!sub) {
        crumbs.push({ label: 'POPs Diários' });
      } else if (sub === 'execucoes') {
        crumbs.push({ label: 'POPs', href: '/collaborator/pop' });
        if (detail) {
          crumbs.push({ label: 'Execuções', href: '/collaborator/pop/execucoes' });
          crumbs.push({ label: 'Detalhe' });
        } else {
          crumbs.push({ label: 'Execuções' });
        }
      }
      return crumbs;
    }

    const sectionLabel = COLLABORATOR_SECTION_LABELS[section] || section;
    const sectionHref = `/collaborator/${section}`;
    const isNumericSub = sub && !isNaN(Number(sub));

    if (sub) {
      crumbs.push({ label: sectionLabel, href: sectionHref });
      if (!isNumericSub) {
        crumbs.push({ label: sub });
      } else {
        crumbs.push({ label: 'Detalhe' });
      }
    } else {
      crumbs.push({ label: sectionLabel });
    }
  }

  return crumbs;
}

export default function Breadcrumbs() {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);

  if (!crumbs.length) return null;

  return (
    <nav className={styles.breadcrumbs} aria-label="Caminho de navegação">
      <ol className={styles.list}>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          const isLink = Boolean(crumb.href) && !isLast;

          return (
            <li key={`${crumb.label}-${index}`} className={styles.item}>
              {isLink ? (
                <Link href={crumb.href!} className={styles.link}>
                  {crumb.label}
                </Link>
              ) : (
                <span className={isLast ? styles.current : styles.text}>{crumb.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
