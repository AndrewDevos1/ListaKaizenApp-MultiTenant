'use client';

import { useState, useEffect, useMemo } from 'react';
import { Container, Table, Form, Spinner, Alert, Badge } from 'react-bootstrap';
import { FaBook, FaSearch } from 'react-icons/fa';
import api from '@/lib/api';

interface Item {
  id: number;
  nome: string;
  unidadeMedida: string;
  ativo: boolean;
  fornecedor: { id: number; nome: string } | null;
}

export default function CatalogoGlobal() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/v1/items')
      .then((r) => setItems(r.data))
      .catch(() => setError('Erro ao carregar catálogo'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) => i.nome.toLowerCase().includes(q) || i.unidadeMedida.toLowerCase().includes(q),
    );
  }, [items, search]);

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="mb-1"><FaBook className="me-2" />Catálogo Global</h2>
          <p className="text-muted mb-0">
            Todos os itens cadastrados no catálogo ({items.length} no total)
          </p>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <div style={{ maxWidth: 400 }} className="mb-3">
        <div className="input-group">
          <span className="input-group-text"><FaSearch /></span>
          <Form.Control
            placeholder="Buscar por nome ou unidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {search && <small className="text-muted">{filtered.length} resultado(s)</small>}
      </div>

      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" /></div>
      ) : (
        <Table hover responsive>
          <thead className="table-light">
            <tr>
              <th>#</th>
              <th>Nome</th>
              <th>Unidade</th>
              <th>Fornecedor</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center text-muted py-4">Nenhum item encontrado</td></tr>
            ) : filtered.map((item) => (
              <tr key={item.id}>
                <td className="text-muted">{item.id}</td>
                <td><strong>{item.nome}</strong></td>
                <td><Badge bg="secondary">{item.unidadeMedida}</Badge></td>
                <td>{item.fornecedor?.nome ?? <span className="text-muted">—</span>}</td>
                <td>
                  <Badge bg={item.ativo ? 'success' : 'secondary'}>
                    {item.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Container>
  );
}
