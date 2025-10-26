/**
 * Componente de Debug para Autenticação
 * Mostra informações sobre o token JWT e estado de autenticação
 */

import React, { useState, useEffect } from 'react';
import { Alert, Button, Card } from 'react-bootstrap';

const AuthDebug: React.FC = () => {
    const [tokenInfo, setTokenInfo] = useState<any>(null);

    const checkAuth = () => {
        const token = localStorage.getItem('accessToken');

        if (!token) {
            setTokenInfo({
                exists: false,
                message: '❌ Nenhum token encontrado no localStorage'
            });
            return;
        }

        try {
            // Decodifica o token JWT (parte do payload)
            const parts = token.split('.');
            if (parts.length !== 3) {
                setTokenInfo({
                    exists: true,
                    valid: false,
                    message: '⚠️ Token com formato inválido'
                });
                return;
            }

            const payload = JSON.parse(atob(parts[1]));
            const now = Math.floor(Date.now() / 1000);
            const expired = payload.exp < now;

            setTokenInfo({
                exists: true,
                valid: !expired,
                token: token.substring(0, 50) + '...',
                payload: payload,
                expiresAt: new Date(payload.exp * 1000).toLocaleString(),
                expired: expired,
                user: { id: payload.sub, role: payload.role }, // Novo formato
                message: expired ? '⚠️ Token EXPIRADO!' : '✅ Token válido'
            });
        } catch (error) {
            setTokenInfo({
                exists: true,
                valid: false,
                message: '❌ Erro ao decodificar token',
                error: String(error)
            });
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const clearToken = () => {
        localStorage.removeItem('accessToken');
        checkAuth();
    };

    return (
        <Card className="mb-3" style={{ backgroundColor: '#f8f9fa' }}>
            <Card.Header>
                <strong>🔍 Debug de Autenticação</strong>
            </Card.Header>
            <Card.Body>
                <Button size="sm" onClick={checkAuth} className="mb-3 me-2">
                    🔄 Atualizar
                </Button>
                <Button size="sm" variant="danger" onClick={clearToken} className="mb-3">
                    🗑️ Limpar Token
                </Button>

                {tokenInfo && (
                    <div>
                        <Alert variant={tokenInfo.valid ? 'success' : 'warning'}>
                            <strong>{tokenInfo.message}</strong>
                        </Alert>

                        {tokenInfo.exists && (
                            <div style={{ fontSize: '0.9rem' }}>
                                <p><strong>Token (parcial):</strong><br />
                                    <code style={{ fontSize: '0.8rem' }}>{tokenInfo.token}</code>
                                </p>

                                {tokenInfo.payload && (
                                    <>
                                        <p><strong>Usuário:</strong><br />
                                            <code>{JSON.stringify(tokenInfo.user, null, 2)}</code>
                                        </p>
                                        <p><strong>Expira em:</strong> {tokenInfo.expiresAt}</p>
                                        <p><strong>Status:</strong> {tokenInfo.expired ? '🔴 Expirado' : '🟢 Válido'}</p>
                                    </>
                                )}

                                {tokenInfo.error && (
                                    <p><strong>Erro:</strong> {tokenInfo.error}</p>
                                )}
                            </div>
                        )}

                        {!tokenInfo.exists && (
                            <Alert variant="info">
                                <p className="mb-0">
                                    <strong>📝 Instruções:</strong><br />
                                    1. Faça login em <code>/login</code><br />
                                    2. O token será salvo automaticamente<br />
                                    3. Volte aqui para verificar
                                </p>
                            </Alert>
                        )}
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};

export default AuthDebug;
