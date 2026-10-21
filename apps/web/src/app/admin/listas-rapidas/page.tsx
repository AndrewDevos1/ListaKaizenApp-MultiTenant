'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Table, Alert, Spinner, Badge, Button, Tabs, Tab,
  Modal, Form,
} from 'react-bootstrap';
import Link from 'next/link';
import api from '@/lib/api';
import styles from './ListasRapidas.module.css';
import {
  FaClipboardList, FaEye, FaCheck, FaTimes, FaArchive,
  FaBolt, FaPlus, FaTrash, FaLightbulb,
} from 'react-icons/fa';

type Status = 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'ARQUIVADO';
type Prioridade = 'prevencao' | 'precisa_comprar' | 'urgente';

interface ListaRapida {
  id: number;
  nome: string;
  status: Status;
  criadoEm: string;
  usuario: { id: number; nome: string };
  _count?: { itens: number };
}

interface CatalogItem {
  id: number;
  nome: string;
  unidadeMedida: string;
}

interface SelectedItem {
  catalogId?: number;
  nome: string;
  unidadeMedida: string;
  quantidade: string;
  prioridade: Prioridade;
  observacao: string;
}

const STATUS_VARIANT: Record<Status, string> = {
  PENDENTE: 'warning',
  APROVADO: 'success',
  REJEITADO: 'danger',
  ARQUIVADO: 'secondary',
};

const UNIDADES = ['Un', 'Kg', 'g', 'L', 'ml', 'Cx', 'Pct', 'Fd'];

