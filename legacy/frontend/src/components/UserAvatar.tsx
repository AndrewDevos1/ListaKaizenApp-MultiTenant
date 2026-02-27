import React from 'react';
import styles from './UserAvatar.module.css';
import defaultAvatarLogo from '../assets/kaizen-logo-black.png';

interface UserAvatarProps {
    nome: string;
    role: string;
    size?: 'small' | 'medium' | 'large';
}

const UserAvatar: React.FC<UserAvatarProps> = ({ nome, role, size = 'medium' }) => {
    const getInitials = (name: string) => {
        const names = name.trim().split(' ');
        if (names.length >= 2) {
            return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const getRoleLabel = (role: string) => {
        if (role === 'SUPER_ADMIN') return 'Super Admin';
        if (role === 'ADMIN') return 'Administrador';
        if (role === 'SUPPLIER') return 'Fornecedor';
        return 'Colaborador';
    };

    const getRoleColor = (role: string) => {
        if (role === 'SUPER_ADMIN') return styles.superAdmin;
        if (role === 'ADMIN') return styles.admin;
        if (role === 'SUPPLIER') return styles.supplier;
        return styles.collaborator;
    };

    const [logoError, setLogoError] = React.useState(false);
    const showLogo = !logoError;

    return (
        <div className={`${styles.container} ${styles[size]}`}>
            <div className={`${styles.avatar} ${getRoleColor(role)} ${showLogo ? styles.avatarLogo : ''}`}>
                {showLogo ? (
                    <img
                        src={defaultAvatarLogo}
                        alt=""
                        className={styles.avatarImage}
                        onError={() => setLogoError(true)}
                    />
                ) : (
                    getInitials(nome)
                )}
            </div>
            <div className={styles.info}>
                <div className={styles.name}>{nome}</div>
                <div className={styles.role}>{getRoleLabel(role)}</div>
            </div>
        </div>
    );
};

export default UserAvatar;
