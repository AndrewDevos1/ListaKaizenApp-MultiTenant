import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Alert } from 'react-bootstrap';
import { getSupplierItems } from '../../services/supplierApi';

const SupplierDashboard: React.FC = () => {
  const [itemsCount, setItemsCount] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    getSupplierItems()
      .then((items) => setItemsCount(Array.isArray(items) ? items.length : 0))
      .catch((err) => setError(err.response?.data?.error || 'Erro ao carregar dados.'));
  }, []);

  return (
    <div className="container py-4">
      <h2 className="mb-4">Dashboard do Fornecedor</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      <Row>
        <Col md={4}>
          <Card className="shadow-sm">
            <Card.Body>
              <h6 className="text-muted">Total de Itens</h6>
              <h3>{itemsCount}</h3>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SupplierDashboard;
