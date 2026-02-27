import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Table, Alert } from 'react-bootstrap';
import { getFornecedorDetails, getFornecedorItens } from '../../services/supplierApi';

const DetalhesFornecedorCadastrado: React.FC = () => {
  const { fornecedorId } = useParams<{ fornecedorId: string }>();
  const [fornecedor, setFornecedor] = useState<any | null>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!fornecedorId) return;
    Promise.all([
      getFornecedorDetails(Number(fornecedorId)),
      getFornecedorItens(Number(fornecedorId))
    ])
      .then(([info, itensData]) => {
        setFornecedor(info);
        setItens(Array.isArray(itensData) ? itensData : []);
      })
      .catch((err) => setError(err.response?.data?.error || 'Erro ao carregar fornecedor.'));
  }, [fornecedorId]);

  return (
    <div className="container py-4">
      {error && <Alert variant="danger">{error}</Alert>}
      {fornecedor && (
        <Card className="mb-3">
          <Card.Body>
            <h4>{fornecedor.nome}</h4>
            <p className="mb-1">Telefone: {fornecedor.telefone || '-'}</p>
            <p className="mb-1">CNPJ: {fornecedor.cnpj || '-'}</p>
          </Card.Body>
        </Card>
      )}
      <Card>
        <Card.Body>
          <h5>Itens</h5>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Unidade</th>
                <th>Preço</th>
              </tr>
            </thead>
            <tbody>
              {itens.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center">Sem itens.</td>
                </tr>
              ) : itens.map((item) => (
                <tr key={item.id}>
                  <td>{item.nome}</td>
                  <td>{item.unidade_medida}</td>
                  <td>{item.preco_atual ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
};

export default DetalhesFornecedorCadastrado;
