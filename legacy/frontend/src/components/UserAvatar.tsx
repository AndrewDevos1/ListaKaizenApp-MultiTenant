import React from 'react';
import styles from './UserAvatar.module.css';

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
        return role === 'ADMIN' ? 'Administrador' : 'Colaborador';
    };

    const getRoleColor = (role: string) => {
        return role === 'ADMIN' ? styles.admin : styles.collaborator;
    };

    return (
        <div className={`${styles.container} ${styles[size]}`}>
            <div className={`${styles.avatar} ${getRoleColor(role)}`}>
                {getInitials(nome)}
            </div>
            <div className={styles.info}>
                <div className={styles.name}>{nome}</div>
                <div className={styles.role}>{getRoleLabel(role)}</div>
            </div>
        </div>
    );
};

export default UserAvatar;
