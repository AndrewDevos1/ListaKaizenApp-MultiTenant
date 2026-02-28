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

interface ListaSummary {
  id: number;
  nome: string;
  descricao?: string | null;
  criadoEm: string;
  area?: Area | null;
  _count: { colaboradores: number; itensRef: number };
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

  const fetchListas = async () => {
    try {
      setLoading(true);
      const [listasRes, areasRes] = await Promise.all([
        api.get('/v1/listas'),
        api.get('/v1/areas'),
      ]);
      setListas(listasRes.data);
      setAreas(areasRes.data);
    } catch {
      setError('Erro ao carregar listas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListas();
  }, []);

  const listasFiltradas = listas.filter((l) => {
    if (areaFiltro !== null) {
      if (areaFiltro === 0) {
        if (l.area !== null && l.area !== undefined) return false;
      } else {
        if (l.area?.id !== areaFiltro) return false;
      }
    }
    if (!search) return true;
    const termo = normalizeText(search);
    const nomeMatch = normalizeText(l.nome).includes(termo);
    const itemMatch = l.itensRef.some((r) => normalizeText(r.item.nome).includes(termo));
    return nomeMatch || itemMatch;
  });

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
            {areas.map((a) => (
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
                  onClick={() => router.push(`/admin/listas/${lista.id}`)}
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
                    <Dropdown.Item onClick={() => abrirColabs(lista)}>
                      <FaUsers className="me-2" />
                      Colaboradores
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => abrirVincularArea(lista)}>
                      <FaLink className="me-2" />
                      Vincular Área
                    </Dropdown.Item>
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
      </div>
    </div>
  );
}
