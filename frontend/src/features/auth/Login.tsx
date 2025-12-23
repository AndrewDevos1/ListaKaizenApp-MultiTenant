/**
 * Login Component - CoreUI Inspired Design
 *
 * DOCUMENTAÇÃO DO DESIGN:
 * - Fundo: Gradiente animado roxo/azul (CoreUI style)
 * - Card: Branco flutuante com sombra profunda
 * - Inputs: Bordas arredondadas com animação ao focus
 * - Botão: Gradiente com efeito hover elevado
 * - Ícones: FontAwesome com cores do tema
 *
 * RESPONSIVIDADE:
 * - Desktop: Card centralizado (max-width 400px)
 * - Mobile: Card com margem reduzida
 *
 * ANIMAÇÕES:
 * - Entrada: Slide-in suave do card
 * - Gradiente de fundo: Movimento contínuo
 * - Hover: Elevação do card e botões
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { startBackendHeartbeat, openBackendInNewTab } from '../../services/backendHeartbeat';
import styles from './Login.module.css';

interface TestUser {
    id: number;
    nome: string;
    email: string;
    role: string;
    senha_padrao: string;
}

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [testUsers, setTestUsers] = useState<TestUser[]>([]);
    const [loadingTestUsers, setLoadingTestUsers] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    // Carregar email salvo ao montar o componente
    useEffect(() => {
        const savedEmail = localStorage.getItem('rememberedEmail');
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }

        // Abrir backend em nova aba para "acordar" o dyno no Render
        openBackendInNewTab();

        // Iniciar heartbeat para manter backend ativo
        startBackendHeartbeat();

        // Carregar usuários de teste
        fetchTestUsers();
    }, []);

    const fetchTestUsers = async () => {
        try {
            setLoadingTestUsers(true);
            const response = await api.get('/auth/test-users');
            setTestUsers(response.data.usuarios || []);
        } catch (err) {
            console.error('Erro ao carregar usuários de teste:', err);
        } finally {
            setLoadingTestUsers(false);
        }
    };

    const handleQuickLogin = (user: TestUser) => {
        setEmail(user.email);
        setSenha(user.senha_padrao);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/auth/login', { email, senha });

            // Salvar/remover email do localStorage baseado em "Lembrar-me"
            if (rememberMe) {
                localStorage.setItem('rememberedEmail', email);
            } else {
                localStorage.removeItem('rememberedEmail');
            }

            // Atualiza o AuthContext com o token
            login(response.data.access_token);

            // Configurar timeout de sessão (verificar configuração ou usar padrão de 30 minutos)
            const configTimeout = localStorage.getItem('configSessionTimeout');
            const timeoutMinutes = configTimeout ? parseInt(configTimeout, 10) : 30;
            const sessionTimeout = timeoutMinutes * 60 * 1000; // converter minutos para ms
            const expiryTime = Date.now() + sessionTimeout;
            localStorage.setItem('sessionExpiry', expiryTime.toString());

            console.log('[LOGIN] Timeout de sessao configurado:', {
                minutos: timeoutMinutes,
                milliseconds: sessionTimeout,
                expiraEm: new Date(expiryTime).toLocaleString(),
            });

            // Decode token to get user role and redirect accordingly
            const tokenPayload = JSON.parse(atob(response.data.access_token.split('.')[1]));
            const userId = tokenPayload.sub; // ID do usuário (agora é número, não objeto)
            const role = tokenPayload.role; // Role agora está diretamente no payload

            // DIAGNOSTICO: Ver estrutura do token
            console.log('[LOGIN] Token payload completo:', tokenPayload);
            console.log('[LOGIN] User ID:', userId);
            console.log('[LOGIN] Role:', role);

            if (role === 'ADMIN') {
                console.log('[LOGIN] Redirecionando ADMIN para /admin');
                navigate('/admin');
            } else if (role === 'COLLABORATOR') {
                console.log('[LOGIN] Redirecionando COLLABORATOR para /collaborator');
                navigate('/collaborator');
            } else {
                console.log('[LOGIN] Role desconhecido - redirecionando para /login');
                navigate('/login');
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao fazer login. Verifique suas credenciais.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.loginWrapper}>
            <Container>
                <Row className="justify-content-center">
                    <Col xs={12} sm={10} md={8} lg={5} xl={4}>
                        <Card className={styles.loginCard}>
                            <Card.Body className="p-4 p-md-5">
                                {/* Header com logo e título */}
                                <div className={styles.cardHeader}>
                                    <i className={`fas fa-stream ${styles.logoIcon}`}></i>
                                    <h1 className={styles.appTitle}>Kaizen Lists</h1>
                                    <p className={styles.appSubtitle}>
                                        Otimizando seu fluxo, um item de cada vez
                                    </p>
                                </div>

                                {/* Formulário de login */}
                                <Form onSubmit={handleSubmit}>
                                    {/* Alert de erro */}
                                    {error && (
                                        <Alert variant="danger" className={styles.alert}>
                                            <i className="fas fa-exclamation-circle me-2"></i>
                                            {error}
                                        </Alert>
                                    )}

                                    {/* Campo Email */}
                                    <Form.Group className={styles.formGroup} controlId="email">
                                        <Form.Label className={styles.formLabel}>
                                            <i className="fas fa-envelope"></i>
                                            Email
                                        </Form.Label>
                                        <Form.Control
                                            type="email"
                                            placeholder="seu@email.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className={styles.formInput}
                                            required
                                            disabled={loading}
                                        />
                                    </Form.Group>

                                    {/* Campo Senha */}
                                    <Form.Group className={styles.formGroup} controlId="password">
                                        <Form.Label className={styles.formLabel}>
                                            <i className="fas fa-lock"></i>
                                            Senha
                                        </Form.Label>
                                        <div className={styles.passwordInputWrapper}>
                                            <Form.Control
                                                type={showPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                value={senha}
                                                onChange={(e) => setSenha(e.target.value)}
                                                className={styles.formInput}
                                                required
                                                disabled={loading}
                                            />
                                            <button
                                                type="button"
                                                className={styles.togglePasswordButton}
                                                onClick={() => setShowPassword(!showPassword)}
                                                disabled={loading}
                                            >
                                                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                                            </button>
                                        </div>
                                    </Form.Group>

                                    {/* Lembrar-me e Esqueci senha */}
                                    <div className={styles.rememberRow}>
                                        <Form.Check
                                            type="checkbox"
                                            id="rememberMe"
                                            label="Lembrar-me"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            disabled={loading}
                                        />
                                        <a href="#!" className={styles.forgotLink}>
                                            Esqueceu a senha?
                                        </a>
                                    </div>

                                    {/* Botão de Login */}
                                    <div className="d-grid">
                                        <Button
                                            type="submit"
                                            className={styles.loginButton}
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <>
                                                    <span className={styles.spinner}></span>
                                                    Entrando...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fas fa-sign-in-alt me-2"></i>
                                                    Entrar
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </Form>

                                {/* Divider */}
                                <hr className={styles.divider} />

                                {/* Atalhos de usuários de teste (Dev/Test) */}
                                {testUsers.length > 0 && (
                                    <div className={styles.testUsersSection}>
                                        <p className={styles.testUsersLabel}>
                                            <i className="fas fa-flask me-2"></i>
                                            Atalhos para Testes
                                        </p>
                                        <div className={styles.testUsersGrid}>
                                            {testUsers.map((user) => (
                                                <button
                                                    key={user.id}
                                                    type="button"
                                                    className={styles.testUserButton}
                                                    onClick={() => handleQuickLogin(user)}
                                                    disabled={loading}
                                                    title={`${user.nome} (${user.role})`}
                                                >
                                                    <i className={`fas fa-${user.role === 'ADMIN' ? 'crown' : 'user'}`}></i>
                                                    <div className={styles.testUserInfo}>
                                                        <span className={styles.testUserName}>{user.nome}</span>
                                                        <span className={styles.testUserRole}>{user.role}</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Link para registro */}
                                <div className={styles.registerRow}>
                                    <Link to="/register" className={styles.registerLink}>
                                        <i className="fas fa-user-plus me-2"></i>
                                        Não tem uma conta? Solicitar Cadastro
                                    </Link>
                                </div>
                            </Card.Body>
                        </Card>

                        {/* Footer com informações */}
                        <div className="text-center mt-4" style={{ color: 'rgba(255,255,255,0.9)' }}>
                            <small>
                                <i className="fas fa-shield-alt me-2"></i>
                                Seus dados estão protegidos
                            </small>
                        </div>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default Login;
