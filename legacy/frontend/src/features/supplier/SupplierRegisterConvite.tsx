import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { registerSupplierComConvite, validarConviteFornecedor } from '../../services/supplierApi';

const SupplierRegisterConvite: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
    nome_empresa: '',
    telefone: '',
    cnpj: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    site: ''
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tokenParam = params.get('token') || '';
    setToken(tokenParam);
    if (!tokenParam) {
      setError('Convite inválido.');
      setValidating(false);
      return;
    }
    validarConviteFornecedor(tokenParam)
      .then((data) => {
        if (data?.valido === false) {
          setError(data?.erro || 'Convite inválido.');
        }
        setValidating(false);
      })
      .catch((err) => {
        setError(err.response?.data?.error || err.response?.data?.erro || 'Convite inválido.');
        setValidating(false);
      });
  }, [location.search]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await registerSupplierComConvite({ ...form, token });
      if (response?.access_token) {
        localStorage.setItem('accessToken', response.access_token);
        navigate('/supplier/dashboard');
        return;
      }
      setSuccess('Cadastro concluído.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao cadastrar fornecedor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={8} lg={6}>
            <Card className="shadow-sm">
              <Card.Body>
                <h3 className="mb-3">Cadastro com Convite</h3>
                {validating && <Alert variant="info">Validando convite...</Alert>}
                {error && <Alert variant="danger">{error}</Alert>}
                {success && <Alert variant="success">{success}</Alert>}
                {!validating && !error && (
                  <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nome</Form.Label>
                      <Form.Control name="nome" value={form.nome} onChange={handleChange} required />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Email</Form.Label>
                      <Form.Control type="email" name="email" value={form.email} onChange={handleChange} required />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Senha</Form.Label>
                      <Form.Control type="password" name="senha" value={form.senha} onChange={handleChange} required />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Nome da Empresa</Form.Label>
                      <Form.Control name="nome_empresa" value={form.nome_empresa} onChange={handleChange} required />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>Telefone</Form.Label>
                      <Form.Control name="telefone" value={form.telefone} onChange={handleChange} required />
                    </Form.Group>
                    <Form.Group className="mb-3">
                      <Form.Label>CNPJ (opcional)</Form.Label>
                      <Form.Control name="cnpj" value={form.cnpj} onChange={handleChange} />
                    </Form.Group>
                    <Button type="submit" variant="primary" disabled={loading}>
                      {loading ? 'Enviando...' : 'Finalizar cadastro'}
                    </Button>
                  </Form>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default SupplierRegisterConvite;
