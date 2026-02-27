import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { faStore, faPhone, faEnvelope, faBox } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import FornecedorItens from '../admin/FornecedorItens';

interface Fornecedor {
  id: number;
  nome: string;
  contato?: string;
  meio_envio?: string;
  responsavel?: string | null;
  observacao?: string | null;
  restaurante_id: number;
  criado_em?: string;
  compartilhado_regiao?: boolean;
}

export default function FornecedoresRegiao() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [filteredFornecedores, setFilteredFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [showItensModal, setShowItensModal] = useState(false);
  const [selectedFornecedor, setSelectedFornecedor] = useState<{ id: number; nome: string } | null>(null);

  useEffect(() => {
    fetchFornecedores();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const termo = searchTerm.toLowerCase();
      const filtered = fornecedores.filter((f) =>
        f.nome.toLowerCase().includes(termo) ||
        (f.contato || '').toLowerCase().includes(termo)
      );
      setFilteredFornecedores(filtered);
    } else {
      setFilteredFornecedores(fornecedores);
    }
  }, [searchTerm, fornecedores]);

  const fetchFornecedores = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/v1/fornecedores', {
        params: { compartilhado_regiao: true }
      });
      setFornecedores(response.data);
      setFilteredFornecedores(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao buscar fornecedores.');
    } finally {
      setLoading(false);
    }
  };

  const getMeioEnvioIcon = (meio: string | undefined) => {
    const lower = (meio || '').toLowerCase();
    if (lower.includes('whatsapp')) return faWhatsapp;
    if (lower.includes('email')) return faEnvelope;
    return faPhone;
  };

  const handleViewItens = (fornecedor: Fornecedor) => {
    setSelectedFornecedor({ id: fornecedor.id, nome: fornecedor.nome });
    setShowItensModal(true);
  };

  return (
    <>
      <Container className="mt-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2>
              <FontAwesomeIcon icon={faStore} className="me-2" />
              Fornecedores da Região
            </h2>
            <p className="text-muted">
              Fornecedores disponíveis para sua região
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Row className="mb-4">
          <Col md={6}>
            <Form.Control
              type="text"
              placeholder="Buscar por nome ou contato..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Col>
        </Row>

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
            <p className="mt-2">Carregando fornecedores...</p>
          </div>
        ) : filteredFornecedores.length === 0 ? (
          <Alert variant="info">
            Nenhum fornecedor encontrado. {searchTerm && 'Tente ajustar a busca.'}
          </Alert>
        ) : (
          <Row>
            {filteredFornecedores.map((fornecedor) => (
              <Col key={fornecedor.id} md={6} lg={4} className="mb-4">
                <Card className="h-100 shadow-sm">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <h5 className="mb-0">{fornecedor.nome}</h5>
                      <Badge bg="primary">Regional</Badge>
                    </div>

                    <div className="mb-2">
                      <FontAwesomeIcon
                        icon={getMeioEnvioIcon(fornecedor.meio_envio)}
                        className="me-2 text-muted"
                      />
                      <small className="text-muted">{fornecedor.meio_envio || 'Contato direto'}</small>
                    </div>

                    <p className="mb-2">
                      <strong>Contato:</strong> {fornecedor.contato || '-'}
                    </p>

                    {fornecedor.responsavel && (
                      <p className="mb-2">
                        <strong>Responsável:</strong> {fornecedor.responsavel}
                      </p>
                    )}

                    {fornecedor.observacao && (
                      <p className="text-muted small mb-3">
                        {fornecedor.observacao}
                      </p>
                    )}
                  </Card.Body>

                  <Card.Footer className="bg-transparent">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => handleViewItens(fornecedor)}
                      className="w-100"
                    >
                      <FontAwesomeIcon icon={faBox} className="me-2" />
                      Ver Catálogo de Produtos
                    </Button>
                  </Card.Footer>
                </Card>
              </Col>
            ))}
          </Row>
        )}

        <div className="text-muted mt-3">
          <small>
            Mostrando {filteredFornecedores.length} de {fornecedores.length} fornecedores
          </small>
        </div>
      </Container>

      {selectedFornecedor && (
        <FornecedorItens
          fornecedorId={selectedFornecedor.id}
          fornecedorNome={selectedFornecedor.nome}
          show={showItensModal}
          onHide={() => {
            setShowItensModal(false);
            setSelectedFornecedor(null);
          }}
          canManage={false}
        />
      )}
    </>
  );
}
