'use client';

import Link from 'next/link';
import { FaUsers, FaUserClock, FaEnvelope } from 'react-icons/fa';
import styles from './GerenciarUsuarios.module.css';

const CARDS = [
  {
    titulo: 'Usuários Cadastrados',
    descricao: 'Visualize, aprove e gerencie todos os usuários do sistema',
    icone: <FaUsers />,
    corClass: 'cardBlue',
    href: '/admin/usuarios',
  },
  {
    titulo: 'Pendentes de Aprovação',
    descricao: 'Usuários que se registraram e aguardam aprovação',
    icone: <FaUserClock />,
    corClass: 'cardYellow',
    href: '/admin/usuarios?aprovado=false',
  },
  {
    titulo: 'Convidar Usuário',
    descricao: 'Gere um link de convite para novos colaboradores ou admins',
    icone: <FaEnvelope />,
    corClass: 'cardGreen',
    href: '/admin/convites',
  },
];

export default function GerenciarUsuariosPage() {
  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageHeader}>
        <Link href="/admin/dashboard" className={styles.backLink}>
          ← Voltar ao Dashboard
        </Link>
        <h1 className={styles.pageTitle}>
          <FaUsers className={styles.titleIcon} />
          Gerenciar Usuários
        </h1>
        <p className={styles.pageSubtitle}>
          Escolha uma opção para gerenciar os usuários do sistema
        </p>
      </div>

      <div className={styles.grid}>
        {CARDS.map((card) => (
          <Link key={card.href} href={card.href} className={`${styles.card} ${styles[card.corClass]}`}>
            <div className={styles.cardIcon}>{card.icone}</div>
            <div className={styles.cardBody}>
              <h3 className={styles.cardTitulo}>{card.titulo}</h3>
              <p className={styles.cardDescricao}>{card.descricao}</p>
            </div>
            <span className={styles.cardArrow}>→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
