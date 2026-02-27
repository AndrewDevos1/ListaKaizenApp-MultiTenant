'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import api from '@/lib/api';
import { FaHistory, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface AppLog {
  id: number;
  acao: string;
  entidade: string | null;
  entidadeId: number | null;
  usuarioId: number | null;
  restauranteId: number | null;
  criadoEm: string;
  detalhes?: Record<string, unknown> | null;
}

interface LogsResponse {
  data: AppLog[];
  total: number;
  page: number;
  pages: number;
}

const LIMIT = 50;

function formatarData(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return isoString;
  }
}

function acaoBadgeVariant(acao: string): string {
  const lower = acao.toLowerCase();
  if (lower.includes('create') || lower.includes('criar')) return 'success';
  if (lower.includes('delete') || lower.includes('excluir') || lower.includes('remover')) return 'danger';
  if (lower.includes('update') || lower.includes('atualiz') || lower.includes('edit')) return 'warning';
  return 'secondary';
}

export default function LogsPage() {
  const [logs, setLogs] = useState<AppLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = async (p: number) => {
    try {
      setLoading(true);
      setError('');
      const { data } = await api.get<LogsResponse>('/v1/admin/logs', {
        params: { page: p, limit: LIMIT },
      });
      setLogs(data.data);
      setTotalPages(data.pages);
      setTotal(data.total);
      setPage(data.page);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, []);

  const handleAnterior = () => {
    if (page > 1) fetchLogs(page - 1);
  };

  const handleProxima = () => {
    if (page < totalPages) fetchLogs(page + 1);
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
        }}
      >
        <h2 style={{ margin: 0 }}>
          <FaHistory className="me-2" style={{ color: '#667eea' }} />
          Logs do Sistema
        </h2>
        <span className="text-muted" style={{ fontSize: '0.9rem' }}>
          {total} registro{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
        </span>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : logs.length === 0 ? (
        <Alert variant="info">Nenhum log encontrado.</Alert>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Acao</th>
                  <th>Entidade</th>
                  <th>ID Entidade</th>
                  <th>Usuario ID</th>
                  <th>Restaurante ID</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                      {formatarData(log.criadoEm)}
                    </td>
                    <td>
                      <Badge bg={acaoBadgeVariant(log.acao)}>{log.acao}</Badge>
                    </td>
                    <td>{log.entidade ?? <span className="text-muted">—</span>}</td>
                    <td>{log.entidadeId ?? <span className="text-muted">—</span>}</td>
                    <td>{log.usuarioId ?? <span className="text-muted">—</span>}</td>
                    <td>{log.restauranteId ?? <span className="text-muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          {/* Paginacao */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              marginTop: '1rem',
            }}
          >
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={handleAnterior}
              disabled={page <= 1}
            >
              <FaChevronLeft className="me-1" /> Anterior
            </Button>
            <span style={{ fontSize: '0.9rem' }}>
              Pagina {page} de {totalPages}
            </span>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={handleProxima}
              disabled={page >= totalPages}
            >
              Proxima <FaChevronRight className="ms-1" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
