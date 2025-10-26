import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserShield, faKey } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import styles from './CreateFirstAdmin.module.css';

const CreateFirstAdmin: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        senha_mestra: '',
        nome: '',
        email: '',
        username: '',
        senha: '',
        confirmar_senha: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validações
        if (formData.senha !== formData.confirmar_senha) {
            setError('As senhas não coincidem');
            return;
        }

        if (formData.senha.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres');
            return;
        }

        setLoading(true);

        try {
            const response = await api.post('/auth/create-first-admin', {
                senha_mestra: formData.senha_mestra,
                nome: formData.nome,
                email: formData.email,
                username: formData.username,
                senha: formData.senha
            });

            setSuccess(response.data.message);

            // Redireciona para login após 2 segundos
            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao criar administrador');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.wrapper}>
            <Container className={styles.container}>
                <Card className={styles.card}>
                    <Card.Body className={styles.cardBody}>
                        <div className={styles.header}>
                            <FontAwesomeIcon icon={faUserShield} className={styles.icon} />
                            <h2 className={styles.title}>Criar Primeiro Administrador</h2>
                            <p className={styles.subtitle}>
                                Configure o primeiro administrador do sistema
                            </p>
                        </div>

                        {error && (
                            <Alert variant="danger" dismissible onClose={() => setError('')}>
                                {error}
                            </Alert>
                        )}

                        {success && (
                            <Alert variant="success">
                                {success}
                            </Alert>
                        )}

                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3">
                                <Form.Label>
                                    <FontAwesomeIcon icon={faKey} style={{ marginRight: '0.5rem' }} />
                                    Senha Mestra *
                                </Form.Label>
                                <Form.Control
                                    type="password"
                                    name="senha_mestra"
                                    value={formData.senha_mestra}
                                    onChange={handleChange}
                                    placeholder="Digite a senha mestra"
                                    required
                                    disabled={loading || !!success}
                                />
                                <Form.Text className="text-muted">
                                    Senha fornecida pelo desenvolvedor
                                </Form.Text>
                            </Form.Group>

                            <hr />

                            <Form.Group className="mb-3">
                                <Form.Label>Nome Completo *</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="nome"
                                    value={formData.nome}
                                    onChange={handleChange}
                                    placeholder="Ex: João Silva"
                                    required
                                    disabled={loading || !!success}
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Email *</Form.Label>
                                <Form.Control
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="admin@empresa.com"
                                    required
                                    disabled={loading || !!success}
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Username *</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="admin"
                                    required
                                    disabled={loading || !!success}
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Senha *</Form.Label>
                                <Form.Control
                                    type="password"
                                    name="senha"
                                    value={formData.senha}
                                    onChange={handleChange}
                                    placeholder="Mínimo 6 caracteres"
                                    required
                                    disabled={loading || !!success}
                                />
                            </Form.Group>

                            <Form.Group className="mb-4">
                                <Form.Label>Confirmar Senha *</Form.Label>
                                <Form.Control
                                    type="password"
                                    name="confirmar_senha"
                                    value={formData.confirmar_senha}
                                    onChange={handleChange}
                                    placeholder="Digite a senha novamente"
                                    required
                                    disabled={loading || !!success}
                                />
                            </Form.Group>

                            <div className={styles.actions}>
                                <Button
                                    variant="secondary"
                                    onClick={() => navigate('/login')}
                                    disabled={loading}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    variant="primary"
                                    type="submit"
                                    disabled={loading || !!success}
                                >
                                    {loading ? 'Criando...' : 'Criar Administrador'}
                                </Button>
                            </div>
                        </Form>
                    </Card.Body>
                </Card>
            </Container>
        </div>
    );
};

export default CreateFirstAdmin;
