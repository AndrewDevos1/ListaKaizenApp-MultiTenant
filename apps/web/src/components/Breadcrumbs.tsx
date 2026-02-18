'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Breadcrumbs.module.css';

interface Crumb {
  label: string;
  href?: string;
}

function buildCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return [];

  const crumbs: Crumb[] = [];

  if (segments[0] === 'admin') {
    crumbs.push({ label: 'Admin', href: '/admin/dashboard' });
    const [, section, detail] = segments;

    if (section === 'dashboard') {
      crumbs.push({ label: 'Dashboard' });
    } else if (section === 'items') {
      crumbs.push({ label: 'Itens' });
    } else if (section === 'areas') {
      crumbs.push({ label: 'Áreas' });
    } else if (section === 'listas') {
      crumbs.push({ label: 'Listas', href: '/admin/listas' });
      if (detail) {
        crumbs.push({ label: 'Detalhe' });
      }
    }
  } else if (segments[0] === 'collaborator') {
    crumbs.push({ label: 'Colaborador', href: '/collaborator/dashboard' });
    const [, section, detail] = segments;

    if (section === 'dashboard') {
      crumbs.push({ label: 'Dashboard' });
    } else if (section === 'listas') {
      crumbs.push({ label: 'Minhas Listas', href: '/collaborator/listas' });
      if (detail) {
        crumbs.push({ label: 'Detalhe' });
      }
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
          const isLink = crumb.href && !isLast;

          return (
            <li key={`${crumb.label}-${index}`} className={styles.item}>
              {isLink ? (
                <Link href={crumb.href} className={styles.link}>
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
