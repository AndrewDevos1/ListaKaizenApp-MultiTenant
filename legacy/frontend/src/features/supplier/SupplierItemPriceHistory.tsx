import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Table, Alert } from 'react-bootstrap';
import { getItemPriceHistory } from '../../services/supplierApi';

const SupplierItemPriceHistory: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [history, setHistory] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getItemPriceHistory(Number(id))
      .then((data) => setHistory(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.response?.data?.error || 'Erro ao carregar histórico.'));
  }, [id]);

  return (
    <div className="container py-4">
      <h3 className="mb-3">Histórico de Preços</h3>
      {error && <Alert variant="danger">{error}</Alert>}
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Alterado em</th>
            <th>Preço Anterior</th>
            <th>Preço Novo</th>
            <th>Observação</th>
          </tr>
        </thead>
        <tbody>
          {history.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-center">Sem histórico.</td>
            </tr>
          ) : history.map((item) => (
            <tr key={item.id}>
              <td>{item.alterado_em}</td>
              <td>{item.preco_anterior ?? '-'}</td>
              <td>{item.preco_novo}</td>
              <td>{item.observacao || '-'}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default SupplierItemPriceHistory;
