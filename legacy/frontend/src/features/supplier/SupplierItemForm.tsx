import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { createSupplierItem, getSupplierItem, updateSupplierItem } from '../../services/supplierApi';

interface SupplierItemFormProps {
  mode: 'create' | 'edit';
}

const SupplierItemForm: React.FC<SupplierItemFormProps> = ({ mode }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nome: '',
    codigo_fornecedor: '',
    descricao: '',
    marca: '',
    unidade_medida: '',
    preco_atual: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && id) {
      getSupplierItem(Number(id))
        .then((data) => {
          setForm({
            nome: data.nome || '',
            codigo_fornecedor: data.codigo_fornecedor || '',
            descricao: data.descricao || '',
            marca: data.marca || '',
            unidade_medida: data.unidade_medida || '',
            preco_atual: data.preco_atual ?? ''
          });
        })
        .catch((err) => setError(err.response?.data?.error || 'Erro ao carregar item.'));
    }
  }, [mode, id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = { ...form, preco_atual: form.preco_atual === '' ? null : form.preco_atual };
      if (mode === 'create') {
        await createSupplierItem(payload);
      } else if (id) {
        await updateSupplierItem(Number(id), payload);
      }
      navigate('/supplier/itens');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar item.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-4">
      <Card className="shadow-sm">
        <Card.Body>
          <h3 className="mb-3">{mode === 'create' ? 'Novo Item' : 'Editar Item'}</h3>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Nome</Form.Label>
              <Form.Control name="nome" value={form.nome} onChange={handleChange} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Código do Fornecedor</Form.Label>
              <Form.Control name="codigo_fornecedor" value={form.codigo_fornecedor} onChange={handleChange} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Descrição</Form.Label>
              <Form.Control name="descricao" value={form.descricao} onChange={handleChange} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Marca</Form.Label>
              <Form.Control name="marca" value={form.marca} onChange={handleChange} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Unidade</Form.Label>
              <Form.Control name="unidade_medida" value={form.unidade_medida} onChange={handleChange} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Preço</Form.Label>
              <Form.Control name="preco_atual" value={form.preco_atual} onChange={handleChange} />
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

export default SupplierItemForm;
