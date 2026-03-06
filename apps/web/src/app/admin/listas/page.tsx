'use client';

import { useState, useEffect, FormEvent, useRef } from 'react';
import { Button, Modal, Form, Alert, Spinner, Dropdown } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import styles from './Listas.module.css';
import {
  FaPlus,
  FaList,
  FaTrash,
  FaUsers,
  FaEdit,
  FaSearch,
  FaTimes,
  FaMapMarkerAlt,
  FaDownload,
  FaUpload,
  FaLink,
  FaShoppingCart,
} from 'react-icons/fa';

interface ItemPreview {
  id: number;
  quantidadeAtual: number;
  quantidadeMinima: number;
  item: { nome: string; unidadeMedida: string };
}

interface Area {
  id: number;
  nome: string;
}

interface GrupoLista {
  id: number;
  nome: string;
  listas: { id: number; nome: string }[];
  _count: { listas: number };
}

interface ListaSummary {
  id: number;
  nome: string;
  descricao?: string | null;
  criadoEm: string;
  grupo?: { id: number; nome: string } | null;
  listaPaiId?: number | null;
  area?: Area | null;
  _count: { colaboradores: number; itensRef: number; sublistas: number };
  itensRef: ItemPreview[];
}

interface ListaDeletedSummary {
  id: number;
  nome: string;
  criadoEm: string;
  _count: { itensRef: number };
}

interface Usuario {
  id: number;
  nome: string;
  email: string;
}

