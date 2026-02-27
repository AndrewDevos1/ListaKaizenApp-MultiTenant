/**
 * Componente de Debug para Autenticação
 * Mostra informações sobre o token JWT e estado de autenticação
 */

import React, { useState, useEffect } from 'react';
import { Alert, Button, Card } from 'react-bootstrap';
import { formatarDataHoraBrasilia } from '../utils/dateFormatter';

const AuthDebug: React.FC = () => {
    const [tokenInfo, setTokenInfo] = useState<any>(null);

    const checkAuth = () => {
        const token = localStorage.getItem('accessToken');

        if (!token) {
            setTokenInfo({
                exists: false,
                message: '[DEBUG] Nenhum token encontrado no localStorage'
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
                    message: '[DEBUG] Token com formato invalido'
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
                expiresAt: formatarDataHoraBrasilia(new Date(payload.exp * 1000).toISOString()),
                expired: expired,
                user: { id: payload.sub, role: payload.role }, // Novo formato
                message: expired ? '[DEBUG] Token EXPIRADO!' : '[DEBUG] Token valido'
            });
        } catch (error) {
            setTokenInfo({
                exists: true,
                valid: false,
                message: '[DEBUG] Erro ao decodificar token',
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
                <strong>[DEBUG] Autenticacao</strong>
            </Card.Header>
            <Card.Body>
                <Button size="sm" onClick={checkAuth} className="mb-3 me-2">
                    [REFRESH] Atualizar
                </Button>
                <Button size="sm" variant="danger" onClick={clearToken} className="mb-3">
                    [DELETE] Limpar Token
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
                                        <p><strong>Status:</strong> {tokenInfo.expired ? '[RED] Expirado' : '[GREEN] Valido'}</p>
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
                                    <strong>[NOTE] Instrucoes:</strong><br />
                                    1. Faca login em <code>/login</code><br />
                                    2. O token sera salvo automaticamente<br />
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
