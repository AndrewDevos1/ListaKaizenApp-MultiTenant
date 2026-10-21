'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  KeyboardEvent,
  ChangeEvent,
} from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import api from '@/lib/api';
import styles from './ListaMae.module.css';
import {
  FaArrowLeft,
  FaPlus,
  FaTrash,
  FaCog,
  FaEdit,
  FaSearch,
  FaCopy,
  FaArrowRight,
  FaFileImport,
  FaTimes,
  FaChevronDown,
  FaChevronRight,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaTruck,
} from 'react-icons/fa';

// ── Types ──────────────────────────────────────────────────────────────────

interface ItemRef {
  id: number;
  listaId: number;
  itemId: number;
  quantidadeMinima: number;
  quantidadeAtual: number;
  usaThreshold: boolean;
  qtdFardo: number | null;
  item: {
    id: number;
    nome: string;
    unidadeMedida: string;
    fornecedorId: number | null;
    fornecedor: Fornecedor | null;
  };
}

interface Fornecedor {
  id: number;
  nome: string;
  telefone: string | null;
  email: string | null;
}

interface ListaMaeData {
  id: number;
  nome: string;
  criadoEm: string;
  area: { id: number; nome: string } | null;
  itensRef: ItemRef[];
  fornecedores: Fornecedor[];
}

interface CatalogItem {
  id: number;
  nome: string;
  unidadeMedida: string;
  fornecedor: { id: number; nome: string } | null;
}

type SortField = 'nome' | 'unidadeMedida' | 'quantidadeAtual' | 'quantidadeMinima' | 'pedido';
type SortDir = 'asc' | 'desc';

// ── Helpers ────────────────────────────────────────────────────────────────

const calcPedido = (ref: ItemRef): number => {
  if (ref.quantidadeAtual < ref.quantidadeMinima) {
    return ref.qtdFardo ?? 1;
  }
  return 0;
};

const UNIDADES = ['Un', 'Kg', 'g', 'L', 'ml', 'Cx', 'Pc', 'Fd'];

// ── Component ──────────────────────────────────────────────────────────────

