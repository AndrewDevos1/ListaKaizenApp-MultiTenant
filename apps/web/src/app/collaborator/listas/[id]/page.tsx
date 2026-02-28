'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Alert,
  Spinner,
  Table,
  Button,
  Form,
  Modal,
} from 'react-bootstrap';
import api from '@/lib/api';
import styles from './EstoqueLista.module.css';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface ItemRef {
  id: number;
  quantidadeMinima: number;
  quantidadeAtual: number;
  usaThreshold: boolean;
  qtdFardo: number | null;
  item: { id: number; nome: string; unidadeMedida: string };
}

interface ListaDetail {
  id: number;
  nome: string;
  itensRef: ItemRef[];
}

type RascunhoMap = Record<number, number>;
type SortField = 'nome' | 'unidade' | 'qtdMin' | 'qtdAtual' | 'pedido';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcPedido(ref: ItemRef, qtdAtual: number): number {
  if (qtdAtual >= ref.quantidadeMinima) return 0;
  if (ref.usaThreshold && ref.qtdFardo) return ref.qtdFardo;
  return Math.max(0, ref.quantidadeMinima - qtdAtual);
}

function parseQtd(raw: string): number | null {
  const s = raw.replace(',', '.').trim();
  if (/^[\d\s+\-*/. ]+$/.test(s)) {
    try {
      // eslint-disable-next-line no-new-func
      const result = Function('"use strict"; return (' + s + ')')();
      if (typeof result === 'number' && isFinite(result) && result >= 0)
        return result;
    } catch {
      /* inválido */
    }
  }
  const n = parseFloat(s);
  return !isNaN(n) && n >= 0 ? n : null;
}

