import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { registerSupplier } from '../../services/supplierApi';

const SupplierRegister: React.FC = () => {
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await registerSupplier(form);
      setSuccess(response.message || 'Cadastro realizado. Aguarde aprovação.');
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
                <h3 className="mb-3">Cadastro de Fornecedor</h3>
                {error && <Alert variant="danger">{error}</Alert>}
                {success && <Alert variant="success">{success}</Alert>}
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
                  <Form.Group className="mb-3">
                    <Form.Label>Endereço</Form.Label>
                    <Form.Control name="endereco" value={form.endereco} onChange={handleChange} />
                  </Form.Group>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Cidade</Form.Label>
                        <Form.Control name="cidade" value={form.cidade} onChange={handleChange} />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>UF</Form.Label>
                        <Form.Control name="estado" value={form.estado} onChange={handleChange} maxLength={2} />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>CEP</Form.Label>
                        <Form.Control name="cep" value={form.cep} onChange={handleChange} />
                      </Form.Group>
                    </Col>
                  </Row>
                  <Form.Group className="mb-3">
                    <Form.Label>Site</Form.Label>
                    <Form.Control name="site" value={form.site} onChange={handleChange} />
                  </Form.Group>
                  <Button type="submit" variant="primary" disabled={loading}>
                    {loading ? 'Enviando...' : 'Cadastrar'}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default SupplierRegister;
