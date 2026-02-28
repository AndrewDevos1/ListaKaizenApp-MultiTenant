'use client';

import { useState, useEffect, useCallback } from 'react';
import { Table, Alert, Spinner, Badge, Button, Tabs, Tab, Modal, Form } from 'react-bootstrap';
import Link from 'next/link';
import api from '@/lib/api';
import styles from './ListasRapidas.module.css';
import {
  FaClipboardList, FaEye, FaCheck, FaTimes, FaArchive,
  FaBolt, FaPlus, FaTrash,
} from 'react-icons/fa';

type Status = 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'ARQUIVADO';

interface ListaRapida {
  id: number;
  nome: string;
  status: Status;
  criadoEm: string;
  usuario: { id: number; nome: string };
  _count?: { itens: number };
}

interface ItemForm {
  nome: string;
  quantidade: string;
  unidade: string;
}

const STATUS_VARIANT: Record<Status, string> = {
  PENDENTE: 'warning',
  APROVADO: 'success',
  REJEITADO: 'danger',
  ARQUIVADO: 'secondary',
};

const UNIDADES = ['Un', 'Kg', 'g', 'L', 'ml', 'Cx', 'Pct', 'Fd'];

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

function novoItem(): ItemForm {
  return { nome: '', quantidade: '', unidade: 'Un' };
}

export default function AdminListasRapidasPage() {
  const [listas, setListas] = useState<ListaRapida[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<Status>('PENDENTE');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Modal Criar
  const [showCriar, setShowCriar] = useState(false);
  const [criarNome, setCriarNome] = useState('');
  const [criarItens, setCriarItens] = useState<ItemForm[]>([novoItem()]);
  const [savingCriar, setSavingCriar] = useState(false);

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

  // ─── Ações da tabela ────────────────────────────────────────────────────────

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

  // ─── Modal Criar ────────────────────────────────────────────────────────────

  const abrirCriar = () => {
    setCriarNome(gerarNomeAutomatico());
    setCriarItens([novoItem()]);
    setShowCriar(true);
  };

  const addItem = () => setCriarItens((prev) => [...prev, novoItem()]);

  const removeItem = (idx: number) =>
    setCriarItens((prev) => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: keyof ItemForm, value: string) =>
    setCriarItens((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)),
    );

  const handleCriar = async () => {
    if (!criarNome.trim()) return;

    const itensValidos = criarItens
      .filter((it) => it.nome.trim())
      .map((it) => ({
        nome: it.nome.trim(),
        quantidade: it.quantidade ? parseFloat(it.quantidade) : undefined,
        unidade: it.unidade || undefined,
      }));

    setSavingCriar(true);
    setError('');
    try {
      // 1. Cria a lista
      const { data: lista } = await api.post('/v1/collaborator/listas-rapidas', {
        nome: criarNome.trim(),
        itens: itensValidos,
      });

      // 2. Submete (requer ao menos 1 item)
      if (itensValidos.length > 0) {
        await api.post(`/v1/collaborator/listas-rapidas/${lista.id}/submeter`);
        // 3. Aprova automaticamente (admin criou)
        await api.put(`/v1/admin/listas-rapidas/${lista.id}/aprovar`);
        setActiveTab('APROVADO');
        setSuccess('Lista rápida criada e aprovada!');
      } else {
        setSuccess('Lista rápida criada como rascunho (sem itens).');
      }

      setShowCriar(false);
      fetchListas(itensValidos.length > 0 ? 'APROVADO' : activeTab);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao criar lista rápida');
    } finally {
      setSavingCriar(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

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
      <Modal show={showCriar} onHide={() => setShowCriar(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title><FaBolt className="me-2 text-warning" />Nova Lista Rápida</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-4">
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

          <div className="d-flex justify-content-between align-items-center mb-2">
            <Form.Label className="mb-0 fw-semibold">Itens</Form.Label>
            <Button variant="outline-primary" size="sm" onClick={addItem} disabled={savingCriar}>
              <FaPlus className="me-1" /> Adicionar item
            </Button>
          </div>

          <div className={styles.itensForm}>
            {criarItens.map((item, idx) => (
              <div key={idx} className={styles.itemRow}>
                <Form.Control
                  placeholder="Nome do item *"
                  value={item.nome}
                  onChange={(e) => updateItem(idx, 'nome', e.target.value)}
                  disabled={savingCriar}
                  className={styles.itemNome}
                />
                <Form.Control
                  type="number"
                  placeholder="Qtd"
                  value={item.quantidade}
                  onChange={(e) => updateItem(idx, 'quantidade', e.target.value)}
                  disabled={savingCriar}
                  min={0}
                  className={styles.itemQtd}
                />
                <Form.Select
                  value={item.unidade}
                  onChange={(e) => updateItem(idx, 'unidade', e.target.value)}
                  disabled={savingCriar}
                  className={styles.itemUnidade}
                >
                  {UNIDADES.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </Form.Select>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => removeItem(idx)}
                  disabled={savingCriar || criarItens.length === 1}
                  title="Remover item"
                >
                  <FaTrash />
                </Button>
              </div>
            ))}
          </div>

          <p className="text-muted small mt-3 mb-0">
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
    </div>
  );
}
