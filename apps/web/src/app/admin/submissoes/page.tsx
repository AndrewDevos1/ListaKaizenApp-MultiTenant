'use client';

import { useState, useEffect } from 'react';
import { Table, Alert, Spinner, Badge, Button, Tabs, Tab, Modal, Form } from 'react-bootstrap';
import Link from 'next/link';
import api from '@/lib/api';
import styles from '@/app/admin/listas/[id]/ListaDetail.module.css';
import { FaClipboardCheck, FaWhatsapp, FaCopy } from 'react-icons/fa';

type StatusSubmissao = 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'PARCIAL' | 'ARQUIVADO';

interface SubmissaoSummary {
  id: number;
  status: StatusSubmissao;
  criadoEm: string;
  arquivada: boolean;
  lista: { id: number; nome: string };
  colaborador: { id: number; usuario: { nome: string } };
  _count: { pedidos: number };
}

interface MergePreviewItem {
  itemNome: string;
  unidade: string;
  qtdTotal: number;
  breakdown: { submissaoId: number; colaboradorNome: string; qtd: number }[];
}

const STATUS_VARIANT: Record<StatusSubmissao, string> = {
  PENDENTE: 'warning',
  APROVADO: 'success',
  REJEITADO: 'danger',
  PARCIAL: 'info',
  ARQUIVADO: 'secondary',
};