const normalizeText = (t: string) =>
  t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export default function ListasPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [listas, setListas] = useState<ListaSummary[]>([]);
  const [grupos, setGrupos] = useState<GrupoLista[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [areaFiltro, setAreaFiltro] = useState<number | null>(null);

  // Modal criar
  const [showModalCriar, setShowModalCriar] = useState(false);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [areaIdCriar, setAreaIdCriar] = useState<number | ''>('');

  // Modal editar
  const [showModalEditar, setShowModalEditar] = useState(false);
  const [listaEditando, setListaEditando] = useState<ListaSummary | null>(null);
  const [nomeEditado, setNomeEditado] = useState('');
  const [descricaoEditada, setDescricaoEditada] = useState('');
  const [areaIdEditada, setAreaIdEditada] = useState<number | ''>('');

  // Modal colaboradores
  const [showModalColabs, setShowModalColabs] = useState(false);
  const [listaColabs, setListaColabs] = useState<ListaSummary | null>(null);
  const [colaboradoresAtuais, setColaboradoresAtuais] = useState<Usuario[]>([]);
  const [todosUsuarios, setTodosUsuarios] = useState<Usuario[]>([]);
  const [loadingColabs, setLoadingColabs] = useState(false);
  const [savingColabs, setSavingColabs] = useState(false);
  const [colabsSelected, setColabsSelected] = useState<Set<number>>(new Set());

  // Modal vincular área
  const [showModalArea, setShowModalArea] = useState(false);
  const [listaArea, setListaArea] = useState<ListaSummary | null>(null);
  const [areaIdVincular, setAreaIdVincular] = useState<number | ''>('');
  const [syncColabs, setSyncColabs] = useState(false);
  const [savingArea, setSavingArea] = useState(false);

  // Modal lixeira
  const [showModalLixeira, setShowModalLixeira] = useState(false);
  const [listasDeleted, setListasDeleted] = useState<ListaDeletedSummary[]>([]);
  const [loadingLixeira, setLoadingLixeira] = useState(false);
  const [selectedLixeira, setSelectedLixeira] = useState<Set<number>>(new Set());
  const [deletingBatch, setDeletingBatch] = useState(false);

  // Modal import CSV
  const [showModalImport, setShowModalImport] = useState(false);
  const [listaImport, setListaImport] = useState<ListaSummary | null>(null);
  const [importing, setImporting] = useState(false);

  // Modal grupos (criar/editar)
  const [showModalCriarGrupo, setShowModalCriarGrupo] = useState(false);
  const [modoEditarGrupo, setModoEditarGrupo] = useState(false);
  const [nomeGrupo, setNomeGrupo] = useState('');
  const [listasGrupoSelecionadas, setListasGrupoSelecionadas] = useState<Set<number>>(new Set());
  const [savingGrupo, setSavingGrupo] = useState(false);
  const [grupoEdicaoId, setGrupoEdicaoId] = useState<number | ''>('');
  const [nomeGrupoEdicao, setNomeGrupoEdicao] = useState('');
  const [listaAdicionarGrupoId, setListaAdicionarGrupoId] = useState<number | ''>('');
  const [savingGrupoEdicao, setSavingGrupoEdicao] = useState(false);
  const [buscaListaGrupo, setBuscaListaGrupo] = useState('');

  // Modal vincular lista a grupo
  const [showModalVincularGrupo, setShowModalVincularGrupo] = useState(false);
  const [listaVincularGrupo, setListaVincularGrupo] = useState<ListaSummary | null>(null);
  const [grupoSelecionadoId, setGrupoSelecionadoId] = useState<number | ''>('');
  const [savingVinculoGrupo, setSavingVinculoGrupo] = useState(false);

  const fetchListas = async () => {
    try {
      setLoading(true);
      const [listasRes, areasRes, gruposRes] = await Promise.all([
        api.get('/v1/listas'),
        api.get('/v1/areas'),
        api.get('/v1/admin/grupos-listas'),
      ]);
      setListas(listasRes.data);
      setAreas(areasRes.data);
      setGrupos(gruposRes.data);
    } catch {
      setError('Erro ao carregar listas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListas();
  }, []);

  useEffect(() => {
    if (!modoEditarGrupo) return;
    if (grupos.length === 0) {
      setGrupoEdicaoId('');
      setNomeGrupoEdicao('');
      return;
    }

    if (grupoEdicaoId === '' || !grupos.some((g) => g.id === grupoEdicaoId)) {
      setGrupoEdicaoId(grupos[0].id);
      setNomeGrupoEdicao(grupos[0].nome);
    }
  }, [modoEditarGrupo, grupos, grupoEdicaoId]);

  const listasFiltradas = listas.filter((l) => {
    if (areaFiltro !== null) {
      if (areaFiltro === 0) {
        if (l.area !== null && l.area !== undefined) return false;
      } else if (l.area?.id !== areaFiltro) {
        return false;
      }
    }
    if (!search) return true;
    const termo = normalizeText(search);
    const nomeMatch = normalizeText(l.nome).includes(termo);
    const itemMatch = l.itensRef.some((r) => normalizeText(r.item.nome).includes(termo));
    return nomeMatch || itemMatch;
  });

  const areasFiltro = areas.filter((a) => normalizeText(a.nome) !== 'estoque principal');

  const listasElegiveisParaGrupo = listas.filter(
    (lista) =>
      !lista.grupo &&
      !lista.listaPaiId &&
      (lista._count.sublistas ?? 0) === 0,
  );

  const listasElegiveisParaGrupoFiltradas = listasElegiveisParaGrupo.filter(
    (lista) => {
      const termo = buscaListaGrupo.trim();
      if (!termo) return true;

      const termoNormalizado = normalizeText(termo);
      const nomeMatch = normalizeText(lista.nome).includes(termoNormalizado);
      const itemMatch = lista.itensRef.some((ref) =>
        normalizeText(ref.item.nome).includes(termoNormalizado),
      );
      return nomeMatch || itemMatch;
    },
  );

  const grupoSelecionadoEdicao =
    grupoEdicaoId === ''
      ? null
      : grupos.find((grupo) => grupo.id === grupoEdicaoId) || null;

  // Criar
  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/v1/listas', {
        nome,
        descricao: descricao || undefined,
        areaId: areaIdCriar || undefined,
      });
      setShowModalCriar(false);
      setNome('');
      setDescricao('');
      setAreaIdCriar('');
      fetchListas();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao criar lista');
    }
  };

  // Deletar (soft)
  const handleDelete = async (id: number) => {
    if (!confirm('Deseja deletar esta lista?')) return;
    try {
      await api.delete(`/v1/listas/${id}`);
      fetchListas();
    } catch {
      setError('Erro ao deletar lista');
    }
  };

  // Editar
  const abrirEditar = (lista: ListaSummary) => {
    setListaEditando(lista);
    setNomeEditado(lista.nome);
    setDescricaoEditada(lista.descricao || '');
    setAreaIdEditada(lista.area?.id ?? '');
    setShowModalEditar(true);
  };

  const handleEditar = async (e: FormEvent) => {
    e.preventDefault();
    if (!listaEditando) return;
    try {
      await api.put(`/v1/listas/${listaEditando.id}`, {
        nome: nomeEditado,
        descricao: descricaoEditada || undefined,
        areaId: areaIdEditada || null,
      });
      setShowModalEditar(false);
      fetchListas();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao editar lista');
    }
  };

  // Colaboradores — modal com checkboxes + salvar por assign
  const abrirColabs = async (lista: ListaSummary) => {
    setListaColabs(lista);
    setShowModalColabs(true);
    setLoadingColabs(true);
    try {
      const [listaData, usuariosData] = await Promise.all([
        api.get(`/v1/listas/${lista.id}`),
        api.get('/v1/admin/usuarios'),
      ]);
      const atuais: Usuario[] = listaData.data.colaboradores.map((c: any) => c.usuario);
      setColaboradoresAtuais(atuais);
      setTodosUsuarios(usuariosData.data);
      setColabsSelected(new Set(atuais.map((u) => u.id)));
    } catch {
      setError('Erro ao carregar colaboradores');
    } finally {
      setLoadingColabs(false);
    }
  };

  const toggleColabSelected = (userId: number) => {
    setColabsSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const salvarColabs = async () => {
    if (!listaColabs) return;
    setSavingColabs(true);
    try {
      await api.post(`/v1/listas/${listaColabs.id}/assign`, {
        colaboradorIds: Array.from(colabsSelected),
      });
      setShowModalColabs(false);
      fetchListas();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar colaboradores');
    } finally {
      setSavingColabs(false);
    }
  };

  // Vincular área
  const abrirVincularArea = (lista: ListaSummary) => {
    setListaArea(lista);
    setAreaIdVincular(lista.area?.id ?? '');
    setSyncColabs(false);
    setShowModalArea(true);
  };

  const salvarArea = async () => {
    if (!listaArea) return;
    setSavingArea(true);
    try {
      await api.put(`/v1/listas/${listaArea.id}`, {
        areaId: areaIdVincular || null,
      });
      if (syncColabs && areaIdVincular) {
        const { data: areaColabs } = await api.get(`/v1/areas/${areaIdVincular}/colaboradores`);
        const ids = areaColabs.map((ac: any) => ac.usuario.id);
        await api.post(`/v1/listas/${listaArea.id}/assign`, { colaboradorIds: ids });
      }
      setShowModalArea(false);
      fetchListas();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao vincular área');
    } finally {
      setSavingArea(false);
    }
  };

  // Lixeira
  const abrirLixeira = async () => {
    setShowModalLixeira(true);
    setSelectedLixeira(new Set());
    setLoadingLixeira(true);
    try {
      const { data } = await api.get('/v1/listas/deletadas');
      setListasDeleted(data);
    } catch {
      setError('Erro ao carregar lixeira');
    } finally {
      setLoadingLixeira(false);
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await api.post(`/v1/listas/${id}/restaurar`);
      setListasDeleted((prev) => prev.filter((l) => l.id !== id));
      setSelectedLixeira((prev) => { const s = new Set(prev); s.delete(id); return s; });
      fetchListas();
    } catch {
      setError('Erro ao restaurar lista');
    }
  };

  const handlePermanentDelete = async (id: number, nomeLista: string) => {
    if (!confirm(`Deletar permanentemente "${nomeLista}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/v1/listas/${id}/permanente`);
      setListasDeleted((prev) => prev.filter((l) => l.id !== id));
      setSelectedLixeira((prev) => { const s = new Set(prev); s.delete(id); return s; });
    } catch {
      setError('Erro ao deletar permanentemente');
    }
  };

  const toggleLixeiraSelect = (id: number) => {
    setSelectedLixeira((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchDelete = async () => {
    const ids = Array.from(selectedLixeira);
    if (ids.length === 0) return;
    if (!confirm(`Deletar permanentemente ${ids.length} lista(s)? Esta ação não pode ser desfeita.`)) return;
    setDeletingBatch(true);
    try {
      await api.post('/v1/listas/batch-permanente', { ids });
      setListasDeleted((prev) => prev.filter((l) => !ids.includes(l.id)));
      setSelectedLixeira(new Set());
    } catch {
      setError('Erro ao deletar em lote');
    } finally {
      setDeletingBatch(false);
    }
  };

  // Exportar CSV
  const handleExportCsv = async (lista: ListaSummary) => {
    try {
      const { data } = await api.get(`/v1/listas/${lista.id}/export-csv`);
      const blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${lista.nome.replace(/[^a-z0-9]/gi, '_')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Erro ao exportar CSV');
    }
  };

  // Importar CSV
  const abrirImport = (lista: ListaSummary) => {
    setListaImport(lista);
    setShowModalImport(true);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !listaImport) return;
    setImporting(true);
    try {
      const texto = await file.text();
      const { data } = await api.post(`/v1/listas/${listaImport.id}/import-csv`, { texto });
      setShowModalImport(false);
      fetchListas();
      setError('');
      alert(`Importação concluída: ${data.adicionados} adicionados, ${data.ignorados} ignorados.`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao importar CSV');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const toggleListaGrupoSelecionada = (listaId: number) => {
    setListasGrupoSelecionadas((prev) => {
      const next = new Set(prev);
      if (next.has(listaId)) next.delete(listaId);
      else next.add(listaId);
      return next;
    });
  };

  const handleCriarGrupo = async () => {
    setSavingGrupo(true);
    try {
      await api.post('/v1/admin/grupos-listas', {
        nomeGrupo: nomeGrupo.trim(),
        listaIds: Array.from(listasGrupoSelecionadas),
      });
      setShowModalCriarGrupo(false);
      setNomeGrupo('');
      setListasGrupoSelecionadas(new Set());
      fetchListas();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao criar grupo');
    } finally {
      setSavingGrupo(false);
    }
  };

  const abrirModalGrupo = () => {
    setShowModalCriarGrupo(true);
    setModoEditarGrupo(false);
    setNomeGrupo('');
    setListasGrupoSelecionadas(new Set());
    setGrupoEdicaoId('');
    setNomeGrupoEdicao('');
    setListaAdicionarGrupoId('');
    setBuscaListaGrupo('');
  };

  const alternarModoEditarGrupo = (checked: boolean) => {
    setModoEditarGrupo(checked);
    if (!checked) {
      setGrupoEdicaoId('');
      setNomeGrupoEdicao('');
      setListaAdicionarGrupoId('');
      return;
    }

    if (grupos.length > 0) {
      setGrupoEdicaoId(grupos[0].id);
      setNomeGrupoEdicao(grupos[0].nome);
      setListaAdicionarGrupoId('');
    }
  };

  const selecionarGrupoEdicao = (grupoId: number | '') => {
    setGrupoEdicaoId(grupoId);
    if (grupoId === '') {
      setNomeGrupoEdicao('');
      return;
    }
    const grupo = grupos.find((g) => g.id === grupoId);
    setNomeGrupoEdicao(grupo?.nome || '');
  };

  const salvarNomeGrupoEdicao = async () => {
    if (!grupoEdicaoId || !nomeGrupoEdicao.trim()) return;
    setSavingGrupoEdicao(true);
    try {
      await api.put(`/v1/admin/grupos-listas/${grupoEdicaoId}`, {
        nomeGrupo: nomeGrupoEdicao.trim(),
      });
      await fetchListas();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao renomear grupo');
    } finally {
      setSavingGrupoEdicao(false);
    }
  };

  const adicionarListaNoGrupoEdicao = async () => {
    if (!grupoEdicaoId || !listaAdicionarGrupoId) return;
    setSavingGrupoEdicao(true);
    try {
      await api.post(`/v1/admin/grupos-listas/${grupoEdicaoId}/listas`, {
        listaId: listaAdicionarGrupoId,
      });
      setListaAdicionarGrupoId('');
      await fetchListas();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao adicionar lista ao grupo');
    } finally {
      setSavingGrupoEdicao(false);
    }
  };

  const removerListaDoGrupoEdicao = async (grupoId: number, listaId: number) => {
    setSavingGrupoEdicao(true);
    try {
      await api.delete(`/v1/admin/grupos-listas/${grupoId}/listas/${listaId}`);
      await fetchListas();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao remover lista do grupo');
    } finally {
      setSavingGrupoEdicao(false);
    }
  };

  const excluirGrupoEdicao = async () => {
    if (!grupoEdicaoId) return;
    const grupoAtual = grupos.find((g) => g.id === grupoEdicaoId);
    if (!grupoAtual) return;

    if (
      !confirm(
        `Deletar o grupo "${grupoAtual.nome}"? Todas as listas serão desvinculadas.`,
      )
    ) {
      return;
    }

    setSavingGrupoEdicao(true);
    try {
      await api.delete(`/v1/admin/grupos-listas/${grupoEdicaoId}`);
      await fetchListas();
      if (grupos.length > 1) {
        const proximo = grupos.find((g) => g.id !== grupoEdicaoId);
        setGrupoEdicaoId(proximo?.id ?? '');
        setNomeGrupoEdicao(proximo?.nome ?? '');
      } else {
        setGrupoEdicaoId('');
        setNomeGrupoEdicao('');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao deletar grupo');
    } finally {
      setSavingGrupoEdicao(false);
    }
  };

  const abrirVincularGrupo = (lista: ListaSummary) => {
    setListaVincularGrupo(lista);
    setGrupoSelecionadoId('');
    setShowModalVincularGrupo(true);
  };

  const salvarVinculoGrupo = async () => {
    if (!listaVincularGrupo || !grupoSelecionadoId) return;
    setSavingVinculoGrupo(true);
    try {
      await api.post(`/v1/admin/grupos-listas/${grupoSelecionadoId}/listas`, {
        listaId: listaVincularGrupo.id,
      });
      setShowModalVincularGrupo(false);
      fetchListas();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao vincular lista ao grupo');
    } finally {
      setSavingVinculoGrupo(false);
    }
  };

  const removerListaDoGrupo = async (lista: ListaSummary) => {
    if (!lista.grupo) return;
    if (!confirm(`Remover "${lista.nome}" do grupo "${lista.grupo.nome}"?`)) return;
    try {
      await api.delete(`/v1/admin/grupos-listas/${lista.grupo.id}/listas/${lista.id}`);
      fetchListas();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao remover lista do grupo');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <h2 className={styles.pageTitle}>Listas</h2>
          <div className={styles.headerActions}>
            <div className={styles.searchWrapper}>
              <FaSearch className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Buscar lista ou item..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingRight: search ? '2rem' : undefined }}
              />
              {search && (
                <button
                  className={styles.searchClear}
                  onClick={() => setSearch('')}
                  type="button"
                  aria-label="Limpar busca"
                >
                  <FaTimes />
                </button>
              )}
            </div>
            <div className={styles.lixeiraBtn}>
              <Button variant="outline-secondary" size="sm" onClick={abrirLixeira}>
                <FaTrash className="me-1" /> Lixeira
              </Button>
            </div>
            <Button
              variant="outline-warning"
              size="sm"
              onClick={abrirModalGrupo}
            >
              <FaLink className="me-1" /> Grupo
            </Button>
            <Button variant="primary" onClick={() => setShowModalCriar(true)}>
              <FaPlus /> Nova Lista
            </Button>
          </div>
        </div>

        {/* Filtros de área */}
        {areas.length > 0 && (
          <div className={styles.filtrosArea}>
            <button
              className={`${styles.filtroBtn} ${areaFiltro === null ? styles.filtroBtnAtivo : ''}`}
              onClick={() => setAreaFiltro(null)}
            >
              Todas
            </button>
            <button
              className={`${styles.filtroBtn} ${areaFiltro === 0 ? styles.filtroBtnAtivo : ''}`}
              onClick={() => setAreaFiltro(0)}
            >
              Sem área
            </button>
            {areasFiltro.map((a) => (
              <button
                key={a.id}
                className={`${styles.filtroBtn} ${areaFiltro === a.id ? styles.filtroBtnAtivo : ''}`}
                onClick={() => setAreaFiltro(a.id)}
              >
                {a.nome}
              </button>
            ))}
          </div>
        )}

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <div className={styles.listsGrid}>
          <div
            className={`${styles.listCard} ${styles.cardCriar}`}
            onClick={() => setShowModalCriar(true)}
          >
            <div className={styles.criarContent}>
              <div className={styles.criarIcon}>
                <FaPlus />
              </div>
              <p className={styles.criarText}>Criar Nova Lista</p>
            </div>
          </div>

          {listasFiltradas.map((lista) => (
            <div key={lista.id} className={`${styles.listCard} ${styles.cardLista}`}>
              <div className={styles.listHeader}>
                <div className={styles.listIcon}>
                  <FaList />
                </div>
                {lista.area && (
                  <span className={styles.areaBadge}>
                    <FaMapMarkerAlt className="me-1" />
                    {lista.area.nome}
                  </span>
                )}
                {lista.grupo && (
                  <span className={styles.areaBadge}>
                    <FaLink className="me-1" />
                    Grupo: {lista.grupo.nome}
                  </span>
                )}
              </div>

              <h3 className={styles.listName}>{lista.nome}</h3>

              {lista.descricao && (
                <p className={styles.descricaoCard}>{lista.descricao}</p>
              )}

              <p className={styles.listDescription}>
                {lista._count.itensRef} itens •{' '}
                {lista._count.colaboradores} colaborador
                {lista._count.colaboradores !== 1 ? 'es' : ''}
              </p>

              {lista.itensRef.length > 0 && (
                <ul className={styles.itemPreviewList}>
                  {lista.itensRef.slice(0, 5).map((ref) => {
                    const baixo = ref.quantidadeAtual < ref.quantidadeMinima;
                    return (
                      <li
                        key={ref.id}
                        className={`${styles.itemPreviewItem} ${baixo ? styles.itemBaixo : ''}`}
                      >
                        <span className={styles.itemPreviewNome}>
                          {ref.item.nome} ({ref.item.unidadeMedida})
                        </span>
                        <span className={styles.itemPreviewQtd}>
                          {ref.quantidadeAtual}/{ref.quantidadeMinima}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className={styles.listMeta}>
                <span className={styles.metaItem}>
                  <strong>{lista._count.itensRef}</strong> itens
                </span>
                <span className={styles.metaItem}>
                  <strong>{lista._count.colaboradores}</strong> colab.
                </span>
              </div>

              <div className={styles.listActions}>
                <Button
                  variant="primary"
                  size="sm"
                  className={styles.gerenciarBtn}
                  onClick={() => router.push(`/admin/listas/${lista.id}/lista-mae`)}
                >
                  Gerenciar
                </Button>
                <Dropdown>
                  <Dropdown.Toggle
                    variant="secondary"
                    size="sm"
                    className={styles.acoesToggle}
                    id={`acoes-${lista.id}`}
                  >
                    Ações
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => router.push(`/collaborator/listas/${lista.id}`)}>
                      <FaShoppingCart className="me-2" />
                      Preencher Estoque
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item onClick={() => abrirColabs(lista)}>
                      <FaUsers className="me-2" />
                      Colaboradores
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => abrirVincularArea(lista)}>
                      <FaLink className="me-2" />
                      Vincular Área
                    </Dropdown.Item>
                    {lista.grupo ? (
                      <Dropdown.Item onClick={() => removerListaDoGrupo(lista)}>
                        <FaLink className="me-2" />
                        Remover do Grupo
                      </Dropdown.Item>
                    ) : (
                      <Dropdown.Item
                        onClick={() => abrirVincularGrupo(lista)}
                        disabled={grupos.length === 0}
                      >
                        <FaLink className="me-2" />
                        Vincular a Grupo
                      </Dropdown.Item>
                    )}
                    <Dropdown.Item onClick={() => abrirEditar(lista)}>
                      <FaEdit className="me-2" />
                      Editar
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => handleExportCsv(lista)}>
                      <FaDownload className="me-2" />
                      Exportar CSV
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => abrirImport(lista)}>
                      <FaUpload className="me-2" />
                      Importar CSV
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item
                      className="text-danger"
                      onClick={() => handleDelete(lista.id)}
                    >
                      <FaTrash className="me-2" />
                      Deletar
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </div>
            </div>
          ))}
        </div>

        {listasFiltradas.length === 0 && (
          <div className={styles.emptyState}>
            <FaList className={styles.emptyIcon} />
            <h3 className={styles.emptyTitle}>
              {search ? 'Nenhuma lista encontrada' : 'Nenhuma lista cadastrada'}
            </h3>
            <p className={styles.emptyText}>
              {search
                ? `Sem resultados para "${search}"`
                : 'Clique em "Nova Lista" para criar sua primeira lista'}
            </p>
          </div>
        )}

        {/* Modal Criar */}
        <Modal show={showModalCriar} onHide={() => { setShowModalCriar(false); setNome(''); setDescricao(''); setAreaIdCriar(''); }}>
          <Form onSubmit={handleCreate}>
            <Modal.Header closeButton>
              <Modal.Title>Nova Lista</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form.Group className="mb-3">
                <Form.Label>Nome</Form.Label>
                <Form.Control
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Lista Semanal"
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Descrição <span className="text-muted">(opcional)</span></Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Lista de itens para reposição semanal"
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Área <span className="text-muted">(opcional)</span></Form.Label>
                <Form.Select value={areaIdCriar} onChange={(e) => setAreaIdCriar(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">Sem área</option>
                  {areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </Form.Select>
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => { setShowModalCriar(false); setNome(''); setDescricao(''); setAreaIdCriar(''); }}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                Criar
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* Modal Editar */}
        <Modal show={showModalEditar} onHide={() => setShowModalEditar(false)}>
          <Form onSubmit={handleEditar}>
            <Modal.Header closeButton>
              <Modal.Title>Editar Lista</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form.Group className="mb-3">
                <Form.Label>Nome</Form.Label>
                <Form.Control
                  value={nomeEditado}
                  onChange={(e) => setNomeEditado(e.target.value)}
                  placeholder="Nome da lista"
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Descrição <span className="text-muted">(opcional)</span></Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={descricaoEditada}
                  onChange={(e) => setDescricaoEditada(e.target.value)}
                  placeholder="Descrição da lista"
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Área <span className="text-muted">(opcional)</span></Form.Label>
                <Form.Select value={areaIdEditada} onChange={(e) => setAreaIdEditada(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">Sem área</option>
                  {areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </Form.Select>
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowModalEditar(false)}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                Salvar
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* Modal Colaboradores */}
        <Modal show={showModalColabs} onHide={() => setShowModalColabs(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Colaboradores — {listaColabs?.nome}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {loadingColabs ? (
              <div className="text-center py-3">
                <Spinner animation="border" size="sm" />
              </div>
            ) : todosUsuarios.length === 0 ? (
              <p className="text-muted text-center">Nenhum usuário disponível</p>
            ) : (
              todosUsuarios.map((usuario) => (
                <div key={usuario.id} className={styles.colaboradorItem}>
                  <div className={styles.colaboradorInfo}>
                    <span className={styles.colaboradorNome}>{usuario.nome}</span>
                    <span className={styles.colaboradorEmail}>{usuario.email}</span>
                  </div>
                  <Form.Check
                    type="switch"
                    id={`colab-${usuario.id}`}
                    checked={colabsSelected.has(usuario.id)}
                    onChange={() => toggleColabSelected(usuario.id)}
                  />
                </div>
              ))
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModalColabs(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={salvarColabs} disabled={savingColabs}>
              {savingColabs ? <Spinner size="sm" animation="border" /> : 'Salvar'}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Modal Vincular Área */}
        <Modal show={showModalArea} onHide={() => setShowModalArea(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Vincular Área — {listaArea?.nome}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Área</Form.Label>
              <Form.Select
                value={areaIdVincular}
                onChange={(e) => setAreaIdVincular(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Sem área</option>
                {areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </Form.Select>
            </Form.Group>
            {areaIdVincular && (
              <Form.Check
                type="checkbox"
                id="sync-colabs"
                label="Sincronizar colaboradores desta área"
                checked={syncColabs}
                onChange={(e) => setSyncColabs(e.target.checked)}
              />
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModalArea(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={salvarArea} disabled={savingArea}>
              {savingArea ? <Spinner size="sm" animation="border" /> : 'Salvar'}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Modal Lixeira */}
        <Modal show={showModalLixeira} onHide={() => setShowModalLixeira(false)}>
          <Modal.Header closeButton>
            <Modal.Title>
              Lixeira {listasDeleted.length > 0 && `(${listasDeleted.length})`}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {loadingLixeira ? (
              <div className="text-center py-3">
                <Spinner animation="border" size="sm" />
              </div>
            ) : listasDeleted.length === 0 ? (
              <p className="text-muted text-center py-2">A lixeira está vazia</p>
            ) : (
              listasDeleted.map((lista) => (
                <div key={lista.id} className={styles.lixeiraItem}>
                  <Form.Check
                    type="checkbox"
                    checked={selectedLixeira.has(lista.id)}
                    onChange={() => toggleLixeiraSelect(lista.id)}
                    className={styles.lixeiraCheck}
                  />
                  <div className={styles.lixeiraItemInfo}>
                    <span className={styles.lixeiraItemNome}>{lista.nome}</span>
                    <span className={styles.lixeiraItemMeta}>
                      {lista._count.itensRef} iten{lista._count.itensRef !== 1 ? 's' : ''} •{' '}
                      {new Date(lista.criadoEm).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className={styles.lixeiraActions}>
                    <Button
                      variant="outline-success"
                      size="sm"
                      onClick={() => handleRestore(lista.id)}
                    >
                      Restaurar
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handlePermanentDelete(lista.id, lista.nome)}
                    >
                      <FaTrash />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </Modal.Body>
          <Modal.Footer>
            {selectedLixeira.size > 0 && (
              <Button
                variant="danger"
                size="sm"
                onClick={handleBatchDelete}
                disabled={deletingBatch}
                className="me-auto"
              >
                {deletingBatch
                  ? <Spinner size="sm" animation="border" />
                  : `Deletar selecionados (${selectedLixeira.size})`}
              </Button>
            )}
            <Button variant="secondary" onClick={() => setShowModalLixeira(false)}>
              Fechar
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Modal Importar CSV */}
        <Modal show={showModalImport} onHide={() => setShowModalImport(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Importar CSV — {listaImport?.nome}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="text-muted small mb-3">
              O arquivo CSV deve ter as colunas: <code>nome,unidade,quantidade_minima</code>.<br />
              Apenas itens já cadastrados serão importados. Duplicatas serão ignoradas.
            </p>
            <Form.Group>
              <Form.Label>Arquivo CSV</Form.Label>
              <Form.Control
                type="file"
                accept=".csv,text/csv"
                ref={fileInputRef}
                onChange={handleImportFile}
                disabled={importing}
              />
            </Form.Group>
            {importing && (
              <div className="text-center mt-3">
                <Spinner animation="border" size="sm" /> Importando...
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModalImport(false)}>
              Fechar
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Modal Grupo (Criar/Editar) */}
        <Modal
          show={showModalCriarGrupo}
          onHide={() => setShowModalCriarGrupo(false)}
          size="lg"
        >
          <Modal.Header closeButton>
            <Modal.Title>Grupo de Listas</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="row g-2 mb-3">
              <div className="col-6">
                <Button
                  variant={modoEditarGrupo ? 'outline-primary' : 'primary'}
                  className="w-100"
                  onClick={() => alternarModoEditarGrupo(false)}
                >
                  Criar grupo
                </Button>
              </div>
              <div className="col-6">
                <Button
                  variant={modoEditarGrupo ? 'primary' : 'outline-primary'}
                  className="w-100"
                  onClick={() => alternarModoEditarGrupo(true)}
                  disabled={grupos.length === 0}
                >
                  Editar grupo
                </Button>
              </div>
            </div>

            {modoEditarGrupo ? (
              grupos.length === 0 ? (
                <Alert variant="warning" className="mb-0">
                  Não há grupos cadastrados para editar.
                </Alert>
              ) : (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label>Grupo</Form.Label>
                    <Form.Select
                      value={grupoEdicaoId}
                      onChange={(e) =>
                        selecionarGrupoEdicao(
                          e.target.value ? Number(e.target.value) : '',
                        )
                      }
                    >
                      {grupos.map((grupo) => (
                        <option key={grupo.id} value={grupo.id}>
                          {grupo.nome} ({grupo._count.listas} lista
                          {grupo._count.listas !== 1 ? 's' : ''})
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>

                  {grupoSelecionadoEdicao && (
                    <>
                      <Form.Group className="mb-3">
                        <Form.Label>Nome do Grupo</Form.Label>
                        <div className="d-flex gap-2">
                          <Form.Control
                            value={nomeGrupoEdicao}
                            onChange={(e) => setNomeGrupoEdicao(e.target.value)}
                            placeholder="Nome do grupo"
                          />
                          <Button
                            variant="outline-primary"
                            onClick={salvarNomeGrupoEdicao}
                            disabled={savingGrupoEdicao || !nomeGrupoEdicao.trim()}
                          >
                            Salvar
                          </Button>
                        </div>
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>Listas vinculadas</Form.Label>
                        {grupoSelecionadoEdicao.listas.length === 0 ? (
                          <p className="text-muted mb-0">
                            Este grupo não possui listas.
                          </p>
                        ) : (
                          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                            {grupoSelecionadoEdicao.listas.map((lista) => (
                              <div
                                key={lista.id}
                                className="d-flex justify-content-between align-items-center border rounded px-2 py-1 mb-2"
                              >
                                <span>{lista.nome}</span>
                                <Button
                                  size="sm"
                                  variant="outline-danger"
                                  onClick={() =>
                                    removerListaDoGrupoEdicao(
                                      grupoSelecionadoEdicao.id,
                                      lista.id,
                                    )
                                  }
                                  disabled={savingGrupoEdicao}
                                >
                                  Remover
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </Form.Group>

                      <Form.Group>
                        <Form.Label>Adicionar lista ao grupo</Form.Label>
                        <Form.Control
                          className="mb-2"
                          value={buscaListaGrupo}
                          onChange={(e) => setBuscaListaGrupo(e.target.value)}
                          placeholder="Pesquisar por nome da lista ou item (sem diferenciar acento/maiúsculas)"
                        />
                        <div className="d-flex gap-2">
                          <Form.Select
                            value={listaAdicionarGrupoId}
                            onChange={(e) =>
                              setListaAdicionarGrupoId(
                                e.target.value ? Number(e.target.value) : '',
                              )
                            }
                          >
                            <option value="">Selecione uma lista</option>
                            {listasElegiveisParaGrupoFiltradas.map((lista) => (
                              <option key={lista.id} value={lista.id}>
                                {lista.nome}
                              </option>
                            ))}
                          </Form.Select>
                          <Button
                            variant="outline-success"
                            onClick={adicionarListaNoGrupoEdicao}
                            disabled={!listaAdicionarGrupoId || savingGrupoEdicao}
                          >
                            Vincular
                          </Button>
                        </div>
                      </Form.Group>
                    </>
                  )}
                </>
              )
            ) : (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Nome do Grupo</Form.Label>
                  <Form.Control
                    value={nomeGrupo}
                    onChange={(e) => setNomeGrupo(e.target.value)}
                    placeholder="Ex: Operação Turno Noite"
                    required
                  />
                </Form.Group>

                <Form.Group>
                  <Form.Label>Listas para incluir</Form.Label>
                  <Form.Control
                    className="mb-2"
                    value={buscaListaGrupo}
                    onChange={(e) => setBuscaListaGrupo(e.target.value)}
                    placeholder="Pesquisar por nome da lista ou item (sem diferenciar acento/maiúsculas)"
                  />
                  {listasElegiveisParaGrupo.length === 0 ? (
                    <p className="text-muted mb-0">
                      Não há listas elegíveis no momento.
                    </p>
                  ) : listasElegiveisParaGrupoFiltradas.length === 0 ? (
                    <p className="text-muted mb-0">
                      Nenhuma lista encontrada para essa busca.
                    </p>
                  ) : (
                    <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                      {listasElegiveisParaGrupoFiltradas.map((lista) => (
                        <Form.Check
                          key={lista.id}
                          id={`grupo-lista-${lista.id}`}
                          className="mb-2"
                          label={`${lista.nome} (${lista._count.itensRef} itens)`}
                          checked={listasGrupoSelecionadas.has(lista.id)}
                          onChange={() => toggleListaGrupoSelecionada(lista.id)}
                        />
                      ))}
                    </div>
                  )}
                </Form.Group>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            {modoEditarGrupo && grupoSelecionadoEdicao && (
              <Button
                variant="outline-danger"
                className="me-auto"
                onClick={excluirGrupoEdicao}
                disabled={savingGrupoEdicao}
              >
                Excluir Grupo
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => setShowModalCriarGrupo(false)}
            >
              Fechar
            </Button>
            {!modoEditarGrupo && (
              <Button
                variant="warning"
                onClick={handleCriarGrupo}
                disabled={savingGrupo || !nomeGrupo.trim()}
              >
                {savingGrupo ? <Spinner size="sm" animation="border" /> : 'Criar Grupo'}
              </Button>
            )}
          </Modal.Footer>
        </Modal>

        {/* Modal Vincular Lista a Grupo */}
        <Modal
          show={showModalVincularGrupo}
          onHide={() => setShowModalVincularGrupo(false)}
        >
          <Modal.Header closeButton>
            <Modal.Title>Vincular a Grupo</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="mb-2">
              Lista: <strong>{listaVincularGrupo?.nome}</strong>
            </p>
            <Form.Group>
              <Form.Label>Grupo</Form.Label>
              <Form.Select
                value={grupoSelecionadoId}
                onChange={(e) =>
                  setGrupoSelecionadoId(
                    e.target.value ? Number(e.target.value) : '',
                  )
                }
              >
                <option value="">Selecione um grupo</option>
                {grupos.map((grupo) => (
                  <option key={grupo.id} value={grupo.id}>
                    {grupo.nome} ({grupo._count.listas} lista
                    {grupo._count.listas !== 1 ? 's' : ''})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowModalVincularGrupo(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={salvarVinculoGrupo}
              disabled={!grupoSelecionadoId || savingVinculoGrupo}
            >
              {savingVinculoGrupo ? (
                <Spinner size="sm" animation="border" />
              ) : (
                'Vincular'
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
}
