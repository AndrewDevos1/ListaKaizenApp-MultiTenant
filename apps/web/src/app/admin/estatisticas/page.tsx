'use client';

import { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Table, Badge, Spinner, Alert, Form } from 'react-bootstrap';
import { FaChartBar, FaBoxes, FaExclamationTriangle, FaCheckCircle, FaListAlt, FaSync } from 'react-icons/fa';
import api from '@/lib/api';

interface EstatisticasData {
  resumo: {
    totalListas: number;
    totalItens: number;
    itensOk: number;
    itensFaltantes: number;
  };
  submissoesPorStatus: Record<string, number>;
  itens: Array<{
    itemId: number;
    itemNome: string;
    unidade: string;
    listaId: number;
    listaNome: string;
    quantidadeAtual: number;
    quantidadeMinima: number;
  }>;
}

type Situacao = 'falta' | 'quase_acabando' | 'precisa_comprar' | 'completo' | 'excesso';

function getSituacao(atual: number, minimo: number): Situacao {
  if (minimo === 0) return 'excesso';
  if (atual === 0) return 'falta';
  const ratio = atual / minimo;
  if (ratio < 0.25) return 'quase_acabando';
  if (ratio < 1.0) return 'precisa_comprar';
  if (ratio < 1.5) return 'completo';
  return 'excesso';
}

const SITUACAO_CONFIG: Record<Situacao, { label: string; bg: string }> = {
  falta: { label: 'Falta', bg: 'danger' },
  quase_acabando: { label: 'Quase acabando', bg: 'warning' },
  precisa_comprar: { label: 'Precisa comprar', bg: 'info' },
  completo: { label: 'Completo', bg: 'success' },
  excesso: { label: 'Em excesso', bg: 'secondary' },
};

export default function EstatisticasPage() {
  const [data, setData] = useState<EstatisticasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [situacaoFilter, setSituacaoFilter] = useState<string>('');

  const loadData = () => {
    setLoading(true);
    setError('');
    api.get('/v1/items/estatisticas')
      .then((r) => setData(r.data))
      .catch(() => setError('Erro ao carregar estatísticas'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const filteredItens = useMemo(() => {
    if (!data) return [];
    let result = data.itens;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((i) => i.itemNome.toLowerCase().includes(q) || i.listaNome.toLowerCase().includes(q));
    }
    if (situacaoFilter) {
      result = result.filter((i) => getSituacao(i.quantidadeAtual, i.quantidadeMinima) === situacaoFilter);
    }
    return result;
  }, [data, search, situacaoFilter]);

  if (loading) return (
    <Container className="py-4 text-center">
      <Spinner animation="border" variant="primary" />
      <p className="mt-2">Carregando estatísticas...</p>
    </Container>
  );

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <h2 className="mb-0"><FaChartBar className="me-2" />Estatísticas de Estoque</h2>
        <button className="btn btn-outline-secondary btn-sm" onClick={loadData} disabled={loading}>
          <FaSync className="me-1" /> Atualizar
        </button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {data && (
        <>
          {/* Cards de Resumo */}
          <Row className="g-3 mb-4">
            <Col sm={6} md={3}>
              <Card className="text-center shadow-sm h-100">
                <Card.Body>
                  <FaListAlt size={28} className="text-primary mb-2" />
                  <div className="fs-2 fw-bold">{data.resumo.totalListas}</div>
                  <div className="text-muted small">Listas Ativas</div>
                </Card.Body>
              </Card>
            </Col>
            <Col sm={6} md={3}>
              <Card className="text-center shadow-sm h-100">
                <Card.Body>
                  <FaBoxes size={28} className="text-info mb-2" />
                  <div className="fs-2 fw-bold">{data.resumo.totalItens}</div>
                  <div className="text-muted small">Total de Itens</div>
                </Card.Body>
              </Card>
            </Col>
            <Col sm={6} md={3}>
              <Card className="text-center shadow-sm h-100">
                <Card.Body>
                  <FaCheckCircle size={28} className="text-success mb-2" />
                  <div className="fs-2 fw-bold">{data.resumo.itensOk}</div>
                  <div className="text-muted small">Itens em Dia</div>
                </Card.Body>
              </Card>
            </Col>
            <Col sm={6} md={3}>
              <Card className="text-center shadow-sm h-100">
                <Card.Body>
                  <FaExclamationTriangle size={28} className="text-danger mb-2" />
                  <div className="fs-2 fw-bold">{data.resumo.itensFaltantes}</div>
                  <div className="text-muted small">
                    Itens Faltantes
                    {data.resumo.totalItens > 0 && (
                      <span className="d-block text-danger fw-bold">
                        {Math.round((data.resumo.itensFaltantes / data.resumo.totalItens) * 100)}%
                      </span>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Status de Submissões */}
          {Object.keys(data.submissoesPorStatus).length > 0 && (
            <Card className="mb-4 shadow-sm">
              <Card.Header><strong>Submissões por Status</strong></Card.Header>
              <Card.Body className="d-flex gap-3 flex-wrap">
                {Object.entries(data.submissoesPorStatus).map(([status, count]) => (
                  <div key={status} className="text-center">
                    <Badge bg={status === 'PENDENTE' ? 'warning' : status === 'APROVADO' ? 'success' : status === 'REJEITADO' ? 'danger' : 'info'} className="px-3 py-2 fs-6">
                      {count}
                    </Badge>
                    <div className="text-muted small mt-1">{status}</div>
                  </div>
                ))}
              </Card.Body>
            </Card>
          )}

          {/* Tabela de Itens */}
          <Card className="shadow-sm">
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <strong>Itens por Lista</strong>
                <div className="d-flex gap-2 flex-wrap">
                  <Form.Control
                    size="sm"
                    placeholder="Buscar item ou lista..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ width: 200 }}
                  />
                  <Form.Select
                    size="sm"
                    value={situacaoFilter}
                    onChange={(e) => setSituacaoFilter(e.target.value)}
                    style={{ width: 180 }}
                  >
                    <option value="">Todas as situações</option>
                    {Object.entries(SITUACAO_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </Form.Select>
                </div>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              <Table hover responsive className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Item</th>
                    <th>Lista</th>
                    <th>Unidade</th>
                    <th className="text-center">Qtd Atual</th>
                    <th className="text-center">Qtd Mínima</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItens.length === 0 ? (
                    <tr><td colSpan={6} className="text-center text-muted py-4">Nenhum item encontrado</td></tr>
                  ) : filteredItens.map((item, idx) => {
                    const sit = getSituacao(item.quantidadeAtual, item.quantidadeMinima);
                    const cfg = SITUACAO_CONFIG[sit];
                    return (
                      <tr key={idx}>
                        <td><strong>{item.itemNome}</strong></td>
                        <td className="text-muted">{item.listaNome}</td>
                        <td><Badge bg="secondary">{item.unidade}</Badge></td>
                        <td className="text-center">{item.quantidadeAtual}</td>
                        <td className="text-center">{item.quantidadeMinima}</td>
                        <td><Badge bg={cfg.bg}>{cfg.label}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </>
      )}
    </Container>
  );
}