const TABS: { key: StatusSubmissao | 'ARQUIVADO'; label: string }[] = [
  { key: 'PENDENTE', label: 'Pendente' },
  { key: 'APROVADO', label: 'Aprovado' },
  { key: 'REJEITADO', label: 'Rejeitado' },
  { key: 'PARCIAL', label: 'Parcial' },
  { key: 'ARQUIVADO', label: 'Arquivado' },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminSubmissoesPage() {
  const [submissoes, setSubmissoes] = useState<SubmissaoSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<string>('PENDENTE');
  const [arquivando, setArquivando] = useState<number | null>(null);

  // Merge state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeStep, setMergeStep] = useState<1 | 2 | 3>(1);
  const [mergeTitulo, setMergeTitulo] = useState('');
  const [mergePreview, setMergePreview] = useState<MergePreviewItem[]>([]);
  const [mergeTexto, setMergeTexto] = useState('');
  const [mergeLoading, setMergeLoading] = useState(false);
  const [mergeError, setMergeError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  const fetchSubmissoes = async (status: string) => {
    setLoading(true);
    setError('');
    try {
      const arquivada = status === 'ARQUIVADO' ? 'true' : 'false';
      const params: Record<string, string> = { arquivada };
      if (status !== 'ARQUIVADO') {
        params.status = status;
      }
      const { data } = await api.get('/v1/admin/submissoes', { params });
      setSubmissoes(data);
    } catch {
      setError('Erro ao carregar submissões');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissoes(activeTab);
    setSelectedIds(new Set());
  }, [activeTab]);

  const handleArquivar = async (id: number) => {
    if (!confirm('Arquivar esta submissão?')) return;
    setArquivando(id);
    try {
      await api.put(`/v1/admin/submissoes/${id}/arquivar`);
      fetchSubmissoes(activeTab);
    } catch {
      setError('Erro ao arquivar submissão');
    } finally {
      setArquivando(null);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === submissoes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(submissoes.map((s) => s.id)));
    }
  };

  const openMergeModal = () => {
    setMergeStep(1);
    setMergeTitulo('');
    setMergePreview([]);
    setMergeTexto('');
    setMergeError('');
    setCopySuccess(false);
    setShowMergeModal(true);
  };

  const closeMergeModal = () => {
    setShowMergeModal(false);
    setSelectedIds(new Set());
  };

  const handleGerarPreview = async () => {
    setMergeLoading(true);
    setMergeError('');
    try {
      const { data } = await api.post('/v1/admin/submissoes/merge-preview', {
        submissaoIds: Array.from(selectedIds),
      });
      setMergePreview(data);
      setMergeStep(2);
    } catch (err: any) {
      setMergeError(err?.response?.data?.message || 'Erro ao gerar preview');
    } finally {
      setMergeLoading(false);
    }
  };

  const handleGerarTexto = async () => {
    setMergeLoading(true);
    setMergeError('');
    try {
      const body: { submissaoIds: number[]; titulo?: string } = {
        submissaoIds: Array.from(selectedIds),
      };
      if (mergeTitulo.trim()) body.titulo = mergeTitulo.trim();
      const { data } = await api.post('/v1/admin/submissoes/merge-whatsapp', body);
      setMergeTexto(data.texto);
      setMergeStep(3);
    } catch (err: any) {
      setMergeError(err?.response?.data?.message || 'Erro ao gerar texto');
    } finally {
      setMergeLoading(false);
    }
  };

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(mergeTexto);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    } catch {
      setMergeError('Não foi possível copiar. Selecione o texto manualmente.');
    }
  };

  const selectedSubmissoes = submissoes.filter((s) => selectedIds.has(s.id));

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className={styles.listTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FaClipboardCheck /> Submissões
            </h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              Gerencie as submissões de estoque dos colaboradores
            </p>
          </div>
          {selectedIds.size > 0 && (
            <Button variant="success" onClick={openMergeModal}>
              <FaWhatsapp style={{ marginRight: '0.4rem' }} />
              Merge WhatsApp ({selectedIds.size} selecionada{selectedIds.size !== 1 ? 's' : ''})
            </Button>
          )}
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <div className={styles.tableSection}>
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => k && setActiveTab(k)}
            className="mb-3"
          >
            {TABS.map((tab) => (
              <Tab key={tab.key} eventKey={tab.key} title={tab.label}>
                {/* conteúdo abaixo */}
              </Tab>
            ))}
          </Tabs>

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <Table striped bordered hover responsive className={styles.table}>
                <thead>
                  <tr className={styles.tableHeader}>
                    <th className={styles.tableHeaderCell} style={{ width: '2.5rem' }}>
                      <Form.Check
                        type="checkbox"
                        checked={submissoes.length > 0 && selectedIds.size === submissoes.length}
                        onChange={toggleSelectAll}
                        aria-label="Selecionar todas"
                      />
                    </th>
                    <th className={styles.tableHeaderCell}>#</th>
                    <th className={styles.tableHeaderCell}>Lista</th>
                    <th className={styles.tableHeaderCell}>Colaborador</th>
                    <th className={styles.tableHeaderCell}>Data</th>
                    <th className={styles.tableHeaderCell}>Nº Pedidos</th>
                    <th className={styles.tableHeaderCell}>Status</th>
                    <th className={styles.tableHeaderCell}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {submissoes.map((s) => (
                    <tr key={s.id} className={styles.tableRow}>
                      <td className={styles.tableCell}>
                        <Form.Check
                          type="checkbox"
                          checked={selectedIds.has(s.id)}
                          onChange={() => toggleSelect(s.id)}
                          aria-label={`Selecionar submissão ${s.id}`}
                        />
                      </td>
                      <td className={styles.tableCell}>{s.id}</td>
                      <td className={`${styles.tableCell} ${styles.cellBold}`}>{s.lista.nome}</td>
                      <td className={styles.tableCell}>{s.colaborador.usuario.nome}</td>
                      <td className={styles.tableCell}>{formatDate(s.criadoEm)}</td>
                      <td className={styles.tableCell}>{s._count.pedidos}</td>
                      <td className={styles.tableCell}>
                        <Badge bg={STATUS_VARIANT[s.status as StatusSubmissao] ?? 'secondary'}>
                          {s.status}
                        </Badge>
                      </td>
                      <td className={styles.tableCell}>
                        <div className={styles.actionButtons}>
                          <Link href={`/admin/submissoes/${s.id}`}>
                            <Button size="sm" variant="outline-primary">
                              Ver
                            </Button>
                          </Link>
                          {!s.arquivada && (
                            <Button
                              size="sm"
                              variant="outline-secondary"
                              onClick={() => handleArquivar(s.id)}
                              disabled={arquivando === s.id}
                            >
                              {arquivando === s.id ? <Spinner animation="border" size="sm" /> : 'Arquivar'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {submissoes.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-4">
                        Nenhuma submissão encontrada
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Merge WhatsApp */}
      <Modal show={showMergeModal} onHide={closeMergeModal} size="lg" backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaWhatsapp style={{ marginRight: '0.5rem', color: '#25D366' }} />
            Merge WhatsApp
            {mergeStep === 1 && ' — Etapa 1: Confirmar'}
            {mergeStep === 2 && ' — Etapa 2: Preview'}
            {mergeStep === 3 && ' — Etapa 3: Texto Gerado'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {mergeError && (
            <Alert variant="danger" dismissible onClose={() => setMergeError('')}>
              {mergeError}
            </Alert>
          )}

          {/* Etapa 1 */}
          {mergeStep === 1 && (
            <div>
              <p className="text-muted mb-3">
                As seguintes submissões serão consolidadas:
              </p>
              <Table bordered size="sm" className="mb-3">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Lista</th>
                    <th>Colaborador</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSubmissoes.map((s) => (
                    <tr key={s.id}>
                      <td>{s.id}</td>
                      <td>{s.lista.nome}</td>
                      <td>{s.colaborador.usuario.nome}</td>
                      <td>{formatDate(s.criadoEm)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <Form.Group>
                <Form.Label>Título do pedido (opcional)</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ex: Pedido Semanal — Cozinha"
                  value={mergeTitulo}
                  onChange={(e) => setMergeTitulo(e.target.value)}
                />
              </Form.Group>
            </div>
          )}

          {/* Etapa 2 */}
          {mergeStep === 2 && (
            <div>
              <p className="text-muted mb-3">
                Consolidação de <strong>{mergePreview.length}</strong> item(s) das submissões selecionadas:
              </p>
              <div style={{ overflowX: 'auto' }}>
                <Table bordered size="sm">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Unidade</th>
                      <th>Qtd Total</th>
                      <th>Breakdown</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mergePreview.map((item, idx) => (
                      <tr key={idx}>
                        <td><strong>{item.itemNome}</strong></td>
                        <td>{item.unidade}</td>
                        <td><Badge bg="primary">{item.qtdTotal}</Badge></td>
                        <td style={{ fontSize: '0.85rem', color: '#666' }}>
                          {item.breakdown.map((b) => `${b.colaboradorNome}: ${b.qtd}`).join(' | ')}
                        </td>
                      </tr>
                    ))}
                    {mergePreview.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center text-muted">
                          Nenhum item encontrado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </div>
          )}

          {/* Etapa 3 */}
          {mergeStep === 3 && (
            <div>
              <p className="text-muted mb-2">
                Texto pronto para envio via WhatsApp:
              </p>
              <Form.Control
                as="textarea"
                rows={12}
                readOnly
                value={mergeTexto}
                style={{ fontFamily: 'monospace', fontSize: '0.9rem', backgroundColor: '#f8f9fa' }}
              />
              {copySuccess && (
                <Alert variant="success" className="mt-2 mb-0 py-2">
                  Texto copiado para a área de transferência!
                </Alert>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeMergeModal}>
            Fechar
          </Button>
          {mergeStep === 1 && (
            <Button variant="primary" onClick={handleGerarPreview} disabled={mergeLoading}>
              {mergeLoading ? <Spinner animation="border" size="sm" /> : 'Gerar Preview'}
            </Button>
          )}
          {mergeStep === 2 && (
            <>
              <Button variant="outline-secondary" onClick={() => setMergeStep(1)} disabled={mergeLoading}>
                Voltar
              </Button>
              <Button variant="success" onClick={handleGerarTexto} disabled={mergeLoading}>
                {mergeLoading ? <Spinner animation="border" size="sm" /> : (
                  <><FaWhatsapp style={{ marginRight: '0.4rem' }} />Gerar Texto</>
                )}
              </Button>
            </>
          )}
          {mergeStep === 3 && (
            <Button variant="primary" onClick={handleCopiar}>
              <FaCopy style={{ marginRight: '0.4rem' }} />
              Copiar para Área de Transferência
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </div>
  );
}
