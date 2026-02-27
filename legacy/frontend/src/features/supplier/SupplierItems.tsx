import React, { useEffect, useState } from 'react';
import { Button, Table, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { deleteSupplierItem, getSupplierItems } from '../../services/supplierApi';

const SupplierItems: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState('');

  const loadItems = () => {
    getSupplierItems()
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.response?.data?.error || 'Erro ao carregar itens.'));
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleDelete = async (itemId: number) => {
    if (!window.confirm('Deseja excluir este item?')) return;
    try {
      await deleteSupplierItem(itemId);
      loadItems();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao excluir item.');
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Meus Itens</h3>
        <Link to="/supplier/itens/novo" className="btn btn-primary">Novo Item</Link>
      </div>
      {error && <Alert variant="danger">{error}</Alert>}
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Marca</th>
            <th>Unidade</th>
            <th>Preço</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center">Nenhum item cadastrado.</td>
            </tr>
          ) : items.map((item) => (
            <tr key={item.id}>
              <td>{item.nome}</td>
              <td>{item.marca || '-'}</td>
              <td>{item.unidade_medida}</td>
              <td>{item.preco_atual ?? '-'}</td>
              <td className="d-flex gap-2">
                <Link to={`/supplier/itens/${item.id}/editar`} className="btn btn-sm btn-outline-secondary">Editar</Link>
                <Link to={`/supplier/itens/${item.id}/historico`} className="btn btn-sm btn-outline-info">Histórico</Link>
                <Button size="sm" variant="outline-danger" onClick={() => handleDelete(item.id)}>Excluir</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default SupplierItems;
