import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import api from '../../services/api';
import './Login.css'; // Assuming you will create a Login.css for custom styles

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const response = await api.post('/auth/login', { email, senha });
            localStorage.setItem('accessToken', response.data.access_token);
            // Decode token to get user role and redirect accordingly
            const user = JSON.parse(atob(response.data.access_token.split('.')[1]));
            if (user.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/dashboard');
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao fazer login');
        }
    };

    return (
        <div className="login-body">
            <Container>
                <Row className="justify-content-center align-items-center vh-100">
                    <Col md={6} lg={4}>
                        <Card className="shadow-lg border-0 rounded-lg">
                            <Card.Body className="p-5">
                                <div className="text-center mb-4">
                                    <i className="fas fa-stream fa-3x text-primary mb-3"></i>
                                    <h2 className="fw-bold">Kaizen Lists</h2>
                                    <p className="text-muted">Otimizando seu fluxo, um item de cada vez.</p>
                                </div>

                                <Form onSubmit={handleSubmit}>
                                    {error && <Alert variant="danger">{error}</Alert>}
                                    
                                    <Form.Group className="mb-3" controlId="email">
                                        <Form.Label><i className="fas fa-envelope me-2"></i>Email</Form.Label>
                                        <Form.Control 
                                            type="email" 
                                            placeholder="seu@email.com" 
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required 
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-3" controlId="password">
                                        <Form.Label><i className="fas fa-lock me-2"></i>Senha</Form.Label>
                                        <Form.Control 
                                            type="password" 
                                            placeholder="Senha" 
                                            value={senha}
                                            onChange={(e) => setSenha(e.target.value)}
                                            required 
                                        />
                                    </Form.Group>

                                    <div className="d-flex justify-content-between align-items-center mb-4">
                                        <Form.Check 
                                            type="checkbox"
                                            id="rememberMe"
                                            label="Lembrar-me"
                                        />
                                        <a href="#!" className="small text-decoration-none">Esqueceu a senha?</a>
                                    </div>

                                    <div className="d-grid">
                                        <Button variant="primary" type="submit" size="lg" className="fw-bold">
                                            Entrar
                                        </Button>
                                    </div>
                                </Form>
                                <hr />
                                <div className="text-center">
                                    <a href="#!" className="text-decoration-none">Não tem uma conta? Solicitar Cadastro</a>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default Login;