function normalizeStr(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CollaboratorListaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const listaId = params.id as string;

  const [lista, setLista] = useState<ListaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Qtd editável por itemRefId
  const [qtdMap, setQtdMap] = useState<RascunhoMap>({});
  const [qtdRaw, setQtdRaw] = useState<Record<number, string>>({});

  // Baseline para calcular badge "Alterados"
  const [baseline, setBaseline] = useState<Record<number, number>>({});

  // Filtro e ordenação
  const [filterNome, setFilterNome] = useState('');
  const [sortField, setSortField] = useState<SortField>('nome');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Modais
  const [showSuccess, setShowSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [showSugerir, setShowSugerir] = useState(false);
  const [sugerirNome, setSugerirNome] = useState('');
  const [sugerirUnidade, setSugerirUnidade] = useState('Un');
  const [sugerirLoading, setSugerirLoading] = useState(false);
  const [sugerirBanner, setSugerirBanner] = useState('');

  const RASCUNHO_KEY = `rascunho-estoque-lista-${listaId}`;

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const fetchLista = useCallback(async () => {
    try {
      const { data } = await api.get(`/v1/listas/${listaId}`);
      setLista(data);

      const numMap: RascunhoMap = {};
      const rawMap: Record<number, string> = {};
      const baseMap: Record<number, number> = {};

      const rascunhoSalvo = localStorage.getItem(RASCUNHO_KEY);
      if (rascunhoSalvo) {
        const parsed: RascunhoMap = JSON.parse(rascunhoSalvo);
        (data.itensRef as ItemRef[]).forEach((ir) => {
          const saved = parsed[ir.id];
          const val = saved !== undefined ? saved : (ir.quantidadeAtual ?? 0);
          numMap[ir.id] = val;
          rawMap[ir.id] = String(val);
          baseMap[ir.id] = ir.quantidadeAtual ?? 0;
        });
      } else {
        (data.itensRef as ItemRef[]).forEach((ir) => {
          const val = ir.quantidadeAtual ?? 0;
          numMap[ir.id] = val;
          rawMap[ir.id] = String(val);
          baseMap[ir.id] = val;
        });
      }

      setQtdMap(numMap);
      setQtdRaw(rawMap);
      setBaseline(baseMap);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao carregar lista');
    } finally {
      setLoading(false);
    }
  }, [listaId, RASCUNHO_KEY]);

  useEffect(() => {
    fetchLista();
  }, [fetchLista]);

  // ─── Auto-save rascunho (debounce 400ms) ──────────────────────────────────

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(RASCUNHO_KEY, JSON.stringify(qtdMap));
    }, 400);
    return () => clearTimeout(timer);
  }, [qtdMap, RASCUNHO_KEY]);

  // ─── Input handler ────────────────────────────────────────────────────────

  const handleInput = (id: number, value: string) => {
    setQtdRaw((prev) => ({ ...prev, [id]: value }));
    const parsed = parseQtd(value);
    if (parsed !== null) {
      setQtdMap((prev) => ({ ...prev, [id]: parsed }));
    }
  };

  // Resolve expressão ao sair do campo (blur / Enter)
  const handleResolveExpr = (id: number, value: string) => {
    const parsed = parseQtd(value);
    if (parsed !== null && value !== String(parsed)) {
      setQtdRaw((prev) => ({ ...prev, [id]: String(parsed) }));
      setQtdMap((prev) => ({ ...prev, [id]: parsed }));
    }
  };

  // Android: keyup captura Enter corretamente
  const handleKeyUp = (
    e: React.KeyboardEvent<HTMLInputElement>,
    id: number,
  ) => {
    if (e.key !== 'Enter') return;
    handleResolveExpr(id, e.currentTarget.value);
    // Avança para próximo input
    const inputs = Array.from(
      document.querySelectorAll<HTMLInputElement>('[data-estoque-input="true"]'),
    );
    const idx = inputs.indexOf(e.currentTarget);
    inputs[idx + 1]?.focus();
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    id: number,
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleResolveExpr(id, e.currentTarget.value);
      const inputs = Array.from(
        document.querySelectorAll<HTMLInputElement>(
          '[data-estoque-input="true"]',
        ),
      );
      const idx = inputs.indexOf(e.currentTarget);
      inputs[idx + 1]?.focus();
    }
  };

  // ─── Summary ──────────────────────────────────────────────────────────────

  const summary = useMemo(() => {
    if (!lista) return { total: 0, emFalta: 0, alterados: 0 };
    const total = lista.itensRef.length;
    const emFalta = lista.itensRef.filter(
      (ir) => calcPedido(ir, qtdMap[ir.id] ?? ir.quantidadeAtual) > 0,
    ).length;
    const alterados = lista.itensRef.filter(
      (ir) => (qtdMap[ir.id] ?? ir.quantidadeAtual) !== baseline[ir.id],
    ).length;
    return { total, emFalta, alterados };
  }, [lista, qtdMap, baseline]);

  // ─── Filtered + sorted itens ──────────────────────────────────────────────

  const displayedItens = useMemo(() => {
    if (!lista) return [];

    const filter = normalizeStr(filterNome);
    let itens = lista.itensRef.filter((ir) =>
      normalizeStr(ir.item.nome).includes(filter),
    );

    itens = [...itens].sort((a, b) => {
      let valA: string | number;
      let valB: string | number;

      switch (sortField) {
        case 'nome':
          valA = a.item.nome;
          valB = b.item.nome;
          break;
        case 'unidade':
          valA = a.item.unidadeMedida;
          valB = b.item.unidadeMedida;
          break;
        case 'qtdMin':
          valA = a.quantidadeMinima;
          valB = b.quantidadeMinima;
          break;
        case 'qtdAtual':
          valA = qtdMap[a.id] ?? a.quantidadeAtual;
          valB = qtdMap[b.id] ?? b.quantidadeAtual;
          break;
        case 'pedido':
          valA = calcPedido(a, qtdMap[a.id] ?? a.quantidadeAtual);
          valB = calcPedido(b, qtdMap[b.id] ?? b.quantidadeAtual);
          break;
        default:
          valA = a.item.nome;
          valB = b.item.nome;
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        const cmp = valA.localeCompare(valB, 'pt-BR', { sensitivity: 'base' });
        return sortDir === 'asc' ? cmp : -cmp;
      }
      const cmp = (valA as number) - (valB as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return itens;
  }, [lista, filterNome, sortField, sortDir, qtdMap]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return <span className="ms-1">{sortDir === 'asc' ? '▲' : '▼'}</span>;
  };

  // ─── Salvar rascunho ──────────────────────────────────────────────────────

  const handleSalvarRascunho = async () => {
    if (!lista) return;
    try {
      const itens = lista.itensRef.map((ir) => ({
        itemRefId: ir.id,
        quantidadeAtual: qtdMap[ir.id] ?? ir.quantidadeAtual ?? 0,
      }));
      await api.put(`/v1/collaborator/listas/${listaId}/estoque`, { itens });
      localStorage.setItem(RASCUNHO_KEY, JSON.stringify(qtdMap));
      // Atualiza baseline após salvar
      const newBaseline: Record<number, number> = {};
      lista.itensRef.forEach((ir) => {
        newBaseline[ir.id] = qtdMap[ir.id] ?? ir.quantidadeAtual;
      });
      setBaseline(newBaseline);
      setError('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao salvar rascunho');
    }
  };

  // ─── Submeter ─────────────────────────────────────────────────────────────

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleSubmeter = async () => {
    if (!lista) return;
    setError('');
    setSubmitting(true);
    try {
      const itens = lista.itensRef.map((ir) => ({
        itemRefId: ir.id,
        quantidadeAtual: qtdMap[ir.id] ?? ir.quantidadeAtual ?? 0,
      }));
      await api.put(`/v1/collaborator/listas/${listaId}/estoque`, { itens });
      await api.post(`/v1/collaborator/listas/${listaId}/submeter`);

      localStorage.removeItem(RASCUNHO_KEY);

      setCountdown(5);
      setShowSuccess(true);

      countdownRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(countdownRef.current!);
            router.push('/collaborator/submissoes');
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao submeter lista');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Modal Sugerir ────────────────────────────────────────────────────────

  const handleSugerirEnviar = async () => {
    if (!sugerirNome.trim()) return;
    setSugerirLoading(true);
    try {
      await api.post('/v1/collaborator/sugestoes', {
        nome: sugerirNome.trim(),
        unidadeMedida: sugerirUnidade,
      });
      setShowSugerir(false);
      setSugerirNome('');
      setSugerirUnidade('Un');
      setSugerirBanner('Sugestão enviada com sucesso! O administrador irá analisá-la.');
      setTimeout(() => setSugerirBanner(''), 5000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao enviar sugestão');
    } finally {
      setSugerirLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

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

        {/* ── Modal Sucesso ── */}
        <Modal show={showSuccess} backdrop="static" keyboard={false} centered>
          <Modal.Body className="text-center py-4">
            <div className={styles.successIcon}>✓</div>
            <h5 className="mb-2">Lista submetida!</h5>
            <p className="mb-1">Pedidos criados com sucesso.</p>
            <p className="text-muted small">
              Redirecionando em <strong>{countdown}</strong>...
            </p>
            <Spinner animation="border" size="sm" className="mt-2" />
          </Modal.Body>
        </Modal>

        {/* ── Modal Sugerir Novo Item ── */}
        <Modal show={showSugerir} onHide={() => setShowSugerir(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>💡 Sugerir Novo Item</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nome do item *</Form.Label>
              <Form.Control
                type="text"
                placeholder="Ex: Alho em pó"
                value={sugerirNome}
                onChange={(e) => setSugerirNome(e.target.value)}
                autoFocus
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Unidade de Medida</Form.Label>
              <Form.Select
                value={sugerirUnidade}
                onChange={(e) => setSugerirUnidade(e.target.value)}
              >
                <option value="Un">Un</option>
                <option value="Kg">Kg</option>
                <option value="g">g</option>
                <option value="L">L</option>
                <option value="ml">ml</option>
                <option value="Cx">Cx</option>
                <option value="Pct">Pct</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowSugerir(false)}>
              Cancelar
            </Button>
            <Button
              variant="warning"
              onClick={handleSugerirEnviar}
              disabled={sugerirLoading || !sugerirNome.trim()}
            >
              {sugerirLoading ? (
                <><Spinner animation="border" size="sm" /> Enviando...</>
              ) : (
                'Enviar Sugestão'
              )}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* ── Header ── */}
        <div className={styles.header}>
          <Link href="/collaborator/listas" className={styles.backLink}>
            ← Voltar para Minhas Listas
          </Link>
          <div className={styles.headerTop}>
            <div>
              <h1 className={styles.title}>🛒 Preenchimento: {lista.nome}</h1>
              <p className={styles.subtitle}>
                Atualize as quantidades atuais e clique em "Submeter Lista"
              </p>
            </div>
            <Button
              variant="warning"
              size="sm"
              onClick={() => setShowSugerir(true)}
            >
              💡 Sugerir Novo Item
            </Button>
          </div>
        </div>

        {/* ── Alertas ── */}
        {sugerirBanner && (
          <Alert variant="success" dismissible onClose={() => setSugerirBanner('')}>
            {sugerirBanner}
          </Alert>
        )}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* ── Summary Bar ── */}
        <div className={styles.summaryBar}>
          <span className={styles.badgeEmFalta}>
            🔴 Em Falta: {summary.emFalta}
          </span>
          <span className={styles.badgeAlterados}>
            🟡 Alterados: {summary.alterados}
          </span>
          <span className={styles.badgeTotal}>
            🔵 Total: {summary.total}
          </span>
        </div>

        {/* ── Busca ── */}
        <input
          type="search"
          placeholder="🔍 Buscar item..."
          value={filterNome}
          onChange={(e) => setFilterNome(e.target.value)}
          className={styles.searchBar}
        />

        {/* ── Tabela ── */}
        <div className={styles.tableWrapper}>
          <Table bordered hover responsive style={{ marginBottom: 0 }}>
            <thead>
              <tr>
                <th
                  className={styles.th}
                  onClick={() => handleSort('nome')}
                >
                  Item {sortIndicator('nome')}
                </th>
                <th
                  className={styles.th}
                  onClick={() => handleSort('unidade')}
                  style={{ width: 80, textAlign: 'center' }}
                >
                  Un. {sortIndicator('unidade')}
                </th>
                <th
                  className={styles.th}
                  onClick={() => handleSort('qtdMin')}
                  style={{ width: 100, textAlign: 'center' }}
                >
                  Qtd. Mín. {sortIndicator('qtdMin')}
                </th>
                <th
                  className={styles.th}
                  onClick={() => handleSort('qtdAtual')}
                  style={{ width: 130, textAlign: 'center' }}
                >
                  Qtd. Atual {sortIndicator('qtdAtual')}
                </th>
                <th
                  className={styles.th}
                  onClick={() => handleSort('pedido')}
                  style={{ width: 90, textAlign: 'center' }}
                >
                  Pedido {sortIndicator('pedido')}
                </th>
              </tr>
            </thead>
            <tbody>
              {displayedItens.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">
                    {filterNome
                      ? 'Nenhum item encontrado para essa busca.'
                      : 'Nenhum item na lista.'}
                  </td>
                </tr>
              )}
              {displayedItens.map((ir) => {
                const qtdAtual = qtdMap[ir.id] ?? ir.quantidadeAtual;
                const pedido = calcPedido(ir, qtdAtual);
                const alterado =
                  qtdAtual !== baseline[ir.id];
                const zerado = qtdAtual === 0 && ir.quantidadeMinima > 0;
                const baixo = !zerado && qtdAtual < ir.quantidadeMinima;

                const rowClass = alterado
                  ? styles.rowAlterado
                  : zerado
                  ? styles.rowZerado
                  : baixo
                  ? styles.rowBaixo
                  : '';

                const inputClass = `${styles.qtdInput} ${
                  zerado
                    ? styles.qtdInputZerado
                    : baixo
                    ? styles.qtdInputBaixo
                    : ''
                }`;

                return (
                  <tr key={ir.id} className={rowClass}>
                    <td className={styles.td}>
                      <strong>{ir.item.nome}</strong>
                    </td>
                    <td className={styles.td} style={{ textAlign: 'center' }}>
                      {ir.item.unidadeMedida}
                    </td>
                    <td className={styles.td} style={{ textAlign: 'center' }}>
                      {ir.quantidadeMinima}
                    </td>
                    <td className={styles.td} style={{ textAlign: 'center' }}>
                      <input
                        type="text"
                        inputMode="decimal"
                        className={inputClass}
                        value={qtdRaw[ir.id] ?? String(qtdAtual)}
                        onChange={(e) => handleInput(ir.id, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, ir.id)}
                        onKeyUp={(e) => handleKeyUp(e, ir.id)}
                        onBlur={(e) =>
                          handleResolveExpr(ir.id, e.target.value)
                        }
                        data-estoque-input="true"
                      />
                    </td>
                    <td className={styles.td} style={{ textAlign: 'center' }}>
                      {pedido > 0 ? (
                        <span className={styles.badgePedido}>{pedido}</span>
                      ) : (
                        <span className={styles.badgeOk}>OK</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>

        {/* ── Footer Actions ── */}
        <div className={styles.footerActions}>
          <Button
            variant="outline-secondary"
            onClick={handleSalvarRascunho}
            disabled={submitting}
          >
            Salvar Rascunho
          </Button>
          <Button
            variant="success"
            onClick={handleSubmeter}
            disabled={submitting}
          >
            {submitting ? (
              <><Spinner animation="border" size="sm" /> Submetendo...</>
            ) : (
              'Submeter Lista'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
