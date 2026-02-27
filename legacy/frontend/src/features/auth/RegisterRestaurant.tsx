import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Form, Button, Alert, Card, Container, Row, Col, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCheckCircle, faCopy } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import styles from './Register.module.css';

const RegisterRestaurant: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const tokenConvite = searchParams.get('token');
    const isInviteFlow = !!tokenConvite;

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [tokenValido, setTokenValido] = useState<boolean | null>(null);
    const [tokenExpiraEm, setTokenExpiraEm] = useState<string | null>(null);
    const [tokenErro, setTokenErro] = useState('');
    const [credenciaisCopiadas, setCredenciaisCopiadas] = useState(false);
    const [successData, setSuccessData] = useState<{
        restauranteNome?: string;
        adminEmail?: string;
        senha?: string;
    } | null>(null);

    // Campos do formulário
    const [formData, setFormData] = useState({
        nome_restaurante: '',
        endereco_restaurante: '',
        email_restaurante: '',
        telefone_restaurante: '',
        nome_responsavel: '',
        email_responsavel: '',
        telefone_responsavel: '',
        cnpj: '',
        razao_social: ''
    });

    // Validações
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Redirect após sucesso
    useEffect(() => {
        if (success && !isInviteFlow) {
            const timer = setTimeout(() => navigate('/login'), 3000);
            return () => clearTimeout(timer);
        }
    }, [success, isInviteFlow, navigate]);

    useEffect(() => {
        if (tokenConvite) {
            validarToken(tokenConvite);
        }
    }, [tokenConvite]);

    const validarToken = async (token: string) => {
        setTokenValido(null);
        setTokenErro('');
        setError('');
        try {
            const response = await api.get(`/public/validar-convite-restaurante?token=${token}`);
            if (response.data.valido) {
                setTokenValido(true);
                setTokenExpiraEm(response.data.expira_em || null);
            } else {
                setTokenValido(false);
                setTokenErro(response.data.erro || 'Token de convite inválido ou expirado');
            }
        } catch (err: any) {
            const erroResposta =
                err.response?.data?.erro ||
                err.response?.data?.error ||
                (err.response ? 'Token de convite inválido ou expirado' : 'Erro ao validar token de convite');
            setTokenValido(false);
            setTokenExpiraEm(null);
            setTokenErro(erroResposta);
        }
    };

    // Máscaras
    const aplicarMascaraTelefone = (valor: string): string => {
        const apenasDigitos = valor.replace(/\D/g, '');
        if (apenasDigitos.length === 0) return '';
        if (apenasDigitos.length <= 2) return apenasDigitos;
        if (apenasDigitos.length <= 7) {
            return `(${apenasDigitos.slice(0, 2)}) ${apenasDigitos.slice(2)}`;
        }
        return `(${apenasDigitos.slice(0, 2)}) ${apenasDigitos.slice(2, 7)}-${apenasDigitos.slice(7, 11)}`;
    };

    const aplicarMascaraCNPJ = (valor: string): string => {
        const apenasDigitos = valor.replace(/\D/g, '');
        if (apenasDigitos.length === 0) return '';
        if (apenasDigitos.length <= 2) return apenasDigitos;
        if (apenasDigitos.length <= 5) {
            return `${apenasDigitos.slice(0, 2)}.${apenasDigitos.slice(2)}`;
        }
        if (apenasDigitos.length <= 8) {
            return `${apenasDigitos.slice(0, 2)}.${apenasDigitos.slice(2, 5)}.${apenasDigitos.slice(5)}`;
        }
        return `${apenasDigitos.slice(0, 2)}.${apenasDigitos.slice(2, 5)}.${apenasDigitos.slice(5, 8)}/${apenasDigitos.slice(8, 12)}-${apenasDigitos.slice(12, 14)}`;
    };

    // Handle input change
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let valorFormatado = value;

        // Aplicar máscaras
        if (name === 'telefone_restaurante' || name === 'telefone_responsavel') {
            valorFormatado = aplicarMascaraTelefone(value);
        } else if (name === 'cnpj') {
            valorFormatado = aplicarMascaraCNPJ(value);
        }

        setFormData({
            ...formData,
            [name]: valorFormatado
        });

        // Limpar erro do campo
        if (errors[name]) {
            setErrors({
                ...errors,
                [name]: ''
            });
        }
    };

    // Validações
    const validarFormulario = (): boolean => {
        const novosErros: Record<string, string> = {};

        // Campos obrigatórios
        if (!formData.nome_restaurante.trim()) {
            novosErros.nome_restaurante = 'Nome do restaurante é obrigatório';
        }
        if (!formData.endereco_restaurante.trim()) {
            novosErros.endereco_restaurante = 'Endereço é obrigatório';
        }
        if (!formData.email_restaurante.trim()) {
            novosErros.email_restaurante = 'Email do restaurante é obrigatório';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email_restaurante)) {
            novosErros.email_restaurante = 'Email inválido';
        }
        if (!formData.telefone_restaurante.trim()) {
            novosErros.telefone_restaurante = 'Telefone do restaurante é obrigatório';
        } else if (formData.telefone_restaurante.replace(/\D/g, '').length < 10) {
            novosErros.telefone_restaurante = 'Telefone deve ter pelo menos 10 dígitos';
        }
        if (!formData.nome_responsavel.trim()) {
            novosErros.nome_responsavel = 'Nome do responsável é obrigatório';
        }
        if (!formData.email_responsavel.trim()) {
            novosErros.email_responsavel = 'Email do responsável é obrigatório';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email_responsavel)) {
            novosErros.email_responsavel = 'Email inválido';
        }
        if (!formData.telefone_responsavel.trim()) {
            novosErros.telefone_responsavel = 'Telefone do responsável é obrigatório';
        } else if (formData.telefone_responsavel.replace(/\D/g, '').length < 10) {
            novosErros.telefone_responsavel = 'Telefone deve ter pelo menos 10 dígitos';
        }

        // CNPJ opcional - validar se preenchido
        if (formData.cnpj.trim() && formData.cnpj.replace(/\D/g, '').length !== 14) {
            novosErros.cnpj = 'CNPJ deve conter 14 dígitos';
        }

        setErrors(novosErros);
        return Object.keys(novosErros).length === 0;
    };

    // Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!validarFormulario()) {
            return;
        }

        setLoading(true);

        try {
            // Preparar dados para envio (remover máscaras)
            const dadosEnvio = {
                nome_restaurante: formData.nome_restaurante.trim(),
                endereco_restaurante: formData.endereco_restaurante.trim(),
                email_restaurante: formData.email_restaurante.trim().toLowerCase(),
                telefone_restaurante: formData.telefone_restaurante,
                nome_responsavel: formData.nome_responsavel.trim(),
                email_responsavel: formData.email_responsavel.trim().toLowerCase(),
                telefone_responsavel: formData.telefone_responsavel,
                cnpj: formData.cnpj.trim() || undefined,
                razao_social: formData.razao_social.trim() || undefined
            };

            if (isInviteFlow && tokenValido !== true) {
                setError('Convite inválido ou não validado');
                return;
            }

            const endpoint = isInviteFlow
                ? '/public/register-restaurante-com-convite'
                : '/public/solicitar-restaurante';

            const response = await api.post(endpoint, {
                ...dadosEnvio,
                token_convite: tokenConvite || undefined
            });

            if (response.status === 201) {
                setSuccess(true);
                if (isInviteFlow) {
                    setSuccessData({
                        restauranteNome: response.data?.restaurante?.nome,
                        adminEmail: response.data?.usuario_admin?.email,
                        senha: response.data?.usuario_admin?.senha_gerada
                    });
                }
            }
        } catch (err: any) {
            const mensagemErro =
                err.response?.data?.error ||
                err.message ||
                'Erro ao enviar solicitação. Tente novamente.';
            setError(mensagemErro);
        } finally {
            setLoading(false);
        }
    };

    // Tela de sucesso
    if (success) {
        const loginUrl = `${window.location.origin}/login`;
        const credenciaisTexto = successData?.adminEmail && successData?.senha
            ? `Email: ${successData.adminEmail}\nSenha: ${successData.senha}\nAcesso: ${loginUrl}`
            : '';

        const handleCopiarCredenciais = async () => {
            if (!credenciaisTexto) return;
            try {
                await navigator.clipboard.writeText(credenciaisTexto);
                setCredenciaisCopiadas(true);
                setTimeout(() => setCredenciaisCopiadas(false), 2000);
            } catch (err) {
                setError('Erro ao copiar credenciais');
            }
        };

        return (
            <div className={styles.container}>
                <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
                    <Row className="w-100">
                        <Col md={6} className="mx-auto">
                            <Card className={`${styles.card} border-0 shadow-lg`}>
                                <Card.Body className="text-center p-5">
                                    <div className="mb-4">
                                        <FontAwesomeIcon
                                            icon={faCheckCircle}
                                            size="4x"
                                            className="text-success"
                                        />
                                    </div>
                                    {isInviteFlow ? (
                                        <>
                                            <h2 className="mb-3 text-success">Cadastro Concluído!</h2>
                                            <p className="lead mb-3">
                                                Seu restaurante foi cadastrado com sucesso.
                                            </p>
                                            {successData?.restauranteNome && (
                                                <p className="text-muted mb-3">
                                                    Restaurante: <strong>{successData.restauranteNome}</strong>
                                                </p>
                                            )}
                                            {successData?.adminEmail && successData?.senha && (
                                                <div className="text-start bg-light p-3 rounded mb-3">
                                                    <p className="mb-1"><strong>Email:</strong> {successData.adminEmail}</p>
                                                    <p className="mb-1"><strong>Senha:</strong> {successData.senha}</p>
                                                    <p className="mb-0"><strong>Acesso:</strong> {loginUrl}</p>
                                                </div>
                                            )}
                                            {credenciaisCopiadas && (
                                                <Alert variant="success" className="mb-3">
                                                    ✅ Credenciais copiadas!
                                                </Alert>
                                            )}
                                            <div className="d-grid gap-2">
                                                <Button
                                                    variant="outline-primary"
                                                    onClick={handleCopiarCredenciais}
                                                    disabled={!credenciaisTexto}
                                                >
                                                    <FontAwesomeIcon icon={faCopy} className="me-2" />
                                                    Copiar credenciais
                                                </Button>
                                                <Link to="/login" className="btn btn-primary">
                                                    Ir para Login
                                                </Link>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <h2 className="mb-3 text-success">Solicitação Enviada com Sucesso!</h2>
                                            <p className="lead mb-4">
                                                Obrigado por seu interesse em utilizar o Kaizen Lists.
                                            </p>
                                            <p className="text-muted mb-4">
                                                Sua solicitação foi recebida e será processada em breve.
                                                Você receberá um email com as próximas etapas.
                                            </p>
                                            <div className="alert alert-info" role="alert">
                                                <i className="fas fa-info-circle me-2"></i>
                                                Redirecionando para login em 3 segundos...
                                            </div>
                                            <Link to="/login" className="btn btn-primary mt-3">
                                                Ir para Login
                                            </Link>
                                        </>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', paddingTop: '20px', paddingBottom: '20px' }}>
                <Row className="w-100">
                    <Col md={8} lg={7} xl={6} className="mx-auto">
                        <div className="mb-3">
                            <Link to="/login" className={`btn btn-sm btn-outline-secondary ${styles.backButton}`}>
                                <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                                Voltar para Login
                            </Link>
                        </div>

                        <Card className={`${styles.card} border-0 shadow-lg`}>
                            <Card.Body className="p-4">
                                {isInviteFlow && (
                                    <Alert
                                        variant={tokenValido === false ? 'danger' : 'warning'}
                                        className="mb-3"
                                    >
                                        {tokenValido === null ? (
                                            <>
                                                <i className="fas fa-spinner fa-spin me-2"></i>
                                                Validando convite...
                                            </>
                                        ) : tokenValido ? (
                                            <>
                                                <i className="fas fa-check-circle me-2"></i>
                                                Convite identificado. Cadastro imediato liberado.
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-exclamation-circle me-2"></i>
                                                {tokenErro || 'Token de convite inválido ou expirado'}
                                            </>
                                        )}
                                        {tokenValido !== false && (
                                            <div className="mt-2 small">
                                                Você foi convidado via token. Ele tem validade de 72 horas a partir da criação.
                                                {tokenExpiraEm && (
                                                    <span className="ms-1">
                                                        Válido até {tokenExpiraEm}.
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </Alert>
                                )}

                                <h2 className="mb-1 text-center text-primary">
                                    {isInviteFlow ? 'Cadastro de Restaurante por Convite' : 'Solicitar Cadastro de Restaurante'}
                                </h2>
                                <p className="text-muted text-center mb-4">
                                    {isInviteFlow
                                        ? 'Preencha o formulário para concluir seu cadastro imediato'
                                        : 'Preencha o formulário abaixo para solicitar acesso ao sistema'}
                                </p>

                                {error && (
                                    <Alert variant="danger" onClose={() => setError('')} dismissible>
                                        {error}
                                    </Alert>
                                )}

                                <Form onSubmit={handleSubmit}>
                                    {/* Seção: Dados do Restaurante */}
                                    <h5 className="mb-3 mt-4">
                                        <i className="fas fa-store me-2 text-primary"></i>
                                        Dados do Restaurante
                                    </h5>

                                    <Form.Group className="mb-3">
                                        <Form.Label>
                                            Nome do Restaurante <span className="text-danger">*</span>
                                        </Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="nome_restaurante"
                                            value={formData.nome_restaurante}
                                            onChange={handleChange}
                                            isInvalid={!!errors.nome_restaurante}
                                            placeholder="Ex: Restaurante Exemplo"
                                            disabled={loading}
                                        />
                                        <Form.Control.Feedback type="invalid">
                                            {errors.nome_restaurante}
                                        </Form.Control.Feedback>
                                    </Form.Group>

                                    <Form.Group className="mb-3">
                                        <Form.Label>
                                            Endereço <span className="text-danger">*</span>
                                        </Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="endereco_restaurante"
                                            value={formData.endereco_restaurante}
                                            onChange={handleChange}
                                            isInvalid={!!errors.endereco_restaurante}
                                            placeholder="Rua, número, bairro, cidade"
                                            disabled={loading}
                                        />
                                        <Form.Control.Feedback type="invalid">
                                            {errors.endereco_restaurante}
                                        </Form.Control.Feedback>
                                    </Form.Group>

                                    <Row>
                                        <Col md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label>
                                                    Email do Restaurante <span className="text-danger">*</span>
                                                </Form.Label>
                                                <Form.Control
                                                    type="email"
                                                    name="email_restaurante"
                                                    value={formData.email_restaurante}
                                                    onChange={handleChange}
                                                    isInvalid={!!errors.email_restaurante}
                                                    placeholder="email@restaurante.com"
                                                    disabled={loading}
                                                />
                                                <Form.Control.Feedback type="invalid">
                                                    {errors.email_restaurante}
                                                </Form.Control.Feedback>
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label>
                                                    Telefone <span className="text-danger">*</span>
                                                </Form.Label>
                                                <Form.Control
                                                    type="tel"
                                                    name="telefone_restaurante"
                                                    value={formData.telefone_restaurante}
                                                    onChange={handleChange}
                                                    isInvalid={!!errors.telefone_restaurante}
                                                    placeholder="(11) 99999-9999"
                                                    disabled={loading}
                                                />
                                                <Form.Control.Feedback type="invalid">
                                                    {errors.telefone_restaurante}
                                                </Form.Control.Feedback>
                                            </Form.Group>
                                        </Col>
                                    </Row>

                                    {/* Seção: Dados do Responsável */}
                                    <h5 className="mb-3 mt-4">
                                        <i className="fas fa-user me-2 text-primary"></i>
                                        Dados do Responsável
                                    </h5>

                                    <Form.Group className="mb-3">
                                        <Form.Label>
                                            Nome do Responsável <span className="text-danger">*</span>
                                        </Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="nome_responsavel"
                                            value={formData.nome_responsavel}
                                            onChange={handleChange}
                                            isInvalid={!!errors.nome_responsavel}
                                            placeholder="Seu nome completo"
                                            disabled={loading}
                                        />
                                        <Form.Control.Feedback type="invalid">
                                            {errors.nome_responsavel}
                                        </Form.Control.Feedback>
                                    </Form.Group>

                                    <Row>
                                        <Col md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label>
                                                    Email <span className="text-danger">*</span>
                                                </Form.Label>
                                                <Form.Control
                                                    type="email"
                                                    name="email_responsavel"
                                                    value={formData.email_responsavel}
                                                    onChange={handleChange}
                                                    isInvalid={!!errors.email_responsavel}
                                                    placeholder="seu.email@exemplo.com"
                                                    disabled={loading}
                                                />
                                                <Form.Control.Feedback type="invalid">
                                                    {errors.email_responsavel}
                                                </Form.Control.Feedback>
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label>
                                                    Telefone <span className="text-danger">*</span>
                                                </Form.Label>
                                                <Form.Control
                                                    type="tel"
                                                    name="telefone_responsavel"
                                                    value={formData.telefone_responsavel}
                                                    onChange={handleChange}
                                                    isInvalid={!!errors.telefone_responsavel}
                                                    placeholder="(11) 99999-9999"
                                                    disabled={loading}
                                                />
                                                <Form.Control.Feedback type="invalid">
                                                    {errors.telefone_responsavel}
                                                </Form.Control.Feedback>
                                            </Form.Group>
                                        </Col>
                                    </Row>

                                    {/* Seção: Dados Adicionais (Opcionais) */}
                                    <h5 className="mb-3 mt-4">
                                        <i className="fas fa-file-alt me-2 text-secondary"></i>
                                        Dados Adicionais <small className="text-muted">(Opcionais)</small>
                                    </h5>

                                    <Row>
                                        <Col md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label>CNPJ</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    name="cnpj"
                                                    value={formData.cnpj}
                                                    onChange={handleChange}
                                                    isInvalid={!!errors.cnpj}
                                                    placeholder="00.000.000/0000-00"
                                                    disabled={loading}
                                                />
                                                <Form.Control.Feedback type="invalid">
                                                    {errors.cnpj}
                                                </Form.Control.Feedback>
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label>Razão Social</Form.Label>
                                                <Form.Control
                                                    type="text"
                                                    name="razao_social"
                                                    value={formData.razao_social}
                                                    onChange={handleChange}
                                                    placeholder="Razão social da empresa"
                                                    disabled={loading}
                                                />
                                            </Form.Group>
                                        </Col>
                                    </Row>

                                    {/* Botões */}
                                    <div className="d-grid gap-2 mt-4">
                                        <Button
                                            variant="primary"
                                            size="lg"
                                            type="submit"
                                            disabled={loading || (isInviteFlow && tokenValido !== true)}
                                        >
                                            {loading ? (
                                                <>
                                                    <Spinner as="span" animation="border" size="sm" className="me-2" />
                                                    Enviando...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fas fa-paper-plane me-2"></i>
                                                    {isInviteFlow ? 'Cadastrar Estabelecimento' : 'Enviar Solicitação'}
                                                </>
                                            )}
                                        </Button>
                                    </div>

                                    <p className="text-center text-muted mt-3 small">
                                        Já tem uma conta? <Link to="/login">Faça login aqui</Link>
                                    </p>
                                </Form>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default RegisterRestaurant;
