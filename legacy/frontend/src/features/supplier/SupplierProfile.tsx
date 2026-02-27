import React, { useEffect, useState } from 'react';
import { Container, Card, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import { getSupplierProfile, updateSupplierProfile } from '../../services/supplierApi';

const SupplierProfile: React.FC = () => {
  const [form, setForm] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    getSupplierProfile()
      .then((data) => {
        setForm({
          nome: data.usuario?.nome || '',
          email: data.usuario?.email || '',
          nome_empresa: data.nome || '',
          telefone: data.telefone || '',
          cnpj: data.cnpj || '',
          endereco: data.endereco || '',
          cidade: data.cidade || '',
          estado: data.estado || '',
          cep: data.cep || '',
          site: data.site || '',
          contato: data.contato || '',
          meio_envio: data.meio_envio || '',
          responsavel: data.responsavel || '',
          observacao: data.observacao || ''
        });
      })
      .catch((err) => setError(err.response?.data?.error || 'Erro ao carregar perfil.'));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await updateSupplierProfile(form);
      setSuccess('Perfil atualizado com sucesso.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao atualizar perfil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-4">
      <Card className="shadow-sm">
        <Card.Body>
          <h3 className="mb-3">Meu Perfil</h3>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nome</Form.Label>
                  <Form.Control name="nome" value={form.nome || ''} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control type="email" name="email" value={form.email || ''} onChange={handleChange} />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Nome da Empresa</Form.Label>
              <Form.Control name="nome_empresa" value={form.nome_empresa || ''} onChange={handleChange} />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Telefone</Form.Label>
                  <Form.Control name="telefone" value={form.telefone || ''} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>CNPJ</Form.Label>
                  <Form.Control name="cnpj" value={form.cnpj || ''} onChange={handleChange} />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Cidade</Form.Label>
                  <Form.Control name="cidade" value={form.cidade || ''} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group className="mb-3">
                  <Form.Label>UF</Form.Label>
                  <Form.Control name="estado" value={form.estado || ''} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>CEP</Form.Label>
                  <Form.Control name="cep" value={form.cep || ''} onChange={handleChange} />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Endereço</Form.Label>
              <Form.Control name="endereco" value={form.endereco || ''} onChange={handleChange} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Site</Form.Label>
              <Form.Control name="site" value={form.site || ''} onChange={handleChange} />
            </Form.Group>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default SupplierProfile;
