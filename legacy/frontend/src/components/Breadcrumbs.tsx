import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './Breadcrumbs.module.css';

const Breadcrumbs: React.FC = () => {
    const location = useLocation();

    const pathMap: { [key: string]: string } = {
        'admin': 'Dashboard Admin',
        'collaborator': 'Dashboard',
        'supplier': 'Fornecedor',
        'listas-compras': 'Listas de Compras',
        'catalogo-global': 'Catálogo Global',
        'itens-regionais': 'Itens Regionais',
        'submissoes': 'Submissões',
        'sugestoes': 'Sugestões',
        'pop-templates': 'POP Atividades',
        'pop-listas': 'POP Listas',
        'pop-auditoria': 'POP Auditoria',
        'pop-historico': 'Historico POP',
        'areas': 'Áreas',
        'fornecedores': 'Fornecedores',
        'cotacoes': 'Cotações',
        'users': 'Usuários',
        'estoque': 'Estoque',
        'gerenciar-itens': 'Gerenciar Itens',
        'gerenciar-usuarios': 'Gerenciar Usuários',
        'gerenciar-pedidos': 'Gerenciar Pedidos',
        'restaurantes': 'Restaurantes',
        'editar-perfil': 'Editar Perfil',
        'mudar-senha': 'Mudar Senha',
        'listas': 'Minhas Listas',
        'perfil': 'Perfil'
    };

    const pathnames = location.pathname.split('/').filter(x => x);

    if (pathnames.length === 0 || pathnames[0] === '') {
        return null;
    }

    // Remove IDs numéricos
    const breadcrumbItems = pathnames
        .filter(segment => isNaN(Number(segment)))
        .map((segment, index) => {
            const path = `/${pathnames.slice(0, pathnames.indexOf(segment) + 1).join('/')}`;
            const label = pathMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
            
            return { path, label, isLast: index === pathnames.length - 1 };
        });

    return (
        <nav className={styles.breadcrumbs} aria-label="breadcrumb">
            <ol className={styles.list}>
                <li className={styles.item}>
                    <Link to="/" className={styles.link}>
                        <i className="fas fa-home"></i>
                    </Link>
                </li>
                {breadcrumbItems.map((item, index) => (
                    <li key={index} className={styles.item}>
                        <span className={styles.separator}>/</span>
                        {item.isLast ? (
                            <span className={styles.current}>{item.label}</span>
                        ) : (
                            <Link to={item.path} className={styles.link}>
                                {item.label}
                            </Link>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
};

export default Breadcrumbs;
