/**
 * Register Component - Moderno e Responsivo
 *
 * DOCUMENTAÇÃO DO DESIGN:
 * - Fundo: Gradiente animado roxo/azul (CoreUI style)
 * - Card: Branco flutuante com sombra profunda e glassmorphism
 * - Inputs: Bordas arredondadas com animação ao focus
 * - Botão: Gradiente com efeito hover elevado
 * - Ícones: FontAwesome com cores do tema
 * - Tela de Sucesso: Ícone animado, título, passos, botão voltar
 *
 * RESPONSIVIDADE:
 * - Desktop: Card centralizado (max-width 500px)
 * - Tablet: Card adaptado com margens
 * - Mobile: Card em tela cheia com padding
 *
 * ANIMAÇÕES:
 * - Entrada: Slide-in suave do card
 * - Gradiente de fundo: Movimento contínuo
 * - Logo: Pulse animation
 * - Botão: Hover elevado
 * - Erro: Shake animation
 * - Sucesso: Scale pulse
 */

import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import styles from './Register.module.css';

const Register: React.FC = () => {
    const [searchParams] = useSearchParams();
    const tokenConvite = searchParams.get('token');
    const isInviteFlow = !!tokenConvite;

    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [tokenAdmin, setTokenAdmin] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showTokenAdmin, setShowTokenAdmin] = useState(false);
    const [tokenValido, setTokenValido] = useState<boolean | null>(null);
    const [roleConvite, setRoleConvite] = useState('');

    // Validar token ao carregar o componente
    useEffect(() => {
        if (tokenConvite) {
            validarToken(tokenConvite);
        }
    }, [tokenConvite]);

    const validarToken = async (token: string) => {
        try {
            const response = await api.get(`/auth/validar-convite?token=${token}`);
            if (response.data.valido) {
                setTokenValido(true);
                setRoleConvite(response.data.role);
            } else {
                setTokenValido(false);
                setError(response.data.erro);
            }
        } catch (err: any) {
            setTokenValido(false);
            setError('Erro ao validar token de convite');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            let response;

            // Se tem token de convite e é válido, usa endpoint específico
            if (isInviteFlow && tokenValido !== true) {
                setError('Convite inválido ou não validado');
                return;
            }

            if (isInviteFlow) {
                response = await api.post('/auth/register-com-convite', {
                    nome,
                    email,
                    senha,
                    token_convite: tokenConvite,
                });
            } else {
                // Registro normal (sem convite)
                response = await api.post('/auth/register', {
                    nome,
                    email,
                    senha,
                    token_admin: tokenAdmin || undefined,
                });
            }

            setMessage(response.data.message);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao enviar solicitação');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.registerWrapper}>
            <Container>
                <Row className="justify-content-center">
                    <Col xs={12} sm={10} md={8} lg={5} xl={4}>
                        <Card className={styles.registerCard}>
                            <Card.Body className="p-4 p-md-5">
                                {!message ? (
                                    <>
                                        {/* HEADER */}
                                        <div className={styles.cardHeader}>
                                            <i className={`fas fa-stream ${styles.logoIcon}`}></i>
                                            <h1 className={styles.appTitle}>Kaizen Lists</h1>
                                            <p className={styles.appSubtitle}>
                                                {tokenConvite ? 'Cadastro por Convite' : 'Solicitar Cadastro'}
                                            </p>
                                        </div>

                                        {/* FORMULÁRIO */}
                                        <Form onSubmit={handleSubmit}>
                                            {/* Alert de Token */}
                                            {tokenConvite && (
                                                <Alert
                                                    variant={tokenValido === null ? 'secondary' : tokenValido ? 'success' : 'danger'}
                                                    className={styles.alert}
                                                >
                                                    {tokenValido === null ? (
                                                        <>
                                                            <i className="fas fa-spinner fa-spin me-2"></i>
                                                            Validando convite...
                                                        </>
                                                    ) : tokenValido ? (
                                                        <>
                                                            <i className="fas fa-check-circle me-2"></i>
                                                            Convite válido! Você será cadastrado como{' '}
                                                            <strong>{roleConvite}</strong>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="fas fa-exclamation-circle me-2"></i>
                                                            Token de convite inválido ou expirado
                                                        </>
                                                    )}
                                                </Alert>
                                            )}

                                            {/* Alert de Erro */}
                                            {error && (
                                                <Alert variant="danger" className={styles.alert}>
                                                    <i className="fas fa-exclamation-circle"></i>
                                                    {error}
                                                </Alert>
                                            )}

                                            {/* Campo Nome */}
                                            <Form.Group className={styles.formGroup} controlId="nome">
                                                <Form.Label className={styles.formLabel}>
                                                    <i className="fas fa-user"></i>
                                                    Nome Completo
                                                </Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    placeholder="João da Silva"
                                                    className={styles.formInput}
                                                    value={nome}
                                                    onChange={(e) => setNome(e.target.value)}
                                                    required
                                                />
                                            </Form.Group>

                                            {/* Campo Email */}
                                            <Form.Group className={styles.formGroup} controlId="email">
                                                <Form.Label className={styles.formLabel}>
                                                    <i className="fas fa-envelope"></i>
                                                    Email
                                                </Form.Label>
                                                <Form.Control
                                                    type="email"
                                                    placeholder="seu@email.com"
                                                    className={styles.formInput}
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    required
                                                />
                                            </Form.Group>

                                            {/* Campo Senha com Toggle */}
                                            <Form.Group className={styles.formGroup} controlId="senha">
                                                <Form.Label className={styles.formLabel}>
                                                    <i className="fas fa-lock"></i>
                                                    Senha
                                                </Form.Label>
                                                <div className={styles.passwordInputWrapper}>
                                                    <Form.Control
                                                        type={showPassword ? 'text' : 'password'}
                                                        placeholder="••••••••"
                                                        className={styles.formInput}
                                                        value={senha}
                                                        onChange={(e) => setSenha(e.target.value)}
                                                        required
                                                    />
                                                    <button
                                                        type="button"
                                                        className={styles.togglePasswordButton}
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        aria-label="Mostrar/ocultar senha"
                                                    >
                                                        <FontAwesomeIcon
                                                            icon={showPassword ? faEyeSlash : faEye}
                                                        />
                                                    </button>
                                                </div>
                                            </Form.Group>

                                            {/* Campo Token Admin com Toggle - Ocultado quando há convite */}
                                            {!tokenConvite && (
                                            <Form.Group className={styles.formGroup} controlId="tokenAdmin">
                                                <Form.Label className={styles.formLabel}>
                                                    <i className="fas fa-key"></i>
                                                    Token de Admin (opcional)
                                                </Form.Label>
                                                <div className={styles.passwordInputWrapper}>
                                                    <Form.Control
                                                        type={showTokenAdmin ? 'text' : 'password'}
                                                        placeholder="Deixe vazio se for colaborador"
                                                        className={styles.formInput}
                                                        value={tokenAdmin}
                                                        onChange={(e) => setTokenAdmin(e.target.value)}
                                                    />
                                                    <button
                                                        type="button"
                                                        className={styles.togglePasswordButton}
                                                        onClick={() => setShowTokenAdmin(!showTokenAdmin)}
                                                        aria-label="Mostrar/ocultar token"
                                                        disabled={!tokenAdmin}
                                                    >
                                                        <FontAwesomeIcon
                                                            icon={showTokenAdmin ? faEyeSlash : faEye}
                                                        />
                                                    </button>
                                                </div>

                                                {/* Info Box */}
                                                <div className={styles.infoBox}>
                                                    <i className="fas fa-info-circle"></i>
                                                    <p>
                                                        Se você possui um token de administrador, insira-o aqui para
                                                        ser aprovado automaticamente como admin.
                                                    </p>
                                                </div>
                                            </Form.Group>
                                            )}

                                            {/* Botão Submit */}
                                            <Button
                                                type="submit"
                                                className={`${styles.registerButton} w-100`}
                                                disabled={loading || (isInviteFlow && tokenValido !== true)}
                                            >
                                                {loading ? (
                                                    <>
                                                        <span className={styles.spinner}></span>
                                                        Enviando...
                                                    </>
                                                ) : (
                                                    isInviteFlow ? 'Concluir Cadastro' : 'Enviar Solicitação'
                                                )}
                                            </Button>

                                            {/* Divider */}
                                            <div className={styles.divider}></div>

                                            {/* Link para Login */}
                                            <div className={styles.loginRow}>
                                                <Link to="/login" className={styles.loginLink}>
                                                    Já tem uma conta? Fazer Login
                                                </Link>
                                            </div>
                                        </Form>
                                    </>
                                ) : (
                                    /* TELA DE SUCESSO */
                                    <div className={styles.successScreen}>
                                        <i className={`fas fa-check-circle ${styles.successIcon}`}></i>
                                        <h2 className={styles.successTitle}>
                                            {isInviteFlow ? 'Cadastro Concluído!' : 'Solicitação Enviada!'}
                                        </h2>
                                        <p className={styles.successMessage}>
                                            {message}
                                        </p>
                                        <div className={styles.successSteps}>
                                            <h4>Próximos Passos:</h4>
                                            {isInviteFlow ? (
                                                <ol>
                                                    <li>Faça login com suas credenciais</li>
                                                    <li>Complete seu perfil se necessário</li>
                                                    <li>Comece a usar o sistema</li>
                                                </ol>
                                            ) : (
                                                <ol>
                                                    <li>Aguarde a aprovação de um administrador</li>
                                                    <li>Você receberá um email de confirmação</li>
                                                    <li>Após aprovação, faça login com suas credenciais</li>
                                                </ol>
                                            )}
                                        </div>
                                        <Link to="/login" className={styles.backButton}>
                                            <i className="fas fa-arrow-left"></i>
                                            Voltar para Login
                                        </Link>
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default Register;
