'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert, Spinner, Table, Button, Form, Badge } from 'react-bootstrap';
import api from '@/lib/api';
import { Item } from 'shared';
import styles from '@/app/admin/listas/[id]/ListaDetail.module.css';

interface ItemRef {
  id: number;
  quantidadeMinima: number;
  quantidadeAtual: number;
  item: Item;
}

interface ListaDetail {
  id: number;
  nome: string;
  itensRef: ItemRef[];
}

type RascunhoMap = Record<number, number>;

function calcPedido(qtdAtual: number, qtdMinima: number): number {
  if (qtdAtual >= qtdMinima) return 0;
  return Math.max(0, qtdMinima - qtdAtual);
}

export default function CollaboratorListaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const listaId = params.id as string;

  const [lista, setLista] = useState<ListaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // qtdAtual editavel por itemRefId
  const [qtdMap, setQtdMap] = useState<RascunhoMap>({});
  // Track string values to allow partial input (e.g. "1." while typing "1.5")
  const [qtdRaw, setQtdRaw] = useState<Record<number, string>>({});

  const RASCUNHO_KEY = `rascunho-estoque-lista-${listaId}`;

  const fetchLista = useCallback(async () => {
    try {
      const { data } = await api.get(`/v1/listas/${listaId}`);
      setLista(data);

      // Carregar rascunho salvo ou usar valores atuais da API
      const rascunhoSalvo = localStorage.getItem(RASCUNHO_KEY);
      const numMap: RascunhoMap = {};
      const rawMap: Record<number, string> = {};
      if (rascunhoSalvo) {
        const parsed: RascunhoMap = JSON.parse(rascunhoSalvo);
        Object.keys(parsed).forEach((k) => {
          const id = Number(k);
          numMap[id] = parsed[id];
          rawMap[id] = String(parsed[id]);
        });
        setQtdMap(numMap);
      } else {
        (data.itensRef as ItemRef[]).forEach((ir) => {
          numMap[ir.id] = ir.quantidadeAtual ?? 0;
          rawMap[ir.id] = String(ir.quantidadeAtual ?? 0);
        });
        setQtdMap(numMap);
      }
      setQtdRaw(rawMap);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao carregar lista');
    } finally {
      setLoading(false);
    }
  }, [listaId, RASCUNHO_KEY]);

  useEffect(() => {
    fetchLista();
  }, [fetchLista]);

  const handleQtdChange = (itemRefId: number, value: string) => {
    setQtdRaw((prev) => ({ ...prev, [itemRefId]: value }));
    const num = parseFloat(value.replace(',', '.'));
    if (!isNaN(num) && num >= 0) {
      setQtdMap((prev) => ({ ...prev, [itemRefId]: num }));
    }
  };

  const summary = useMemo(() => {
    if (!lista) return { total: 0, emFalta: 0 };
    const emFalta = lista.itensRef.filter((ir) => {
      const qtd = qtdMap[ir.id] ?? ir.quantidadeAtual ?? 0;
      return qtd < ir.quantidadeMinima;
    }).length;
    return { total: lista.itensRef.length, emFalta };
  }, [lista, qtdMap]);

  const handleSalvarRascunho = () => {
    localStorage.setItem(RASCUNHO_KEY, JSON.stringify(qtdMap));
    setSuccess('Rascunho salvo localmente.');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleSubmeter = async () => {
    if (!lista) return;
    if (!confirm('Submeter a lista de estoque? Esta acao criará uma submissão para o administrador revisar.')) return;

    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      // Salvar estoque
      const itens = lista.itensRef.map((ir) => ({
        itemRefId: ir.id,
        quantidadeAtual: qtdMap[ir.id] ?? ir.quantidadeAtual ?? 0,
      }));
      await api.put(`/v1/collaborator/listas/${listaId}/estoque`, { itens });

      // Submeter lista
      await api.post(`/v1/collaborator/listas/${listaId}/submeter`);

      // Limpar rascunho após submissão bem-sucedida
      localStorage.removeItem(RASCUNHO_KEY);

      setSuccess('Lista submetida com sucesso! Redirecionando para suas submissões...');
      setTimeout(() => router.push('/collaborator/submissoes'), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao submeter lista');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  if (!lista) {
    return <Alert variant="danger">Lista não encontrada</Alert>;
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <Link href="/collaborator/listas" className={styles.backButton}>
          ← Voltar para Minhas Listas
        </Link>

        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <h1 className={styles.listTitle}>{lista.nome}</h1>
            <div className={styles.listMeta}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Itens:</span>
                {lista.itensRef.length}
              </div>
            </div>
          </div>
          <div className={styles.headerActions}>
            <Button
              variant="outline-secondary"
              onClick={handleSalvarRascunho}
              disabled={submitting}
            >
              Salvar Rascunho
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmeter}
              disabled={submitting}
            >
              {submitting ? <><Spinner animation="border" size="sm" /> Submetendo...</> : 'Submeter Lista'}
            </Button>
          </div>
        </div>

        {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

        <div className={styles.tableSection}>
          <h2 className={styles.sectionTitle}>Preencher Estoque</h2>

          {/* Resumo */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Badge bg="info" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
              Total: {summary.total}
            </Badge>
            <Badge bg={summary.emFalta > 0 ? 'danger' : 'success'} style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
              Em falta / abaixo do mínimo: {summary.emFalta}
            </Badge>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Itens em <strong style={{ color: '#856404' }}>amarelo</strong> ou <strong style={{ color: '#842029' }}>vermelho</strong> estão abaixo da quantidade mínima.
            </span>
          </div>

          <div className={styles.tableWrapper}>
            <Table bordered hover responsive className={styles.table}>
              <thead>
                <tr className={styles.tableHeader}>
                  <th className={styles.tableHeaderCell}>Item</th>
                  <th className={styles.tableHeaderCell}>Unidade</th>
                  <th className={styles.tableHeaderCell}>Qtd Min</th>
                  <th className={styles.tableHeaderCell}>Qtd Atual</th>
                  <th className={styles.tableHeaderCell}>Pedido</th>
                </tr>
              </thead>
              <tbody>
                {lista.itensRef.map((ir) => {
                  const qtdAtual = qtdMap[ir.id] ?? ir.quantidadeAtual ?? 0;
                  const pedido = calcPedido(qtdAtual, ir.quantidadeMinima);
                  const baixo = qtdAtual < ir.quantidadeMinima;
                  const muitoBaixo = qtdAtual === 0 && ir.quantidadeMinima > 0;
                  const rowBg = muitoBaixo
                    ? '#f8d7da'
                    : baixo
                    ? '#fff3cd'
                    : undefined;

                  return (
                    <tr
                      key={ir.id}
                      className={styles.tableRow}
                      style={{ backgroundColor: rowBg }}
                    >
                      <td className={`${styles.tableCell} ${styles.cellBold}`}>{ir.item.nome}</td>
                      <td className={styles.tableCell}>{ir.item.unidadeMedida}</td>
                      <td className={styles.tableCell}>{ir.quantidadeMinima}</td>
                      <td className={styles.tableCell} style={{ minWidth: '120px' }}>
                        <Form.Control
                          type="text"
                          inputMode="decimal"
                          value={qtdRaw[ir.id] ?? String(qtdAtual)}
                          onChange={(e) => handleQtdChange(ir.id, e.target.value)}
                          style={{
                            borderColor: muitoBaixo ? '#dc3545' : baixo ? '#ffc107' : undefined,
                          }}
                        />
                      </td>
                      <td className={styles.tableCell} style={{ textAlign: 'center' }}>
                        {pedido > 0 ? (
                          <Badge bg="danger">{pedido}</Badge>
                        ) : (
                          <Badge bg="success">0</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {lista.itensRef.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-4">
                      Nenhum item na lista
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
            <Button
              variant="outline-secondary"
              onClick={handleSalvarRascunho}
              disabled={submitting}
            >
              Salvar Rascunho
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmeter}
              disabled={submitting}
            >
              {submitting ? <><Spinner animation="border" size="sm" /> Submetendo...</> : 'Submeter Lista'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
