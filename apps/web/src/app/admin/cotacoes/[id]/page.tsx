'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Table, Alert, Spinner, Badge, Button, Form } from 'react-bootstrap';
import api from '@/lib/api';
import styles from '@/app/admin/listas/[id]/ListaDetail.module.css';
import { FaFileInvoiceDollar, FaLock } from 'react-icons/fa';

interface CotacaoItem {
  id: number;
  qtdSolicitada: number;
  precoUnitario: number | null;
  item: { id: number; nome: string; unidadeMedida: string };
  fornecedor: { id: number; nome: string } | null;
}

interface CotacaoDetail {
  id: number;
  titulo: string | null;
  status: 'ABERTA' | 'FECHADA';
  criadoEm: string;
  itens: CotacaoItem[];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function CotacaoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const cotacaoId = params.id as string;

  const [cotacao, setCotacao] = useState<CotacaoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingItemId, setSavingItemId] = useState<number | null>(null);
  const [fechando, setFechando] = useState(false);

  // Local price map for controlled inputs
  const [precos, setPrecos] = useState<Record<number, string>>({});

  const fetchCotacao = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/v1/admin/cotacoes/${cotacaoId}`);
      setCotacao(data);
      // Initialize price inputs
      const initial: Record<number, string> = {};
      (data.itens as CotacaoItem[]).forEach((item) => {
        initial[item.id] = item.precoUnitario != null ? String(item.precoUnitario) : '';
      });
      setPrecos(initial);
    } catch {
      setError('Erro ao carregar cotação');
    } finally {
      setLoading(false);
    }
  }, [cotacaoId]);

  useEffect(() => {
    fetchCotacao();
  }, [fetchCotacao]);

  const handlePrecoBlur = async (itemId: number) => {
    const rawValue = precos[itemId];
    const value = parseFloat(rawValue.replace(',', '.'));
    if (isNaN(value) || value < 0) return;

    setSavingItemId(itemId);
    try {
      await api.put(`/v1/admin/cotacao-itens/${itemId}`, { precoUnitario: value });
      // Update local state
      setCotacao((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          itens: prev.itens.map((it) =>
            it.id === itemId ? { ...it, precoUnitario: value } : it,
          ),
        };
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao salvar preço');
    } finally {
      setSavingItemId(null);
    }
  };

  const handleFechar = async () => {
    if (!confirm('Fechar esta cotação? Esta ação não pode ser desfeita.')) return;
    setFechando(true);
    try {
      await api.put(`/v1/admin/cotacoes/${cotacaoId}/fechar`);
      fetchCotacao();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao fechar cotação');
    } finally {
      setFechando(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  if (!cotacao) {
    return <Alert variant="danger">Cotação não encontrada</Alert>;
  }

  // Compute total
  const totalEstimado = cotacao.itens.reduce((acc, item) => {
    if (item.precoUnitario != null) {
      return acc + item.precoUnitario * item.qtdSolicitada;
    }
    return acc;
  }, 0);

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <Link href="/admin/cotacoes" className={styles.backButton}>
          ← Voltar para Cotações
        </Link>

        {/* Cabeçalho */}
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <h1 className={styles.listTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FaFileInvoiceDollar />
              {cotacao.titulo || 'Sem título'}
            </h1>
            <div className={styles.listMeta}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Data:</span>
                {formatDate(cotacao.criadoEm)}
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Status:</span>
                <Badge bg={cotacao.status === 'ABERTA' ? 'warning' : 'secondary'} style={{ fontSize: '0.9rem' }}>
                  {cotacao.status}
                </Badge>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Total estimado:</span>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1.1rem' }}>
                  {formatCurrency(totalEstimado)}
                </strong>
              </div>
            </div>
          </div>
          <div className={styles.headerActions}>
            {cotacao.status === 'ABERTA' && (
              <Button variant="outline-secondary" onClick={handleFechar} disabled={fechando}>
                {fechando ? <Spinner animation="border" size="sm" /> : (
                  <><FaLock style={{ marginRight: '0.4rem' }} />Fechar Cotação</>
                )}
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Tabela de Itens */}
        <div className={styles.tableSection}>
          <h2 className={styles.sectionTitle}>
            Itens ({cotacao.itens.length})
          </h2>
          <div className={styles.tableWrapper}>
            <Table striped bordered hover responsive className={styles.table}>
              <thead>
                <tr className={styles.tableHeader}>
                  <th className={styles.tableHeaderCell}>Item</th>
                  <th className={styles.tableHeaderCell}>Unidade</th>
                  <th className={styles.tableHeaderCell}>Fornecedor</th>
                  <th className={styles.tableHeaderCell}>Qtd Solicitada</th>
                  <th className={styles.tableHeaderCell}>Preço Unitário (R$)</th>
                  <th className={styles.tableHeaderCell}>Total Linha</th>
                </tr>
              </thead>
              <tbody>
                {cotacao.itens.map((item) => {
                  const preco = item.precoUnitario;
                  const totalLinha = preco != null ? preco * item.qtdSolicitada : null;
                  return (
                    <tr key={item.id} className={styles.tableRow}>
                      <td className={`${styles.tableCell} ${styles.cellBold}`}>{item.item.nome}</td>
                      <td className={styles.tableCell}>{item.item.unidadeMedida}</td>
                      <td className={styles.tableCell}>
                        {item.fornecedor ? item.fornecedor.nome : <span className="text-muted fst-italic">—</span>}
                      </td>
                      <td className={styles.tableCell}>{item.qtdSolicitada}</td>
                      <td className={styles.tableCell} style={{ minWidth: '9rem' }}>
                        {cotacao.status === 'ABERTA' ? (
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Form.Control
                              type="number"
                              min={0}
                              step="0.01"
                              size="sm"
                              value={precos[item.id] ?? ''}
                              onChange={(e) =>
                                setPrecos((prev) => ({ ...prev, [item.id]: e.target.value }))
                              }
                              onBlur={() => handlePrecoBlur(item.id)}
                              disabled={savingItemId === item.id}
                              style={{ maxWidth: '7rem' }}
                            />
                            {savingItemId === item.id && (
                              <Spinner animation="border" size="sm" />
                            )}
                          </div>
                        ) : (
                          preco != null ? formatCurrency(preco) : <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className={styles.tableCell}>
                        {totalLinha != null ? formatCurrency(totalLinha) : <span className="text-muted">—</span>}
                      </td>
                    </tr>
                  );
                })}
                {cotacao.itens.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">
                      Nenhum item nesta cotação
                    </td>
                  </tr>
                )}
              </tbody>
              {cotacao.itens.length > 0 && (
                <tfoot>
                  <tr style={{ backgroundColor: 'var(--bg-secondary)', fontWeight: 700 }}>
                    <td colSpan={5} className={styles.tableCell} style={{ textAlign: 'right' }}>
                      Total Geral:
                    </td>
                    <td className={styles.tableCell}>
                      {formatCurrency(totalEstimado)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
