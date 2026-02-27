/**
 * EditarPerfil - Página para edição de perfil do usuário
 *
 * FUNCIONALIDADES:
 * - Carregar dados atuais do perfil
 * - Editar nome e email
 * - Validação de email
 * - Feedback visual de erros e sucesso
 */

import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUser,
    faArrowLeft,
    faSave,
    faCheckCircle,
    faExclamationTriangle,
    faEnvelope,
    faIdCard,
    faSignOutAlt,
} from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { formatarDataBrasiliaSemHora } from '../../utils/dateFormatter';
import styles from './EditarPerfil.module.css';
import { useAuth } from '../../context/AuthContext';

interface UserProfile {
    id: number;
    nome: string;
    username: string | null;
    email: string;
    role: string;
    aprovado: boolean;
    criado_em: string;
}

const EditarPerfil: React.FC = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [formData, setFormData] = useState({
        nome: '',
        username: '',
        email: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Carregar perfil ao montar componente
    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const response = await api.get('/auth/profile');
            setProfile(response.data);
            setFormData({
                nome: response.data.nome,
                username: response.data.username || '',
                email: response.data.email,
            });
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao carregar perfil');
        } finally {
            setLoading(false);
        }
    };

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError(''); // Limpa erro ao digitar
        setSuccess(false);
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

        setSaving(true);

        try {
            const response = await api.put('/auth/profile', formData);
            setProfile(response.data.user);
            setSuccess(true);

            // Redireciona após 2 segundos
            setTimeout(() => {
                navigate('/admin/configuracoes');
            }, 2000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao atualizar perfil');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        navigate('/admin/configuracoes');
    };

    const handleReset = () => {
        if (profile) {
            setFormData({
                nome: profile.nome,
                username: profile.username || '',
                email: profile.email,
            });
            setError('');
            setSuccess(false);
        }
    };

    const hasChanges = profile && (
        formData.nome !== profile.nome ||
        formData.username !== (profile.username || '') ||
        formData.email !== profile.email
    );

    if (loading) {
        return (
            <Container className={styles.container}>
                <div className={styles.loadingContainer}>
                    <Spinner animation="border" variant="primary" />
                    <p>Carregando perfil...</p>
                </div>
            </Container>
        );
    }

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
                    <FontAwesomeIcon icon={faUser} />
                </div>
                <div>
                    <h1>Editar Perfil</h1>
                    <p className={styles.subtitle}>Atualize suas informações pessoais</p>
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
                    Perfil atualizado com sucesso! Redirecionando...
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
                            placeholder="Digite seu nome completo"
                            disabled={saving}
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
                            disabled={saving}
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
                            placeholder="Digite seu email"
                            disabled={saving}
                            className={styles.input}
                        />
                        <Form.Text className={styles.hint}>
                            O email será usado para login no sistema
                        </Form.Text>
                    </Form.Group>

                    {/* Informações adicionais (somente leitura) */}
                    {profile && (
                        <div className={styles.infoSection}>
                            <h3>Informações da Conta</h3>
                            <div className={styles.infoGrid}>
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Tipo de Conta:</span>
                                    <span className={styles.infoBadge} data-role={profile.role}>
                                        {profile.role === 'SUPER_ADMIN'
                                            ? 'Super Admin'
                                            : profile.role === 'ADMIN'
                                                ? 'Administrador'
                                                : 'Colaborador'}
                                    </span>
                                </div>
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Status:</span>
                                    <span className={styles.infoBadge} data-status={profile.aprovado ? 'approved' : 'pending'}>
                                        {profile.aprovado ? 'Aprovado' : 'Pendente'}
                                    </span>
                                </div>
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Membro desde:</span>
                                    <span className={styles.infoValue}>
                                        {formatarDataBrasiliaSemHora(profile.criado_em)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Botões de ação */}
                    <div className={styles.actions}>
                        <Button
                            variant="danger"
                            onClick={logout}
                            disabled={saving}
                        >
                            <FontAwesomeIcon icon={faSignOutAlt} style={{ marginRight: '0.5rem' }} />
                            Sair
                        </Button>
                        <Button
                            variant="outline-secondary"
                            onClick={handleCancel}
                            disabled={saving}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="outline-warning"
                            onClick={handleReset}
                            disabled={saving || !hasChanges}
                        >
                            Resetar Alterações
                        </Button>
                        <Button
                            variant="primary"
                            type="submit"
                            disabled={saving || !hasChanges}
                        >
                            <FontAwesomeIcon icon={faSave} style={{ marginRight: '0.5rem' }} />
                            {saving ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                    </div>
                </Form>
            </div>
        </Container>
    );
};

export default EditarPerfil;
