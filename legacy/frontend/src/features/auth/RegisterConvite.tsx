/**
 * RegisterConvite - Cadastro exclusivo para convidados
 */

import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import styles from './Register.module.css';

const RegisterConvite: React.FC = () => {
    const [searchParams] = useSearchParams();
    const tokenConvite = searchParams.get('token');

    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [tokenValido, setTokenValido] = useState<boolean | null>(null);
    const [roleConvite, setRoleConvite] = useState('');

    useEffect(() => {
        if (!tokenConvite) {
            setTokenValido(false);
            setError('Token de convite não encontrado.');
            return;
        }
        validarToken(tokenConvite);
    }, [tokenConvite]);

    const validarToken = async (token: string) => {
        try {
            const response = await api.get(`/auth/validar-convite?token=${token}`);
            if (response.data.valido) {
                setTokenValido(true);
                setRoleConvite(response.data.role);
            } else {
                setTokenValido(false);
                setError(response.data.erro || 'Token de convite inválido ou expirado');
            }
        } catch (err) {
            setTokenValido(false);
            setError('Erro ao validar token de convite');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (!tokenConvite || tokenValido !== true) {
            setError('Convite inválido ou expirado');
            return;
        }

        setLoading(true);

        try {
            const response = await api.post('/auth/register-com-convite', {
                nome,
                email,
                senha,
                token_convite: tokenConvite,
            });
            setMessage(response.data.message);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao concluir cadastro');
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
                                                Cadastro por Convite
                                            </p>
                                        </div>

                                        {tokenValido === false ? (
                                            <>
                                                <Alert variant="danger" className={styles.alert}>
                                                    <i className="fas fa-exclamation-circle me-2"></i>
                                                    {error || 'Token de convite inválido ou expirado'}
                                                </Alert>
                                                <Link to="/login" className={styles.backButton}>
                                                    <i className="fas fa-arrow-left"></i>
                                                    Voltar para Login
                                                </Link>
                                            </>
                                        ) : (
                                            <Form onSubmit={handleSubmit}>
                                                {/* Alert de Token */}
                                                <Alert
                                                    variant={
                                                        tokenValido === null
                                                            ? 'secondary'
                                                            : 'success'
                                                    }
                                                    className={styles.alert}
                                                >
                                                    {tokenValido === null ? (
                                                        <>
                                                            <i className="fas fa-spinner fa-spin me-2"></i>
                                                            Validando convite...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="fas fa-check-circle me-2"></i>
                                                            Convite válido! Você será cadastrado como{' '}
                                                            <strong>{roleConvite}</strong>
                                                        </>
                                                    )}
                                                </Alert>

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
                                                            onClick={() =>
                                                                setShowPassword(!showPassword)
                                                            }
                                                            aria-label="Mostrar/ocultar senha"
                                                        >
                                                            <FontAwesomeIcon
                                                                icon={showPassword ? faEyeSlash : faEye}
                                                            />
                                                        </button>
                                                    </div>
                                                </Form.Group>

                                                {/* Botão Submit */}
                                                <Button
                                                    type="submit"
                                                    className={`${styles.registerButton} w-100`}
                                                    disabled={loading || tokenValido !== true}
                                                >
                                                    {loading ? (
                                                        <>
                                                            <span className={styles.spinner}></span>
                                                            Enviando...
                                                        </>
                                                    ) : (
                                                        'Concluir Cadastro'
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
                                        )}
                                    </>
                                ) : (
                                    /* TELA DE SUCESSO */
                                    <div className={styles.successScreen}>
                                        <i className={`fas fa-check-circle ${styles.successIcon}`}></i>
                                        <h2 className={styles.successTitle}>Cadastro Concluído!</h2>
                                        <p className={styles.successMessage}>{message}</p>
                                        <div className={styles.successSteps}>
                                            <h4>Próximos Passos:</h4>
                                            <ol>
                                                <li>Faça login com suas credenciais</li>
                                                <li>Complete seu perfil se necessário</li>
                                                <li>Comece a usar o sistema</li>
                                            </ol>
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

export default RegisterConvite;
