/**
 * MudarSenha - Página para alteração de senha do usuário
 *
 * FUNCIONALIDADES:
 * - Formulário com senha atual, nova senha e confirmação
 * - Validação de força da senha
 * - Validação de confirmação de senha
 * - Feedback visual de erros e sucesso
 */

import React, { useState } from 'react';
import { Container, Form, Button, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faKey,
    faArrowLeft,
    faSave,
    faEye,
    faEyeSlash,
    faCheckCircle,
    faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import styles from './MudarSenha.module.css';

const MudarSenha: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        senha_atual: '',
        nova_senha: '',
        confirmar_senha: '',
    });
    const [showPasswords, setShowPasswords] = useState({
        atual: false,
        nova: false,
        confirmar: false,
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    // Validação de força da senha
    const validatePassword = (password: string) => {
        if (password.length < 6) {
            return { valid: false, message: 'A senha deve ter no mínimo 6 caracteres' };
        }
        if (!/[A-Z]/.test(password)) {
            return { valid: false, message: 'A senha deve conter pelo menos uma letra maiúscula' };
        }
        if (!/[a-z]/.test(password)) {
            return { valid: false, message: 'A senha deve conter pelo menos uma letra minúscula' };
        }
        if (!/[0-9]/.test(password)) {
            return { valid: false, message: 'A senha deve conter pelo menos um número' };
        }
        return { valid: true, message: '' };
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError(''); // Limpa erro ao digitar
    };

    const togglePasswordVisibility = (field: 'atual' | 'nova' | 'confirmar') => {
        setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        // Validações
        if (!formData.senha_atual || !formData.nova_senha || !formData.confirmar_senha) {
            setError('Todos os campos são obrigatórios');
            return;
        }

        if (formData.nova_senha !== formData.confirmar_senha) {
            setError('A nova senha e a confirmação não coincidem');
            return;
        }

        if (formData.senha_atual === formData.nova_senha) {
            setError('A nova senha deve ser diferente da senha atual');
            return;
        }

        // Valida força da nova senha
        const validation = validatePassword(formData.nova_senha);
        if (!validation.valid) {
            setError(validation.message);
            return;
        }

        setLoading(true);

        try {
            await api.post('/auth/change-password', formData);
            setSuccess(true);
            setFormData({
                senha_atual: '',
                nova_senha: '',
                confirmar_senha: '',
            });

            // Redireciona após 2 segundos
            setTimeout(() => {
                navigate('/admin/configuracoes');
            }, 2000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao alterar senha');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        navigate('/admin/configuracoes');
    };

    return (
        <Container className={styles.container}>
            <div className={styles.header}>
                <Link to="/admin/configuracoes" className={styles.backButton}>
                    <FontAwesomeIcon icon={faArrowLeft} />
                    <span>Voltar às Configurações</span>
                </Link>
            </div>

            <div className={styles.pageTitle}>
                <div className={styles.titleIcon}>
                    <FontAwesomeIcon icon={faKey} />
                </div>
                <div>
                    <h1>Mudar Senha</h1>
                    <p className={styles.subtitle}>Altere sua senha de acesso ao sistema</p>
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
                    Senha alterada com sucesso! Redirecionando...
                </Alert>
            )}

            <div className={styles.formCard}>
                <Form onSubmit={handleSubmit}>
                    {/* Senha Atual */}
                    <Form.Group className={styles.formGroup}>
                        <Form.Label>Senha Atual *</Form.Label>
                        <div className={styles.passwordInput}>
                            <Form.Control
                                type={showPasswords.atual ? 'text' : 'password'}
                                name="senha_atual"
                                value={formData.senha_atual}
                                onChange={handleChange}
                                placeholder="Digite sua senha atual"
                                disabled={loading}
                            />
                            <button
                                type="button"
                                className={styles.togglePassword}
                                onClick={() => togglePasswordVisibility('atual')}
                            >
                                <FontAwesomeIcon icon={showPasswords.atual ? faEyeSlash : faEye} />
                            </button>
                        </div>
                    </Form.Group>

                    {/* Nova Senha */}
                    <Form.Group className={styles.formGroup}>
                        <Form.Label>Nova Senha *</Form.Label>
                        <div className={styles.passwordInput}>
                            <Form.Control
                                type={showPasswords.nova ? 'text' : 'password'}
                                name="nova_senha"
                                value={formData.nova_senha}
                                onChange={handleChange}
                                placeholder="Digite sua nova senha"
                                disabled={loading}
                            />
                            <button
                                type="button"
                                className={styles.togglePassword}
                                onClick={() => togglePasswordVisibility('nova')}
                            >
                                <FontAwesomeIcon icon={showPasswords.nova ? faEyeSlash : faEye} />
                            </button>
                        </div>
                        <Form.Text className={styles.passwordHint}>
                            Mínimo 6 caracteres, com letras maiúsculas, minúsculas e números
                        </Form.Text>
                    </Form.Group>

                    {/* Confirmar Senha */}
                    <Form.Group className={styles.formGroup}>
                        <Form.Label>Confirmar Nova Senha *</Form.Label>
                        <div className={styles.passwordInput}>
                            <Form.Control
                                type={showPasswords.confirmar ? 'text' : 'password'}
                                name="confirmar_senha"
                                value={formData.confirmar_senha}
                                onChange={handleChange}
                                placeholder="Confirme sua nova senha"
                                disabled={loading}
                            />
                            <button
                                type="button"
                                className={styles.togglePassword}
                                onClick={() => togglePasswordVisibility('confirmar')}
                            >
                                <FontAwesomeIcon icon={showPasswords.confirmar ? faEyeSlash : faEye} />
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
                            variant="primary"
                            type="submit"
                            disabled={loading}
                        >
                            <FontAwesomeIcon icon={faSave} style={{ marginRight: '0.5rem' }} />
                            {loading ? 'Salvando...' : 'Salvar Nova Senha'}
                        </Button>
                    </div>
                </Form>
            </div>

            {/* Dicas de segurança */}
            <div className={styles.securityTips}>
                <div className={styles.tipsHeader}>
                    <FontAwesomeIcon icon={faCheckCircle} />
                    <h3>Dicas de Segurança</h3>
                </div>
                <ul>
                    <li>Use uma senha forte e única para cada conta</li>
                    <li>Evite informações pessoais óbvias (nome, data de nascimento, etc.)</li>
                    <li>Combine letras maiúsculas, minúsculas, números e símbolos</li>
                    <li>Não compartilhe sua senha com ninguém</li>
                    <li>Troque sua senha periodicamente</li>
                </ul>
            </div>
        </Container>
    );
};

export default MudarSenha;
