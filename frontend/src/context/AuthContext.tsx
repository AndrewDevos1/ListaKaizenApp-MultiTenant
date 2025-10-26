import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode'; // precisaremos instalar jwt-decode

interface AuthContextType {
    isAuthenticated: boolean;
    user: any; // Você pode definir uma interface mais específica para o usuário
    login: (token: string) => void;
    logout: () => void;
    loading: boolean; // Novo: indica se ainda está verificando o token
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true); // Começa como true

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
                // Monta o objeto user com id e role
                setUser({
                    id: decodedUser.sub,      // ID do usuário
                    role: decodedUser.role    // Role está no payload agora
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
    }, []);

    const login = (token: string) => {
        localStorage.setItem('accessToken', token);
        try {
            const decodedUser: any = jwtDecode(token);
            console.log('[AUTH] Login Called:', decodedUser);
            console.log('[USER] ID (sub):', decodedUser.sub);
            console.log('[USER] Role:', decodedUser.role);
            // Monta o objeto user com id e role
            setUser({
                id: decodedUser.sub,      // ID do usuário
                role: decodedUser.role    // Role está no payload agora
            });
        } catch (error) {
            console.error("Erro ao decodificar token", error);
        }
    };

    const logout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('sessionExpiry');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, logout, loading }}>
            {children}
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