const PRIORIDADES: { key: Prioridade; label: string; variant: string }[] = [
  { key: 'prevencao',     label: 'Prevenção', variant: 'success' },
  { key: 'precisa_comprar', label: 'Precisa',  variant: 'warning' },
  { key: 'urgente',       label: 'Urgente',   variant: 'danger'  },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function gerarNomeAutomatico() {
  const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const now = new Date();
  const dia = dias[now.getDay()];
  const data = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return `Lista Rápida — ${dia} ${data}`;
}

function novoSelecionado(): SelectedItem {
  return { nome: '', unidadeMedida: 'Un', quantidade: '', prioridade: 'prevencao', observacao: '' };
}

export default function AdminListasRapidasPage() {
  const [listas, setListas] = useState<ListaRapida[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<Status>('PENDENTE');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // ─── Modal Criar ─────────────────────────────────────────────────────────────
  const [showCriar, setShowCriar] = useState(false);
  const [criarNome, setCriarNome] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [savingCriar, setSavingCriar] = useState(false);

  // Catálogo
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');

  // ─── Modal Sugerir ────────────────────────────────────────────────────────────
  const [showSugerir, setShowSugerir] = useState(false);
  const [sugerirNome, setSugerirNome] = useState('');
  const [sugerirUnidade, setSugerirUnidade] = useState('Un');
  const [savingSugerir, setSavingSugerir] = useState(false);

  // ─── Fetch listas ─────────────────────────────────────────────────────────────

  const fetchListas = useCallback(async (status: Status) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/v1/admin/listas-rapidas', { params: { status } });
      setListas(data);
    } catch {
      setError('Erro ao carregar listas rápidas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListas(activeTab);
  }, [activeTab, fetchListas]);

  // ─── Ações da tabela ──────────────────────────────────────────────────────────

  const handleAprovar = async (id: number) => {
    if (!confirm('Aprovar esta lista rápida?')) return;
    setActionLoading(id);
    setError('');
    try {
      await api.put(`/v1/admin/listas-rapidas/${id}/aprovar`);
      setSuccess('Lista aprovada com sucesso!');
      fetchListas(activeTab);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao aprovar lista');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejeitar = async (id: number) => {
    if (!confirm('Rejeitar esta lista rápida?')) return;
    setActionLoading(id);
    setError('');
    try {
      await api.put(`/v1/admin/listas-rapidas/${id}/rejeitar`);
      setSuccess('Lista rejeitada.');
      fetchListas(activeTab);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao rejeitar lista');
    } finally {
      setActionLoading(null);
    }
  };

  const handleArquivar = async (id: number) => {
    if (!confirm('Arquivar esta lista rápida?')) return;
    setActionLoading(id);
    setError('');
    try {
      await api.put(`/v1/admin/listas-rapidas/${id}/arquivar`);
      setSuccess('Lista arquivada.');
      fetchListas(activeTab);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao arquivar lista');
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Modal Criar — lógica ────────────────────────────────────────────────────

  const abrirCriar = async () => {
    setCriarNome(gerarNomeAutomatico());
    setSelectedItems([]);
    setCatalogSearch('');
    setShowCriar(true);

    setLoadingCatalog(true);
    try {
      const { data } = await api.get<CatalogItem[]>('/v1/items');
      setCatalogItems(data);
    } catch {
      // silent — catalog unavailable
    } finally {
      setLoadingCatalog(false);
    }
  };

  const addFromCatalog = (item: CatalogItem) => {
    if (selectedItems.some((s) => s.catalogId === item.id)) return;
    setSelectedItems((prev) => [
      ...prev,
      {
        catalogId: item.id,
        nome: item.nome,
        unidadeMedida: item.unidadeMedida,
        quantidade: '',
        prioridade: 'prevencao',
        observacao: '',
      },
    ]);
  };

  const removeSelected = (idx: number) =>
    setSelectedItems((prev) => prev.filter((_, i) => i !== idx));

  const updateSelected = (idx: number, field: 'quantidade' | 'observacao', value: string) =>
    setSelectedItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)),
    );

  const setPrioridade = (idx: number, value: Prioridade) =>
    setSelectedItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, prioridade: value } : it)),
    );

  const catalogFiltered = catalogItems.filter((item) =>
    item.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(
      catalogSearch.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
    ),
  );

  const handleCriar = async () => {
    if (!criarNome.trim()) return;

    const itensPayload = selectedItems.map((s) => ({
      nome: s.nome,
      quantidade: s.quantidade ? parseFloat(s.quantidade) : undefined,
      unidade: s.unidadeMedida || undefined,
      itemId: s.catalogId,
      prioridade: s.prioridade,
      observacao: s.observacao.trim() || undefined,
    }));

    setSavingCriar(true);
    setError('');
    try {
      const { data: lista } = await api.post('/v1/collaborator/listas-rapidas', {
        nome: criarNome.trim(),
        itens: itensPayload,
      });

      if (itensPayload.length > 0) {
        await api.post(`/v1/collaborator/listas-rapidas/${lista.id}/submeter`);
        await api.put(`/v1/admin/listas-rapidas/${lista.id}/aprovar`);
        setActiveTab('APROVADO');
        setSuccess('Lista rápida criada e aprovada!');
        fetchListas('APROVADO');
      } else {
        setSuccess('Lista rápida criada como rascunho (sem itens).');
        fetchListas(activeTab);
      }

      setShowCriar(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao criar lista rápida');
    } finally {
      setSavingCriar(false);
    }
  };

  // ─── Modal Sugerir — lógica ───────────────────────────────────────────────────

  const handleSugerir = async () => {
    if (!sugerirNome.trim()) return;
    setSavingSugerir(true);
    try {
      await api.post('/v1/collaborator/sugestoes', {
        nome: sugerirNome.trim(),
        unidadeMedida: sugerirUnidade,
      });
      setShowSugerir(false);
      setSugerirNome('');
      setSugerirUnidade('Un');
      setSuccess('Sugestão enviada! O admin irá analisá-la.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao enviar sugestão');
    } finally {
      setSavingSugerir(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <h2 className={styles.pageTitle}>
            <FaClipboardList className="me-2" />
            Listas Rápidas
          </h2>
          <Button variant="primary" size="sm" onClick={abrirCriar}>
            <FaBolt className="me-1" /> Nova Lista Rápida
          </Button>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <div className={styles.tabsWrapper}>
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => {
              setSuccess('');
              setActiveTab(k as Status);
            }}
            className="mb-3"
          >
            <Tab eventKey="PENDENTE" title="Pendente" />
            <Tab eventKey="APROVADO" title="Aprovado" />
            <Tab eventKey="REJEITADO" title="Rejeitado" />
            <Tab eventKey="ARQUIVADO" title="Arquivado" />
          </Tabs>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
          </div>
        ) : listas.length === 0 ? (
          <div className={styles.emptyState}>
            <FaClipboardList className={styles.emptyIcon} />
            <h3 className={styles.emptyTitle}>Nenhuma lista encontrada</h3>
            <p className={styles.emptyText}>
              Nenhuma lista rápida com status &ldquo;{activeTab}&rdquo; no momento.
            </p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <Table striped bordered hover responsive className={styles.table}>
              <thead>
                <tr className={styles.tableHeader}>
                  <th className={styles.tableHeaderCell}>#</th>
                  <th className={styles.tableHeaderCell}>Nome</th>
                  <th className={styles.tableHeaderCell}>Colaborador</th>
                  <th className={styles.tableHeaderCell}>Data</th>
                  <th className={styles.tableHeaderCell}>Status</th>
                  <th className={styles.tableHeaderCell} style={{ width: 220 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {listas.map((lista) => (
                  <tr key={lista.id} className={styles.tableRow}>
                    <td className={styles.tableCell}>{lista.id}</td>
                    <td className={`${styles.tableCell} fw-semibold`}>{lista.nome}</td>
                    <td className={styles.tableCell}>{lista.usuario.nome}</td>
                    <td className={styles.tableCell}>{formatDate(lista.criadoEm)}</td>
                    <td className={styles.tableCell}>
                      <Badge bg={STATUS_VARIANT[lista.status]}>{lista.status}</Badge>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.actionButtons}>
                        <Link href={`/admin/listas-rapidas/${lista.id}`} passHref>
                          <Button size="sm" variant="outline-secondary" title="Ver detalhes">
                            <FaEye />
                          </Button>
                        </Link>
                        {lista.status === 'PENDENTE' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline-success"
                              title="Aprovar"
                              onClick={() => handleAprovar(lista.id)}
                              disabled={actionLoading === lista.id}
                            >
                              {actionLoading === lista.id ? (
                                <Spinner animation="border" size="sm" />
                              ) : (
                                <FaCheck />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              title="Rejeitar"
                              onClick={() => handleRejeitar(lista.id)}
                              disabled={actionLoading === lista.id}
                            >
                              <FaTimes />
                            </Button>
                          </>
                        )}
                        {(lista.status === 'APROVADO' || lista.status === 'REJEITADO') && (
                          <Button
                            size="sm"
                            variant="outline-warning"
                            title="Arquivar"
                            onClick={() => handleArquivar(lista.id)}
                            disabled={actionLoading === lista.id}
                          >
                            {actionLoading === lista.id ? (
                              <Spinner animation="border" size="sm" />
                            ) : (
                              <FaArchive />
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </div>

      {/* ── Modal Criar Lista Rápida ── */}
      <Modal show={showCriar} onHide={() => setShowCriar(false)} centered size="xl" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaBolt className="me-2 text-warning" />Nova Lista Rápida
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Nome */}
          <Form.Group className="mb-3">
            <Form.Label>Nome da lista <span className="text-danger">*</span></Form.Label>
            <div className="d-flex gap-2">
              <Form.Control
                value={criarNome}
                onChange={(e) => setCriarNome(e.target.value)}
                disabled={savingCriar}
                placeholder="Ex.: Lista Rápida — Segunda 14/07"
              />
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => setCriarNome(gerarNomeAutomatico())}
                disabled={savingCriar}
                title="Gerar nome automático"
                style={{ whiteSpace: 'nowrap' }}
              >
                Auto
              </Button>
            </div>
          </Form.Group>

          {/* Two-panel */}
          <div className={styles.panelGrid}>
            {/* Esquerdo — Catálogo */}
            <div className={styles.catalogPanel}>
              <div className={styles.panelHeader}>
                <span className={styles.panelTitle}>Catálogo de Itens</span>
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 text-decoration-none"
                  onClick={() => setShowSugerir(true)}
                  disabled={savingCriar}
                >
                  <FaLightbulb className="me-1 text-warning" />
                  <small>Sugerir item</small>
                </Button>
              </div>
              <Form.Control
                className="mb-2"
                placeholder="Buscar item..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                size="sm"
              />
              <div className={styles.catalogList}>
                {loadingCatalog ? (
                  <div className="text-center py-3">
                    <Spinner animation="border" size="sm" />
                  </div>
                ) : catalogFiltered.length === 0 ? (
                  <p className="text-muted small text-center py-3 mb-0">
                    {catalogSearch ? 'Nenhum item encontrado' : 'Nenhum item no catálogo'}
                  </p>
                ) : (
                  catalogFiltered.map((item) => {
                    const isAdded = selectedItems.some((s) => s.catalogId === item.id);
                    return (
                      <div key={item.id} className={styles.catalogItem}>
                        <div>
                          <span className={styles.catalogItemNome}>{item.nome}</span>
                          <span className={styles.catalogItemUnidade}>{item.unidadeMedida}</span>
                        </div>
                        <Button
                          variant={isAdded ? 'success' : 'outline-primary'}
                          size="sm"
                          onClick={() => !isAdded && addFromCatalog(item)}
                          disabled={isAdded || savingCriar}
                          title={isAdded ? 'Já adicionado' : 'Adicionar à lista'}
                        >
                          {isAdded ? <FaCheck /> : <FaPlus />}
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Direito — Itens selecionados */}
            <div className={styles.selectedPanel}>
              <div className={styles.panelHeader}>
                <span className={styles.panelTitle}>Itens Selecionados</span>
                <Badge bg="secondary">{selectedItems.length}</Badge>
              </div>
              <div className={styles.selectedList}>
                {selectedItems.length === 0 ? (
                  <p className="text-muted small text-center py-4 mb-0">
                    Selecione itens do catálogo ao lado
                  </p>
                ) : (
                  selectedItems.map((item, idx) => (
                    <div key={idx} className={styles.selectedItem}>
                      <div className={styles.selectedItemHeader}>
                        <span className={styles.selectedItemNome}>{item.nome}</span>
                        <span className={styles.selectedItemUnidade}>{item.unidadeMedida}</span>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => removeSelected(idx)}
                          disabled={savingCriar}
                          className="ms-auto flex-shrink-0"
                          title="Remover"
                        >
                          <FaTrash />
                        </Button>
                      </div>
                      <div className={styles.priorityRow}>
                        <div className={styles.priorityBtns}>
                          {PRIORIDADES.map((p) => (
                            <Button
                              key={p.key}
                              size="sm"
                              variant={
                                item.prioridade === p.key ? p.variant : `outline-${p.variant}`
                              }
                              onClick={() => setPrioridade(idx, p.key)}
                              disabled={savingCriar}
                              className={styles.priorityBtn}
                            >
                              {p.label}
                            </Button>
                          ))}
                        </div>
                        <Form.Control
                          type="number"
                          placeholder="Qtd"
                          value={item.quantidade}
                          onChange={(e) => updateSelected(idx, 'quantidade', e.target.value)}
                          disabled={savingCriar}
                          min={0}
                          size="sm"
                          style={{ width: 68 }}
                        />
                      </div>
                      <Form.Control
                        placeholder="Observação (opcional)"
                        value={item.observacao}
                        onChange={(e) => updateSelected(idx, 'observacao', e.target.value)}
                        disabled={savingCriar}
                        size="sm"
                        className="mt-1"
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <p className="text-muted small mb-0">
            A lista será criada e aprovada automaticamente.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCriar(false)} disabled={savingCriar}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleCriar}
            disabled={savingCriar || !criarNome.trim()}
          >
            {savingCriar ? (
              <><Spinner animation="border" size="sm" className="me-1" /> Criando...</>
            ) : (
              <><FaBolt className="me-1" /> Criar e Aprovar</>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Modal Sugerir Novo Item ── */}
      <Modal show={showSugerir} onHide={() => setShowSugerir(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaLightbulb className="me-2 text-warning" />Sugerir Novo Item
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Nome do item <span className="text-danger">*</span></Form.Label>
            <Form.Control
              value={sugerirNome}
              onChange={(e) => setSugerirNome(e.target.value)}
              placeholder="Ex.: Páprica Defumada"
              disabled={savingSugerir}
              autoFocus
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Unidade de Medida</Form.Label>
            <Form.Select
              value={sugerirUnidade}
              onChange={(e) => setSugerirUnidade(e.target.value)}
              disabled={savingSugerir}
            >
              {UNIDADES.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSugerir(false)} disabled={savingSugerir}>
            Cancelar
          </Button>
          <Button
            variant="warning"
            onClick={handleSugerir}
            disabled={savingSugerir || !sugerirNome.trim()}
          >
            {savingSugerir ? (
              <><Spinner animation="border" size="sm" className="me-1" /> Enviando...</>
            ) : (
              <><FaLightbulb className="me-1" /> Enviar Sugestão</>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
