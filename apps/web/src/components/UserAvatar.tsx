import styles from './UserAvatar.module.css';

interface UserAvatarProps {
  user: { nome: string; role?: string };
  size?: 'small' | 'medium' | 'large';
}

export default function UserAvatar({ user, size = 'medium' }: UserAvatarProps) {
  const initials = user.nome
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const role = user.role?.toLowerCase() || 'collaborator';
  const roleClass = role.includes('admin') ? styles.admin : styles.collaborator;

  return (
    <div className={`${styles.avatar} ${styles[size]} ${roleClass}`}>
      {initials}
    </div>
  );
}
