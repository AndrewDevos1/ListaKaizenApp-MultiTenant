'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Breadcrumbs.module.css';

interface Crumb {
  label: string;
  href?: string;
}

const ADMIN_SECTION_LABELS: Record<string, string> = {
  areas: 'Áreas',
  listas: 'Listas de Compras',
  submissoes: 'Submissões',
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
  listas: 'Minhas Listas',
  submissoes: 'Minhas Submissões',
  perfil: 'Editar Perfil',
  'mudar-senha': 'Mudar Senha',
  configuracoes: 'Configurações',
};

function buildCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return [];

  const crumbs: Crumb[] = [];

  if (segments[0] === 'admin') {
    crumbs.push({ label: 'Admin', href: '/admin/listas' });
    const section = segments[1];
    const sub = segments[2];
    const detail = segments[3];

    if (!section) return crumbs;

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
    crumbs.push({ label: 'Colaborador', href: '/collaborator/listas' });
    const section = segments[1];
    const sub = segments[2];
    const detail = segments[3];

    if (!section) return crumbs;

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
