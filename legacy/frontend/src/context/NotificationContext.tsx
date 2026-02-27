import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

export type NotificationType = 'info' | 'success' | 'warning' | 'danger';

export interface NotificationItem {
    id: string;
    title: string;
    message?: string;
    createdAt: string;
    type: NotificationType;
    read: boolean;
    link?: string;
    resourceId?: number; // ID da lista, pedido, etc.
}

interface ServerNotification {
    id: number;
    titulo: string;
    mensagem?: string;
    tipo: string;
    lida: boolean;
    criado_em: string;
    lista_rapida_id?: number | null;
    pedido_id?: number | null;
    lista_id?: number | null;
}

interface NotificationContextType {
    notifications: NotificationItem[];
    toasts: NotificationItem[];
    unreadCount: number;
    addNotification: (data: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>) => void;
    markAllRead: () => void;
    markRead: (id: string) => void;
    clearAll: () => void;
    dismissToast: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_PREFIX = 'kaizen:notifications';

const getStorageKey = (userId?: string | null, role?: string | null) => {
    if (!userId || !role) return null;
    return `${STORAGE_PREFIX}:${userId}:${role}`;
};

const mapServerNotificationToItem = (serverNotif: ServerNotification): NotificationItem => {
    // Map server notification types to UI types
    let type: NotificationType = 'info';
    if (serverNotif.tipo.includes('aprovado')) {
        type = 'success';
    } else if (serverNotif.tipo.includes('rejeitado')) {
        type = 'danger';
    } else if (serverNotif.tipo.includes('submissao')) {
        type = 'warning';
    }

    return {
        id: `server-${serverNotif.id}`,
        title: serverNotif.titulo,
        message: serverNotif.mensagem,
        createdAt: serverNotif.criado_em,
        type,
        read: serverNotif.lida,
        resourceId: serverNotif.lista_rapida_id || serverNotif.pedido_id || serverNotif.lista_id || undefined,
    };
};

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const storageKey = useMemo(() => getStorageKey(user?.id, user?.role), [user?.id, user?.role]);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [toasts, setToasts] = useState<NotificationItem[]>([]);

    const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);

    // Carregar notificações do servidor quando o usuário está autenticado
    useEffect(() => {
        if (!user) {
            setNotifications([]);
            setToasts([]);
            return;
        }

        const loadNotificationsFromServer = async () => {
            try {
                const response = await api.get('/auth/notificacoes');
                if (response.data && Array.isArray(response.data)) {
                    const mappedNotifications = response.data.map(mapServerNotificationToItem);
                    setNotifications(mappedNotifications);
                    console.log('[Notifications] Notificações carregadas do servidor:', mappedNotifications.length);
                }
            } catch (error) {
                console.warn('[Notifications] Erro ao carregar notificações do servidor:', error);
                // Fallback para localStorage se o servidor falhar
                if (storageKey) {
                    try {
                        const stored = localStorage.getItem(storageKey);
                        if (stored) {
                            const parsed = JSON.parse(stored) as NotificationItem[];
                            if (Array.isArray(parsed)) {
                                setNotifications(parsed);
                            }
                        }
                    } catch (localError) {
                        console.warn('[Notifications] Erro ao carregar notificações do localStorage:', localError);
                    }
                }
            }
        };

        loadNotificationsFromServer();
    }, [user, storageKey]);

    // Carregamento legado do localStorage para compatibilidade
    useEffect(() => {
        if (!storageKey || user) {
            // Se o usuário está autenticado, as notificações já foram carregadas do servidor
            // acima. Não sobrescrevemos com localStorage neste caso.
            return;
        }

        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const parsed = JSON.parse(stored) as NotificationItem[];
                if (Array.isArray(parsed)) {
                    setNotifications(parsed);
                } else {
                    setNotifications([]);
                }
            } else {
                setNotifications([]);
            }
        } catch (error) {
            console.warn('[Notifications] Erro ao carregar notificacoes:', error);
            setNotifications([]);
        }
    }, [storageKey, user]);

    const persistNotifications = (items: NotificationItem[]) => {
        if (!storageKey) return;
        try {
            localStorage.setItem(storageKey, JSON.stringify(items));
        } catch (error) {
            console.warn('[Notifications] Erro ao salvar notificacoes:', error);
        }
    };

    const addNotification = (data: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>) => {
        const newItem: NotificationItem = {
            ...data,
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            createdAt: new Date().toISOString(),
            read: false,
        };

        setNotifications((prev) => {
            const next = [newItem, ...prev];
            persistNotifications(next);
            return next;
        });
        setToasts((prev) => [newItem, ...prev]);
    };

    const markAllRead = async () => {
        // Atualizar no servidor primeiro
        try {
            const serverNotifications = notifications.filter((item) => item.id.startsWith('server-'));
            if (serverNotifications.length > 0) {
                await api.put('/auth/notificacoes/marcar-todas-lidas');
            }
        } catch (error) {
            console.warn('[Notifications] Erro ao marcar todas como lidas no servidor:', error);
        }

        // Atualizar localmente
        setNotifications((prev) => {
            const next = prev.map((item) => ({ ...item, read: true }));
            persistNotifications(next);
            return next;
        });
    };

    const markRead = async (id: string) => {
        // Se é notificação do servidor, atualizar lá também
        if (id.startsWith('server-')) {
            const notificationId = id.replace('server-', '');
            try {
                await api.put(`/auth/notificacoes/${notificationId}/marcar-lida`);
            } catch (error) {
                console.warn(`[Notifications] Erro ao marcar notificação ${id} como lida no servidor:`, error);
            }
        }

        // Atualizar localmente
        setNotifications((prev) => {
            const next = prev.map((item) => (item.id === id ? { ...item, read: true } : item));
            persistNotifications(next);
            return next;
        });
    };

    const clearAll = () => {
        setNotifications([]);
        setToasts([]);
        persistNotifications([]);
    };

    const dismissToast = (id: string) => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
    };

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                toasts,
                unreadCount,
                addNotification,
                markAllRead,
                markRead,
                clearAll,
                dismissToast,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
