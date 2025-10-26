/**
 * CriarUsuario - Formulário para criar novo usuário pelo admin
 *
 * FUNCIONALIDADES:
 * - Criar usuário diretamente (já aprovado)
 * - Escolher role (Admin ou Colaborador)
 * - Campos: nome, username (opcional), email, senha
 * - Validações completas
 */

import React, { useState } from 'react';
import { Container, Form, Button, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUserPlus,
    faArrowLeft,
    faSave,
    faEye,
    faEyeSlash,
    faCheckCircle,
    faExclamationTriangle,
    faUser,
    faEnvelope,
    faKey,
    faIdCard,
    faUserTag,
} from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import AuthDebug from '../../components/AuthDebug';
import styles from './CriarUsuario.module.css';

const CriarUsuario: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        nome: '',
        username: '',
        email: '',
        senha: '',
        confirmar_senha: '',
        role: 'COLLABORATOR',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePassword = (password: string) => {
        if (password.length < 6) {
            return { valid: false, message: 'A senha deve ter no mínimo 6 caracteres' };
        }
        return { valid: true, message: '' };
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        // Validações
        if (!formData.nome.trim()) {
            setError('O nome é obrigatório');
            return;
        }

        if (!formData.email.trim()) {
            setError('O email é obrigatório');
            return;
        }

        if (!validateEmail(formData.email)) {
            setError('Por favor, insira um email válido');
            return;
        }

        if (!formData.senha) {
            setError('A senha é obrigatória');
            return;
        }

        const validation = validatePassword(formData.senha);
        if (!validation.valid) {
            setError(validation.message);
            return;
        }

        if (formData.senha !== formData.confirmar_senha) {
            setError('A senha e a confirmação não coincidem');
            return;
        }

        setLoading(true);

        try {
            // Monta o payload, omitindo username se estiver vazio
            const payload: any = {
                nome: formData.nome,
                email: formData.email,
                senha: formData.senha,
                role: formData.role,
            };

            // Só adiciona username se não estiver vazio
            if (formData.username && formData.username.trim()) {
                payload.username = formData.username.trim();
            }

            console.log('[FORM] Enviando payload para criar usuario:', payload);

            // NOTA: Usando rota sem JWT ate resolver problema do token
            const response = await api.post('/admin/create_user_temp', payload);

            console.log('[FORM] Resposta do servidor:', response.data);
            setSuccess(true);

            // Limpa o formulário
            setFormData({
                nome: '',
                username: '',
                email: '',
                senha: '',
                confirmarSenha: '',
                role: 'COLLABORATOR'
            });

            // Redireciona após 1.5 segundos
            console.log('[FORM] Redirecionando para /admin/gerenciar-usuarios em 1.5s...');
            setTimeout(() => {
                console.log('[FORM] Executando navegacao...');
                navigate('/admin/gerenciar-usuarios', { replace: true });
            }, 1500);
        } catch (err: any) {
            console.error('[FORM] Erro ao criar usuario:', err);
            console.error('[FORM] Status:', err.response?.status);
            console.error('[FORM] Status Text:', err.response?.statusText);
            console.error('[FORM] Response Data (DETALHADO):', JSON.stringify(err.response?.data, null, 2));
            console.error('[FORM] Response completo:', err.response);
            console.error('[FORM] Config da requisicao:', err.config);

            // Alerta visual com o erro
            if (err.response?.data) {
                console.error('[FORM] ERRO DO BACKEND:', err.response.data);
            }

            // Mensagem de erro detalhada
            let errorMessage = 'Erro ao criar usuário';

            if (err.response?.data?.error) {
                errorMessage = err.response.data.error;
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.response?.status === 422) {
                errorMessage = 'Dados inválidos. Verifique os campos e tente novamente.';
            } else if (err.response?.status === 400) {
                errorMessage = 'Dados incompletos. Preencha todos os campos obrigatórios.';
            } else if (err.response?.status === 409) {
                errorMessage = 'E-mail ou nome de usuário já cadastrado.';
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        navigate('/admin/gerenciar-usuarios');
    };

    return (
        <Container className={styles.container}>
            {/* DEBUG: Componente de Autenticação */}
            <AuthDebug />

            <div className={styles.header}>
                <Link to="/admin/gerenciar-usuarios" className={styles.backButton}>
                    <FontAwesomeIcon icon={faArrowLeft} />
                    <span>Voltar</span>
                </Link>
            </div>

            <div className={styles.pageTitle}>
                <div className={styles.titleIcon}>
                    <FontAwesomeIcon icon={faUserPlus} />
                </div>
                <div>
                    <h1>Criar Novo Usuário</h1>
                    <p className={styles.subtitle}>Adicione um novo usuário ao sistema (já aprovado)</p>
                </div>
            </div>

            {error && (
                <Alert variant="danger" dismissible onClose={() => setError('')}>
                    <FontAwesomeIcon icon={faExclamationTriangle} style={{ marginRight: '0.5rem' }} />
                    {error}
                </Alert>
            )}

            {success && (
                <Alert variant="success">
                    <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: '0.5rem' }} />
                    Usuário criado com sucesso! Redirecionando...
                </Alert>
            )}

            <div className={styles.formCard}>
                <Form onSubmit={handleSubmit}>
                    {/* Nome */}
                    <Form.Group className={styles.formGroup}>
                        <Form.Label>
                            <FontAwesomeIcon icon={faIdCard} style={{ marginRight: '0.5rem' }} />
                            Nome Completo *
                        </Form.Label>
                        <Form.Control
                            type="text"
                            name="nome"
                            value={formData.nome}
                            onChange={handleChange}
                            placeholder="Digite o nome completo"
                            disabled={loading}
                            className={styles.input}
                        />
                    </Form.Group>

                    {/* Username */}
                    <Form.Group className={styles.formGroup}>
                        <Form.Label>
                            <FontAwesomeIcon icon={faUser} style={{ marginRight: '0.5rem' }} />
                            Nome de Usuário (opcional)
                        </Form.Label>
                        <Form.Control
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="Digite um nome de usuário único"
                            disabled={loading}
                            className={styles.input}
                        />
                        <Form.Text className={styles.hint}>
                            Pode ser usado para login no lugar do email
                        </Form.Text>
                    </Form.Group>

                    {/* Email */}
                    <Form.Group className={styles.formGroup}>
                        <Form.Label>
                            <FontAwesomeIcon icon={faEnvelope} style={{ marginRight: '0.5rem' }} />
                            Email *
                        </Form.Label>
                        <Form.Control
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Digite o email"
                            disabled={loading}
                            className={styles.input}
                        />
                    </Form.Group>

                    {/* Role */}
                    <Form.Group className={styles.formGroup}>
                        <Form.Label>
                            <FontAwesomeIcon icon={faUserTag} style={{ marginRight: '0.5rem' }} />
                            Tipo de Conta *
                        </Form.Label>
                        <Form.Select
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            disabled={loading}
                            className={styles.input}
                        >
                            <option value="COLLABORATOR">Colaborador</option>
                            <option value="ADMIN">Administrador</option>
                        </Form.Select>
                        <Form.Text className={styles.hint}>
                            Administradores têm acesso total ao sistema
                        </Form.Text>
                    </Form.Group>

                    {/* Senha */}
                    <Form.Group className={styles.formGroup}>
                        <Form.Label>
                            <FontAwesomeIcon icon={faKey} style={{ marginRight: '0.5rem' }} />
                            Senha *
                        </Form.Label>
                        <div className={styles.passwordInput}>
                            <Form.Control
                                type={showPassword ? 'text' : 'password'}
                                name="senha"
                                value={formData.senha}
                                onChange={handleChange}
                                placeholder="Digite a senha"
                                disabled={loading}
                            />
                            <button
                                type="button"
                                className={styles.togglePassword}
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                            </button>
                        </div>
                        <Form.Text className={styles.hint}>
                            Mínimo 6 caracteres
                        </Form.Text>
                    </Form.Group>

                    {/* Confirmar Senha */}
                    <Form.Group className={styles.formGroup}>
                        <Form.Label>
                            <FontAwesomeIcon icon={faKey} style={{ marginRight: '0.5rem' }} />
                            Confirmar Senha *
                        </Form.Label>
                        <div className={styles.passwordInput}>
                            <Form.Control
                                type={showConfirmPassword ? 'text' : 'password'}
                                name="confirmar_senha"
                                value={formData.confirmar_senha}
                                onChange={handleChange}
                                placeholder="Confirme a senha"
                                disabled={loading}
                            />
                            <button
                                type="button"
                                className={styles.togglePassword}
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
                            </button>
                        </div>
                    </Form.Group>

                    {/* Botões de ação */}
                    <div className={styles.actions}>
                        <Button
                            variant="outline-secondary"
                            onClick={handleCancel}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="success"
                            type="submit"
                            disabled={loading}
                        >
                            <FontAwesomeIcon icon={faSave} style={{ marginRight: '0.5rem' }} />
                            {loading ? 'Criando...' : 'Criar Usuário'}
                        </Button>
                    </div>
                </Form>
            </div>
        </Container>
    );
};

export default CriarUsuario;