export default function ListaMaePage() {
  const params = useParams<{ id: string }>();
  const listaId = Number(params.id);
  const router = useRouter();

  const [lista, setLista] = useState<ListaMaeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add row state
  const [addNome, setAddNome] = useState('');
  const [addUnidade, setAddUnidade] = useState('Un');
  const [addQtdMin, setAddQtdMin] = useState('0');
  const [adding, setAdding] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNome, setEditNome] = useState('');

  // Batch edit (qtdMin)
  const [batchEdit, setBatchEdit] = useState(false);
  const [batchValues, setBatchValues] = useState<Record<number, string>>({});
  const batchRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // Selection
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Filters
  const [filterNome, setFilterNome] = useState('');
  const [filterUnidade, setFilterUnidade] = useState('');
  const [filterPedidoMin, setFilterPedidoMin] = useState('');
  const [filterPedidoMax, setFilterPedidoMax] = useState('');

  // Sort
  const [sortField, setSortField] = useState<SortField>('nome');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Inativos section
  const [inativosOpen, setInativosOpen] = useState(false);

  // Edit inline nome — current value temp
  const inlineInputRef = useRef<HTMLInputElement | null>(null);

  // ── Modals ──

  // Config modal (threshold/fardo)
  const [showConfig, setShowConfig] = useState(false);
  const [configRef, setConfigRef] = useState<ItemRef | null>(null);
  const [configQtdMin, setConfigQtdMin] = useState('');
  const [configFardo, setConfigFardo] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  // Importar em lote
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ items_criados: number; items_duplicados: number } | null>(null);

  // Buscar no catálogo
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSelected, setCatalogSelected] = useState<Set<number>>(new Set());
  const [catalogQtdMin, setCatalogQtdMin] = useState<Record<number, string>>({});
  const [addingCatalog, setAddingCatalog] = useState(false);

  // Copiar/Mover
  const [showCopyMove, setShowCopyMove] = useState(false);
  const [copyMoveMode, setCopyMoveMode] = useState<'copiar' | 'mover'>('copiar');
  const [allListas, setAllListas] = useState<{ id: number; nome: string }[]>([]);
  const [cmDestinoType, setCmDestinoType] = useState<'existente' | 'nova'>('existente');
  const [cmListaId, setCmListaId] = useState<number | ''>('');
  const [cmNova, setCmNova] = useState('');
  const [cmAreaId, setCmAreaId] = useState<number | ''>('');
  const [cmAreas, setCmAreas] = useState<{ id: number; nome: string }[]>([]);
  const [cmSaving, setCmSaving] = useState(false);

  // Resultado copiar/mover
  const [showCmResult, setShowCmResult] = useState(false);
  const [cmResult, setCmResult] = useState<{
    message: string;
    itens_ignorados: number;
    itens_ignorados_lista: string[];
  } | null>(null);

  // Atribuir fornecedor
  const [showFornecedor, setShowFornecedor] = useState(false);
  const [allFornecedores, setAllFornecedores] = useState<Fornecedor[]>([]);
  const [fornecedorId, setFornecedorId] = useState<number | ''>('');
  const [savingFornecedor, setSavingFornecedor] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────

  const fetchLista = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/v1/listas/${listaId}/lista-mae`);
      setLista(data);
    } catch {
      setError('Erro ao carregar lista');
    } finally {
      setLoading(false);
    }
  }, [listaId]);

  useEffect(() => {
    fetchLista();
  }, [fetchLista]);

  // ── Derived data ───────────────────────────────────────────────────────

  const ativos = (lista?.itensRef ?? []).filter((r) => r.quantidadeMinima > 0);
  const inativos = (lista?.itensRef ?? []).filter((r) => r.quantidadeMinima <= 0);

  const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const filtrados = ativos
    .filter((r) => {
      if (filterNome && !normalize(r.item.nome).includes(normalize(filterNome))) return false;
      if (filterUnidade && r.item.unidadeMedida !== filterUnidade) return false;
      const pedido = calcPedido(r);
      if (filterPedidoMin !== '' && pedido < Number(filterPedidoMin)) return false;
      if (filterPedidoMax !== '' && pedido > Number(filterPedidoMax)) return false;
      return true;
    })
    .sort((a, b) => {
      let va: string | number = '';
      let vb: string | number = '';
      switch (sortField) {
        case 'nome': va = a.item.nome.toLowerCase(); vb = b.item.nome.toLowerCase(); break;
        case 'unidadeMedida': va = a.item.unidadeMedida; vb = b.item.unidadeMedida; break;
        case 'quantidadeAtual': va = a.quantidadeAtual; vb = b.quantidadeAtual; break;
        case 'quantidadeMinima': va = a.quantidadeMinima; vb = b.quantidadeMinima; break;
        case 'pedido': va = calcPedido(a); vb = calcPedido(b); break;
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const uniqUnidades = Array.from(new Set((lista?.itensRef ?? []).map((r) => r.item.unidadeMedida)));

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <FaSort style={{ opacity: 0.4 }} />;
    return sortDir === 'asc' ? <FaSortUp /> : <FaSortDown />;
  };

  // ── Add item row ──────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!addNome.trim()) return;
    setAdding(true);
    try {
      await api.post(`/v1/listas/${listaId}/mae-itens`, {
        nome: addNome.trim(),
        unidadeMedida: addUnidade,
        quantidadeAtual: 0,
        quantidadeMinima: Number(addQtdMin) || 0,
      });
      setAddNome('');
      setAddQtdMin('0');
      fetchLista();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao adicionar item');
    } finally {
      setAdding(false);
    }
  };

  // ── Inline nome edit ──────────────────────────────────────────────────

  const startEditNome = (ref: ItemRef) => {
    setEditingId(ref.id);
    setEditNome(ref.item.nome);
    setTimeout(() => inlineInputRef.current?.focus(), 0);
  };

  const saveEditNome = async (ref: ItemRef) => {
    if (editNome.trim() === ref.item.nome) {
      setEditingId(null);
      return;
    }
    try {
      await api.put(`/v1/listas/${listaId}/mae-itens/${ref.id}`, { nome: editNome.trim() });
      setEditingId(null);
      fetchLista();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar nome');
      setEditingId(null);
    }
  };

  // ── Batch edit qtdMin ──────────────────────────────────────────────────

  const enterBatchEdit = () => {
    const vals: Record<number, string> = {};
    for (const r of filtrados) {
      vals[r.id] = String(r.quantidadeMinima);
    }
    setBatchValues(vals);
    setBatchEdit(true);
  };

  const saveBatchEdit = async () => {
    const changed = filtrados.filter(
      (r) => batchValues[r.id] !== undefined && Number(batchValues[r.id]) !== r.quantidadeMinima,
    );
    await Promise.all(
      changed.map((r) =>
        api.put(`/v1/listas/${listaId}/mae-itens/${r.id}`, {
          quantidadeMinima: Number(batchValues[r.id]),
        }),
      ),
    );
    setBatchEdit(false);
    fetchLista();
  };

  const handleBatchKeyDown = (e: KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextRef = Object.values(batchRefs.current)[idx + 1];
      if (nextRef) nextRef.focus();
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────

  const handleDelete = async (ref: ItemRef) => {
    if (!confirm(`Remover "${ref.item.nome}" desta lista?`)) return;
    try {
      await api.delete(`/v1/listas/${listaId}/mae-itens/${ref.id}`);
      fetchLista();
    } catch {
      setError('Erro ao remover item');
    }
  };

  // ── Quick qtdMin inline save ──────────────────────────────────────────

  const saveQtdMin = async (ref: ItemRef, val: string) => {
    const num = Number(val);
    if (num === ref.quantidadeMinima) return;
    try {
      await api.put(`/v1/listas/${listaId}/mae-itens/${ref.id}`, { quantidadeMinima: num });
      fetchLista();
    } catch {
      setError('Erro ao salvar quantidade mínima');
    }
  };

  // ── Selection ──────────────────────────────────────────────────────────

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtrados.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtrados.map((r) => r.id)));
    }
  };

  // ── Config modal ───────────────────────────────────────────────────────

  const openConfig = (ref: ItemRef) => {
    setConfigRef(ref);
    setConfigQtdMin(String(ref.quantidadeMinima));
    setConfigFardo(ref.qtdFardo !== null ? String(ref.qtdFardo) : '');
    setShowConfig(true);
  };

  const saveConfig = async () => {
    if (!configRef) return;
    setSavingConfig(true);
    try {
      await api.put(`/v1/listas/${listaId}/mae-itens/${configRef.id}`, {
        quantidadeMinima: Number(configQtdMin),
        qtdFardo: configFardo !== '' ? Number(configFardo) : null,
      });
      setShowConfig(false);
      fetchLista();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar configuração');
    } finally {
      setSavingConfig(false);
    }
  };

  // ── Importar em lote ───────────────────────────────────────────────────

  const handleImport = async () => {
    const nomes = importText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (nomes.length === 0) return;
    setImporting(true);
    try {
      const { data } = await api.post(`/v1/listas/${listaId}/items-import`, { nomes });
      setImportResult(data);
      fetchLista();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao importar');
    } finally {
      setImporting(false);
    }
  };

  // ── Buscar no catálogo ──────────────────────────────────────────────────

  const searchCatalog = async (q: string) => {
    if (!q.trim()) { setCatalogItems([]); return; }
    setCatalogLoading(true);
    try {
      const { data } = await api.get('/v1/items', { params: { nome: q } });
      setCatalogItems(data.items ?? data);
    } catch {
      setCatalogItems([]);
    } finally {
      setCatalogLoading(false);
    }
  };

  const toggleCatalogItem = (id: number) => {
    setCatalogSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addFromCatalog = async () => {
    setAddingCatalog(true);
    try {
      for (const item of catalogItems.filter((i) => catalogSelected.has(i.id))) {
        await api.post(`/v1/listas/${listaId}/mae-itens`, {
          nome: item.nome,
          unidadeMedida: item.unidadeMedida,
          quantidadeAtual: 0,
          quantidadeMinima: Number(catalogQtdMin[item.id] ?? 0),
        }).catch(() => {}); // Ignora duplicados
      }
      setShowCatalog(false);
      setCatalogSelected(new Set());
      setCatalogSearch('');
      setCatalogItems([]);
      fetchLista();
    } finally {
      setAddingCatalog(false);
    }
  };

  // ── Copiar / Mover ─────────────────────────────────────────────────────

  const openCopyMove = async (mode: 'copiar' | 'mover') => {
    setCopyMoveMode(mode);
    setCmDestinoType('existente');
    setCmListaId('');
    setCmNova('');
    setCmAreaId('');
    setShowCopyMove(true);
    const [listasRes, areasRes] = await Promise.all([
      api.get('/v1/listas'),
      api.get('/v1/areas'),
    ]);
    setAllListas((listasRes.data as { id: number; nome: string }[]).filter((l) => l.id !== listaId));
    setCmAreas(areasRes.data);
  };

  const handleCopyMove = async () => {
    const itemRefIds = Array.from(selected);
    if (itemRefIds.length === 0) return;
    setCmSaving(true);
    try {
      const body: Record<string, unknown> = { itemRefIds };
      if (cmDestinoType === 'existente') {
        body.listaDestinoId = Number(cmListaId);
      } else {
        body.nomeNovaLista = cmNova;
        if (cmAreaId) body.areaId = Number(cmAreaId);
      }
      const endpoint = `/v1/listas/${listaId}/itens/${copyMoveMode}`;
      const { data } = await api.post(endpoint, body);
      setShowCopyMove(false);
      setCmResult(data);
      setShowCmResult(true);
      setSelected(new Set());
      fetchLista();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao copiar/mover');
    } finally {
      setCmSaving(false);
    }
  };

  // ── Atribuir fornecedor ─────────────────────────────────────────────────

  const openFornecedor = async () => {
    try {
      const { data } = await api.get('/v1/fornecedores');
      setAllFornecedores(data.fornecedores ?? data);
      setFornecedorId('');
      setShowFornecedor(true);
    } catch {
      setError('Erro ao carregar fornecedores');
    }
  };

  const handleAtribuirFornecedor = async () => {
    if (!fornecedorId) return;
    setSavingFornecedor(true);
    try {
      await api.post(`/v1/listas/${listaId}/atribuir-fornecedor`, {
        itemRefIds: Array.from(selected),
        fornecedorId: Number(fornecedorId),
      });
      setShowFornecedor(false);
      setSelected(new Set());
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao atribuir fornecedor');
    } finally {
      setSavingFornecedor(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  if (!lista) {
    return (
      <div className={styles.pageWrapper}>
        <div className={styles.pageContainer}>
          <Alert variant="danger">Lista não encontrada</Alert>
        </div>
      </div>
    );
  }

  const hasFilters = filterNome || filterUnidade || filterPedidoMin !== '' || filterPedidoMax !== '';

  const renderSortableTh = (label: string, field: SortField) => (
    <th className={styles.th} onClick={() => handleSort(field)}>
      <span className={styles.thSort}>
        {label} <SortIcon field={field} />
      </span>
    </th>
  );

  const renderRow = (ref: ItemRef, isInativo = false) => {
    const pedido = calcPedido(ref);
    const isSelected = selected.has(ref.id);
    const rowClass = [
      styles.row,
      isSelected ? styles.rowSelected : '',
      !isInativo && pedido > 0 ? styles.rowWarning : '',
    ].filter(Boolean).join(' ');

    return (
      <tr key={ref.id} className={rowClass}>
        {/* Checkbox */}
        <td className={styles.td} style={{ width: 36, textAlign: 'center' }}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelect(ref.id)}
          />
        </td>

        {/* Nome */}
        <td className={styles.td} onDoubleClick={() => !isInativo && startEditNome(ref)}>
          {editingId === ref.id ? (
            <input
              ref={inlineInputRef}
              className={styles.inlineInput}
              value={editNome}
              onChange={(e) => setEditNome(e.target.value)}
              onBlur={() => saveEditNome(ref)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveEditNome(ref); if (e.key === 'Escape') setEditingId(null); }}
            />
          ) : (
            <span title="Duplo clique para editar">{ref.item.nome}</span>
          )}
        </td>

        {/* Unidade */}
        <td className={styles.td}>{ref.item.unidadeMedida}</td>

        {/* QtdAtual */}
        <td className={styles.td} style={{ textAlign: 'center' }}>
          {ref.quantidadeAtual}
        </td>

        {/* QtdMin */}
        <td className={styles.td} style={{ textAlign: 'center' }}>
          {batchEdit && !isInativo ? (
            <input
              className={styles.batchInput}
              type="number"
              min="0"
              value={batchValues[ref.id] ?? String(ref.quantidadeMinima)}
              onChange={(e) => setBatchValues((prev) => ({ ...prev, [ref.id]: e.target.value }))}
              onKeyDown={(e) => handleBatchKeyDown(e, filtrados.findIndex((r) => r.id === ref.id))}
              ref={(el) => { batchRefs.current[ref.id] = el; }}
            />
          ) : (
            <span
              title={isInativo ? 'Duplo clique para reativar' : undefined}
              onDoubleClick={isInativo ? () => {
                const v = prompt('Nova quantidade mínima:', String(ref.quantidadeMinima));
                if (v !== null) saveQtdMin(ref, v);
              } : undefined}
            >
              {ref.quantidadeMinima}
            </span>
          )}
        </td>

        {/* Pedido */}
        {!isInativo && (
          <td className={styles.td} style={{ textAlign: 'center' }}>
            {pedido > 0 ? (
              <span className={styles.badgePedido}>{pedido}</span>
            ) : (
              <span className={styles.badgeOk}>ok</span>
            )}
          </td>
        )}

        {/* Ações */}
        <td className={styles.td} style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
          {!isInativo && (
            <button
              className={`${styles.iconBtn}`}
              onClick={() => openConfig(ref)}
              title="Configurar threshold/fardo"
            >
              <FaCog />
            </button>
          )}
          <button
            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
            onClick={() => handleDelete(ref)}
            title="Remover da lista"
          >
            <FaTrash />
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>

        {/* Back */}
        <button className={styles.backBtn} onClick={() => router.push('/admin/listas')}>
          <FaArrowLeft /> Voltar às Listas
        </button>

        <h1 className={styles.pageTitle}>Lista Mãe — {lista.nome}</h1>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Fornecedores */}
        {lista.fornecedores.length > 0 && (
          <div className={styles.fornecedoresRow}>
            {lista.fornecedores.map((f) => (
              <div key={f.id} className={styles.fornecedorCard}>
                <span><FaTruck style={{ marginRight: 4 }} />{f.nome}</span>
                {(f.telefone || f.email) && (
                  <span className={styles.fornecedorSub}>{f.telefone ?? f.email}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Itens Ativos</div>
            <div className={styles.statValue}>{ativos.length}</div>
          </div>
          <div className={styles.statCard} style={{ borderLeftColor: '#6c757d' }}>
            <div className={styles.statLabel}>Inativos</div>
            <div className={styles.statValue}>{inativos.length}</div>
          </div>
          <div className={styles.statCard} style={{ borderLeftColor: '#667eea' }}>
            <div className={styles.statLabel}>Selecionados</div>
            <div className={styles.statValue}>{selected.size}</div>
          </div>
          <div className={styles.statCard} style={{ borderLeftColor: '#28a745' }}>
            <div className={styles.statLabel}>Criada em</div>
            <div className={styles.statValue} style={{ fontSize: '1rem' }}>
              {new Date(lista.criadoEm).toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className={styles.filtrosBar}>
          <FaSearch style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Buscar nome..."
            value={filterNome}
            onChange={(e) => setFilterNome(e.target.value)}
          />
          <select value={filterUnidade} onChange={(e) => setFilterUnidade(e.target.value)}>
            <option value="">Todas unidades</option>
            {uniqUnidades.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          <div className={styles.filtroNumGroup}>
            <span className={styles.filtroNumLabel}>Pedido:</span>
            <input
              type="number"
              placeholder="Min"
              value={filterPedidoMin}
              onChange={(e) => setFilterPedidoMin(e.target.value)}
            />
            <span className={styles.filtroNumLabel}>–</span>
            <input
              type="number"
              placeholder="Max"
              value={filterPedidoMax}
              onChange={(e) => setFilterPedidoMax(e.target.value)}
            />
          </div>
          {hasFilters && (
            <button
              className={styles.clearFiltrosBtn}
              onClick={() => { setFilterNome(''); setFilterUnidade(''); setFilterPedidoMin(''); setFilterPedidoMax(''); }}
            >
              <FaTimes /> Limpar
            </button>
          )}
        </div>

        {/* Tools bar */}
        <div className={styles.toolsBar}>
          <button className={styles.toolBtn} onClick={() => setShowImport(true)}>
            <FaFileImport /> Importar em Lote
          </button>
          <button className={styles.toolBtn} onClick={() => { setShowCatalog(true); setCatalogSearch(''); setCatalogItems([]); setCatalogSelected(new Set()); }}>
            <FaSearch /> Buscar no Catálogo
          </button>
          {selected.size > 0 && (
            <>
              <div className={styles.selectionSep} />
              <button className={`${styles.toolBtn}`} onClick={() => openCopyMove('copiar')}>
                <FaCopy /> Copiar para Lista
              </button>
              <button className={`${styles.toolBtn}`} onClick={() => openCopyMove('mover')}>
                <FaArrowRight /> Mover para Lista
              </button>
              <button className={`${styles.toolBtn}`} onClick={openFornecedor}>
                <FaTruck /> Atribuir Fornecedor
              </button>
              <button
                className={`${styles.toolBtn} ${styles.toolBtnDanger}`}
                onClick={() => setSelected(new Set())}
              >
                <FaTimes /> Limpar Seleção ({selected.size})
              </button>
            </>
          )}
        </div>

        {/* Tabela principal */}
        <div className={styles.tableWrapper}>
          <table>
            <thead>
              <tr>
                <th className={styles.th} style={{ width: 36, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={filtrados.length > 0 && selected.size === filtrados.length}
                    onChange={toggleSelectAll}
                    title="Selecionar todos"
                  />
                </th>
                {renderSortableTh('Nome', 'nome')}
                {renderSortableTh('Unidade', 'unidadeMedida')}
                {renderSortableTh('QtdAtual', 'quantidadeAtual')}
                <th
                  className={styles.th}
                  style={{ textAlign: 'center' }}
                  onClick={() => handleSort('quantidadeMinima')}
                >
                  <span className={styles.thSort}>
                    QtdMín <SortIcon field="quantidadeMinima" />
                    {!batchEdit ? (
                      <span
                        className={styles.batchEditIcon}
                        onClick={(e) => { e.stopPropagation(); enterBatchEdit(); }}
                        title="Editar em lote"
                      >
                        <FaEdit />
                      </span>
                    ) : (
                      <span className={styles.batchControls} onClick={(e) => e.stopPropagation()}>
                        <button className={styles.batchConfirm} onClick={saveBatchEdit} title="Confirmar">✓</button>
                        <button className={styles.batchCancel} onClick={() => setBatchEdit(false)} title="Cancelar">✕</button>
                      </span>
                    )}
                  </span>
                </th>
                {renderSortableTh('Pedido', 'pedido')}
                <th className={styles.th} style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {/* Add row */}
              <tr className={styles.addRow}>
                <td className={styles.td} />
                <td className={styles.td}>
                  <input
                    className={styles.addInput}
                    type="text"
                    placeholder="Nome do item..."
                    value={addNome}
                    onChange={(e) => setAddNome(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                  />
                </td>
                <td className={styles.td}>
                  <select
                    className={styles.addSelect}
                    value={addUnidade}
                    onChange={(e) => setAddUnidade(e.target.value)}
                  >
                    {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </td>
                <td className={styles.td} style={{ textAlign: 'center' }}>0</td>
                <td className={styles.td} style={{ textAlign: 'center' }}>
                  <input
                    className={styles.batchInput}
                    type="number"
                    min="0"
                    value={addQtdMin}
                    onChange={(e) => setAddQtdMin(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                  />
                </td>
                <td className={styles.td} />
                <td className={styles.td} style={{ textAlign: 'right' }}>
                  <button
                    className={`${styles.toolBtn} ${styles.toolBtnPrimary}`}
                    onClick={handleAdd}
                    disabled={adding || !addNome.trim()}
                  >
                    {adding ? <Spinner size="sm" animation="border" /> : <FaPlus />}
                  </button>
                </td>
              </tr>

              {filtrados.length === 0 && (
                <tr>
                  <td colSpan={7} className={styles.td} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                    {hasFilters ? 'Nenhum item com esses filtros' : 'Nenhum item ativo. Adicione um acima.'}
                  </td>
                </tr>
              )}

              {filtrados.map((ref) => renderRow(ref))}
            </tbody>
          </table>
        </div>

        {/* Seção Inativos */}
        {inativos.length > 0 && (
          <div className={styles.inativosSection}>
            <div
              className={styles.inativosHeader}
              onClick={() => setInativosOpen((o) => !o)}
            >
              {inativosOpen ? <FaChevronDown /> : <FaChevronRight />}
              <span>Inativos ({inativos.length})</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                QtdMín = 0
              </span>
            </div>
            {inativosOpen && (
              <>
                <div className={styles.inativosTip}>
                  Duplo clique na QtdMín para reativar um item
                </div>
                <table>
                  <thead>
                    <tr>
                      <th className={styles.th} style={{ width: 36 }} />
                      <th className={styles.th}>Nome</th>
                      <th className={styles.th}>Unidade</th>
                      <th className={styles.th} style={{ textAlign: 'center' }}>QtdMín</th>
                      <th className={styles.th} style={{ textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inativos.map((ref) => renderRow(ref, true))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}

      </div>

      {/* ── Modal Config ── */}
      <Modal show={showConfig} onHide={() => setShowConfig(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Configurar — {configRef?.item.nome}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Quantidade Mínima</Form.Label>
            <Form.Control
              type="number"
              min="0"
              value={configQtdMin}
              onChange={(e) => setConfigQtdMin(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Qtd por Fardo <span className="text-muted">(opcional)</span></Form.Label>
            <Form.Control
              type="number"
              min="0"
              value={configFardo}
              onChange={(e) => setConfigFardo(e.target.value)}
              placeholder="Ex: 12.5"
            />
          </Form.Group>
          {configQtdMin && (
            <Alert variant="info" className="mb-0">
              Quando estoque ≤ <strong>{configQtdMin}</strong>, pedir{' '}
              <strong>{configFardo || '1'}</strong> unidade(s)
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfig(false)}>Cancelar</Button>
          <Button variant="primary" onClick={saveConfig} disabled={savingConfig}>
            {savingConfig ? <Spinner size="sm" animation="border" /> : 'Salvar'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Modal Importar em Lote ── */}
      <Modal show={showImport} onHide={() => { setShowImport(false); setImportResult(null); setImportText(''); }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Importar em Lote</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {importResult ? (
            <Alert variant="success">
              <strong>{importResult.items_criados}</strong> itens criados,{' '}
              <strong>{importResult.items_duplicados}</strong> duplicados ignorados.
            </Alert>
          ) : (
            <>
              <p className="text-muted small mb-2">
                Cole os nomes dos itens, um por linha. Itens já existentes serão vinculados automaticamente.
                Duplicatas na lista serão ignoradas.
              </p>
              <Form.Control
                as="textarea"
                rows={12}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={"Farinha de Trigo\nAçúcar Cristal\nSal Refinado"}
                style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
              />
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowImport(false); setImportResult(null); setImportText(''); }}>
            {importResult ? 'Fechar' : 'Cancelar'}
          </Button>
          {!importResult && (
            <Button variant="primary" onClick={handleImport} disabled={importing || !importText.trim()}>
              {importing ? <><Spinner size="sm" animation="border" /> Importando...</> : 'Importar'}
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* ── Modal Buscar no Catálogo ── */}
      <Modal show={showCatalog} onHide={() => setShowCatalog(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Buscar no Catálogo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Control
              type="text"
              placeholder="Buscar item no catálogo..."
              value={catalogSearch}
              onChange={(e) => { setCatalogSearch(e.target.value); searchCatalog(e.target.value); }}
            />
          </Form.Group>
          {catalogLoading && <div className="text-center"><Spinner animation="border" size="sm" /></div>}
          {catalogItems.map((item) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
              <Form.Check
                type="checkbox"
                checked={catalogSelected.has(item.id)}
                onChange={() => toggleCatalogItem(item.id)}
                id={`cat-${item.id}`}
              />
              <label htmlFor={`cat-${item.id}`} style={{ flex: 1, cursor: 'pointer', margin: 0 }}>
                {item.nome} <span className="text-muted">({item.unidadeMedida})</span>
                {item.fornecedor && (
                  <span className="badge bg-secondary ms-2">{item.fornecedor.nome}</span>
                )}
              </label>
              {catalogSelected.has(item.id) && (
                <Form.Control
                  type="number"
                  min="0"
                  placeholder="QtdMín"
                  value={catalogQtdMin[item.id] ?? ''}
                  onChange={(e) => setCatalogQtdMin((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  style={{ width: 80 }}
                />
              )}
            </div>
          ))}
          {catalogItems.length === 0 && catalogSearch && !catalogLoading && (
            <p className="text-muted text-center py-3">Nenhum item encontrado</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCatalog(false)}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={addFromCatalog}
            disabled={addingCatalog || catalogSelected.size === 0}
          >
            {addingCatalog ? <Spinner size="sm" animation="border" /> : `Adicionar (${catalogSelected.size})`}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Modal Copiar / Mover ── */}
      <Modal show={showCopyMove} onHide={() => setShowCopyMove(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {copyMoveMode === 'copiar' ? 'Copiar' : 'Mover'} {selected.size} item(s) para Lista
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Destino</Form.Label>
            <div>
              <Form.Check
                inline
                type="radio"
                label="Lista existente"
                id="cm-existente"
                checked={cmDestinoType === 'existente'}
                onChange={() => setCmDestinoType('existente')}
              />
              <Form.Check
                inline
                type="radio"
                label="Nova lista"
                id="cm-nova"
                checked={cmDestinoType === 'nova'}
                onChange={() => setCmDestinoType('nova')}
              />
            </div>
          </Form.Group>
          {cmDestinoType === 'existente' ? (
            <Form.Group>
              <Form.Label>Lista de destino</Form.Label>
              <Form.Select value={cmListaId} onChange={(e) => setCmListaId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">Selecione...</option>
                {allListas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </Form.Select>
            </Form.Group>
          ) : (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Nome da nova lista</Form.Label>
                <Form.Control
                  value={cmNova}
                  onChange={(e) => setCmNova(e.target.value)}
                  placeholder="Ex: Lista Semana 2"
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Área <span className="text-muted">(opcional)</span></Form.Label>
                <Form.Select value={cmAreaId} onChange={(e) => setCmAreaId(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">Sem área</option>
                  {cmAreas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </Form.Select>
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCopyMove(false)}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={handleCopyMove}
            disabled={cmSaving || (cmDestinoType === 'existente' ? !cmListaId : !cmNova)}
          >
            {cmSaving ? <Spinner size="sm" animation="border" /> : copyMoveMode === 'copiar' ? 'Copiar' : 'Mover'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Modal Resultado ── */}
      <Modal show={showCmResult} onHide={() => setShowCmResult(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Resultado</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {cmResult && (
            <>
              <Alert variant="success">{cmResult.message}</Alert>
              {cmResult.itens_ignorados > 0 && (
                <>
                  <p className="text-muted small mb-1">
                    {cmResult.itens_ignorados} item(s) ignorado(s) por já existirem no destino:
                  </p>
                  <ul className={styles.modalResultList}>
                    {cmResult.itens_ignorados_lista.map((n, i) => <li key={i}>{n}</li>)}
                  </ul>
                </>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCmResult(false)}>Fechar</Button>
        </Modal.Footer>
      </Modal>

      {/* ── Modal Atribuir Fornecedor ── */}
      <Modal show={showFornecedor} onHide={() => setShowFornecedor(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Atribuir Fornecedor ({selected.size} itens)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted small mb-3">
            Será criada uma submissão de pedido com os itens selecionados, usando a quantidade por fardo (ou mínima) de cada item.
          </p>
          <ul className="mb-3" style={{ maxHeight: 150, overflowY: 'auto', fontSize: '0.88rem' }}>
            {(lista?.itensRef ?? [])
              .filter((r) => selected.has(r.id))
              .map((r) => (
                <li key={r.id}>{r.item.nome} — qtd: {r.qtdFardo ?? r.quantidadeMinima}</li>
              ))}
          </ul>
          <Form.Group>
            <Form.Label>Fornecedor</Form.Label>
            <Form.Select value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Selecione um fornecedor...</option>
              {allFornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowFornecedor(false)}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={handleAtribuirFornecedor}
            disabled={savingFornecedor || !fornecedorId}
          >
            {savingFornecedor ? <Spinner size="sm" animation="border" /> : 'Criar Pedido'}
          </Button>
        </Modal.Footer>
      </Modal>

    </div>
  );
}
