import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { jwtDecode } from 'jwt-decode'; // precisaremos instalar jwt-decode
import api from '../services/api';

interface User {
    id: string;
    role: string;
    nome: string;
    email: string;
    restaurante_id?: number | null;
    wizard_status?: Record<string, any>;
    impersonated_by?: number | null;
    impersonated_by_nome?: string | null;
    impersonated_by_email?: string | null;
}

interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    login: (token: string) => void;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [sessionWarning, setSessionWarning] = useState(false);
    const [showSessionWarning, setShowSessionWarning] = useState(false);
    const [sessionCountdown, setSessionCountdown] = useState(30);

    const login = (token: string) => {
        localStorage.setItem('accessToken', token);
        setSessionWarning(false);
        setShowSessionWarning(false);
        setSessionCountdown(30);
        try {
            const decodedUser: any = jwtDecode(token);
            console.log('[AUTH] Login Called:', decodedUser);
            console.log('[USER] ID (sub):', decodedUser.sub);
            console.log('[USER] Role:', decodedUser.role);
            console.log('[USER] Nome:', decodedUser.nome);
            // Monta o objeto user com todos os dados
            setUser({
                id: decodedUser.sub,
                role: decodedUser.role,
                nome: decodedUser.nome,
                email: decodedUser.email,
                restaurante_id: decodedUser.restaurante_id ?? null,
                wizard_status: decodedUser.wizard_status ?? {},
                impersonated_by: decodedUser.impersonated_by ?? null,
                impersonated_by_nome: decodedUser.impersonated_by_nome ?? null,
                impersonated_by_email: decodedUser.impersonated_by_email ?? null
            });
        } catch (error) {
            console.error("Erro ao decodificar token", error);
        }
    };

    const clearOfflineCaches = useCallback(async () => {
        localStorage.removeItem('kaizen_pending_changes');
        if (!('caches' in window)) {
            return;
        }
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames
                .filter((name) => name.startsWith('kaizen-'))
                .map((name) => caches.delete(name))
        );
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('sessionExpiry');
        setUser(null);
        setSessionWarning(false);
        setShowSessionWarning(false);
        setSessionCountdown(30);
        void clearOfflineCaches();
    }, [clearOfflineCaches]);

    // Verifica se o token existe e se a sessão ainda é válida
    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        const sessionExpiry = localStorage.getItem('sessionExpiry');

        if (token) {
            // Verificar se a sessão expirou (somente se sessionExpiry existir)
            if (sessionExpiry) {
                const expiryTime = parseInt(sessionExpiry, 10);
                if (Date.now() > expiryTime) {
                    console.log('[AUTH] Sessao expirada - fazendo logout automatico');
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('sessionExpiry');
                    setUser(null);
                    setLoading(false); // Finaliza loading
                    return;
                }
            }

            // Token válido, decodificar e restaurar usuário
            try {
                const decodedUser: any = jwtDecode(token);
                console.log('[AUTH] Sessao restaurada do localStorage');
                console.log('[DEBUG] Decoded user:', decodedUser);
                // Monta o objeto user com id, role, nome e email
                setUser({
                    id: decodedUser.sub,
                    role: decodedUser.role,
                    nome: decodedUser.nome,
                    email: decodedUser.email,
                    restaurante_id: decodedUser.restaurante_id ?? null,
                    wizard_status: decodedUser.wizard_status ?? {},
                    impersonated_by: decodedUser.impersonated_by ?? null,
                    impersonated_by_nome: decodedUser.impersonated_by_nome ?? null,
                    impersonated_by_email: decodedUser.impersonated_by_email ?? null
                });
            } catch (error) {
                console.error("[AUTH] Token invalido ao restaurar sessao", error);
                localStorage.removeItem('accessToken');
                localStorage.removeItem('sessionExpiry');
                setUser(null);
            }
        } else {
            console.log('[AUTH] Nenhum token encontrado - usuario nao autenticado');
        }

        setLoading(false); // Finaliza loading após verificação
    }, []);

    // Timer para verificar expiração da sessão a cada minuto
    useEffect(() => {
        const checkSessionExpiry = () => {
            const sessionExpiry = localStorage.getItem('sessionExpiry');
            if (sessionExpiry) {
                const expiryTime = parseInt(sessionExpiry, 10);
                if (Date.now() > expiryTime) {
                    console.log('[AUTH] Sessao expirada - fazendo logout automatico');
                    logout();
                }
            }
        };

        // Verificar a cada 1 minuto
        const intervalId = setInterval(checkSessionExpiry, 60000);

        return () => clearInterval(intervalId);
    }, [logout]);

    // Listener para sessão substituída por outro login
    useEffect(() => {
        const handleSessionSuperseded = () => {
            if (!user || sessionWarning) return;
            setSessionWarning(true);
            setShowSessionWarning(true);
            setSessionCountdown(30);
        };

        window.addEventListener('kaizen-session-superseded', handleSessionSuperseded);
        return () => window.removeEventListener('kaizen-session-superseded', handleSessionSuperseded);
    }, [user, sessionWarning]);

    // Countdown para logout após aviso
    useEffect(() => {
        if (!sessionWarning) return;

        const intervalId = setInterval(() => {
            setSessionCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(intervalId);
                    logout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(intervalId);
    }, [sessionWarning, logout]);

    // Verificação periódica da sessão ativa (single-session)
    useEffect(() => {
        if (!user || sessionWarning) return;

        const checkSession = async () => {
            try {
                await api.get('/auth/session');
            } catch (error) {
                // A resposta 401 é tratada no interceptor com evento global
            }
        };

        checkSession();
        const intervalId = setInterval(checkSession, 20000);

        return () => clearInterval(intervalId);
    }, [user, sessionWarning]);


    const handleDismissSessionWarning = () => {
        setShowSessionWarning(false);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, logout, loading }}>
            {children}
            <Modal
                show={showSessionWarning}
                onHide={handleDismissSessionWarning}
                backdrop="static"
                keyboard={false}
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>Sessão substituída</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Sua conta foi acessada em outro dispositivo. Você será desconectado em {sessionCountdown}s.
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="danger" onClick={logout}>
                        Sair agora
                    </Button>
                </Modal.Footer>
            </Modal>
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
