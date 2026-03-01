'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Table, Alert, Spinner, Badge, Button, Form, Modal,
} from 'react-bootstrap';
import api from '@/lib/api';
import styles from './DetalhesChecklist.module.css';
import {
  FaTasks, FaCheckCircle, FaUndo, FaWhatsapp, FaCopy, FaArrowLeft,
} from 'react-icons/fa';

interface ChecklistItem {
  id: number;
  qtdPedida: number;
  marcado: boolean;
  item: { id: number; nome: string; unidadeMedida: string };
}

interface ChecklistDetail {
  id: number;
  status: 'ABERTO' | 'FINALIZADO';
  criadoEm: string;
  submissao: {
    id: number;
    lista: { nome: string } | null;
  } | null;
  itens: ChecklistItem[];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function checklistNome(c: ChecklistDetail) {
  return c.submissao?.lista?.nome ?? `Checklist #${c.id}`;
}

function gerarTextoWhatsApp(checklist: ChecklistDetail): string {
  const nome = checklistNome(checklist);
  const data = formatDate(checklist.criadoEm);
  const pendentes = checklist.itens.filter((i) => !i.marcado);
  const concluidos = checklist.itens.filter((i) => i.marcado);
  const total = checklist.itens.length;
  const marcados = concluidos.length;
  const pct = total > 0 ? Math.round((marcados / total) * 100) : 0;

  const lines: string[] = [
    '*CHECKLIST DE COMPRAS*',
    `*${nome}*`,
    `Data: ${data}`,
    '',
  ];

  if (pendentes.length > 0) {
    lines.push('*📋 ITENS PENDENTES*');
    pendentes.forEach((i) => {
      lines.push(`[ ] ${i.item.nome} - ${i.qtdPedida} ${i.item.unidadeMedida}`);
    });
    lines.push('');
  }

  if (concluidos.length > 0) {
    lines.push('*✅ ITENS CONCLUÍDOS*');
    concluidos.forEach((i) => {
      lines.push(`[x] ~${i.item.nome} - ${i.qtdPedida} ${i.item.unidadeMedida}~`);
    });
    lines.push('');
  }

  lines.push(`*Progresso: ${marcados}/${total} itens (${pct}%)*`);
  return lines.join('\n');
}

export default function ChecklistDetailPage() {
  const params = useParams();
  const checklistId = params.id as string;

  const [checklist, setChecklist] = useState<ChecklistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [marcandoId, setMarcandoId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal clipboard fallback
  const [showClipboard, setShowClipboard] = useState(false);
  const [clipboardText, setClipboardText] = useState('');

  const fetchChecklist = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<ChecklistDetail>(`/v1/admin/checklists/${checklistId}`);
      setChecklist(data);
    } catch {
      setError('Erro ao carregar checklist');
    } finally {
      setLoading(false);
    }
  }, [checklistId]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  const { total, marcados, pct } = useMemo(() => {
    if (!checklist) return { total: 0, marcados: 0, pct: 0 };
    const t = checklist.itens.length;
    const m = checklist.itens.filter((i) => i.marcado).length;
    return { total: t, marcados: m, pct: t > 0 ? Math.round((m / t) * 100) : 0 };
  }, [checklist]);

  // ─── Marcar item ────────────────────────────────────────────────────────────

  const handleMarcar = async (itemId: number) => {
    if (checklist?.status !== 'ABERTO') return;
    setMarcandoId(itemId);
    try {
      await api.put(`/v1/admin/checklist-itens/${itemId}/marcar`);
      setChecklist((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          itens: prev.itens.map((it) =>
            it.id === itemId ? { ...it, marcado: !it.marcado } : it,
          ),
        };
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao marcar item');
    } finally {
      setMarcandoId(null);
    }
  };

  // ─── Finalizar ──────────────────────────────────────────────────────────────

  const handleFinalizar = async () => {
    if (!confirm('Finalizar este checklist?')) return;
    setActionLoading(true);
    setError('');
    try {
      await api.put(`/v1/admin/checklists/${checklistId}/finalizar`);
      setSuccess('Checklist finalizado!');
      fetchChecklist();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao finalizar checklist');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Reabrir ────────────────────────────────────────────────────────────────

  const handleReabrir = async () => {
    if (!confirm('Reabrir este checklist?')) return;
    setActionLoading(true);
    setError('');
    try {
      await api.put(`/v1/admin/checklists/${checklistId}/reabrir`);
      setSuccess('Checklist reaberto!');
      fetchChecklist();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao reabrir checklist');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Compartilhar ────────────────────────────────────────────────────────────

  const handleCopiar = async () => {
    if (!checklist) return;
    const texto = gerarTextoWhatsApp(checklist);
    try {
      await navigator.clipboard.writeText(texto);
      setSuccess('Texto copiado para a área de transferência!');
    } catch {
      setClipboardText(texto);
      setShowClipboard(true);
    }
  };

  const handleWhatsApp = async () => {
    if (!checklist) return;
    const texto = gerarTextoWhatsApp(checklist);
    const encoded = encodeURIComponent(texto);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className="p-4">
        <Alert variant="danger">Checklist não encontrado.</Alert>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <Link href="/admin/checklists" className={styles.backLink}>
          <FaArrowLeft /> Voltar para Checklists
        </Link>

        {/* Header card */}
        <div className={styles.headerCard}>
          <div className={styles.headerTop}>
            <div className={styles.titleBlock}>
              <h1 className={styles.title}>
                <FaTasks className="me-2" />
                {checklistNome(checklist)}
              </h1>
              <p className={styles.subtitle}>
                Checklist #{checklist.id} · Criado em {formatDate(checklist.criadoEm)}
                {checklist.submissao && (
                  <> · Submissão{' '}
                    <Link href={`/admin/submissoes/${checklist.submissao.id}`} style={{ color: 'var(--color-primary)' }}>
                      #{checklist.submissao.id}
                    </Link>
                  </>
                )}
              </p>
              <div className="mt-1">
                <Badge bg={checklist.status === 'ABERTO' ? 'primary' : 'success'}>
                  {checklist.status}
                </Badge>
              </div>
            </div>

            <div className={styles.actionButtons}>
              {checklist.status === 'ABERTO' ? (
                <Button
                  variant="success"
                  onClick={handleFinalizar}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <><FaCheckCircle className="me-1" /> Finalizar</>
                  )}
                </Button>
              ) : (
                <Button
                  variant="outline-primary"
                  onClick={handleReabrir}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <><FaUndo className="me-1" /> Reabrir</>
                  )}
                </Button>
              )}
              <Button variant="outline-success" onClick={handleWhatsApp} title="Compartilhar no WhatsApp">
                <FaWhatsapp className="me-1" /> WhatsApp
              </Button>
              <Button variant="outline-secondary" onClick={handleCopiar} title="Copiar texto">
                <FaCopy className="me-1" /> Copiar
              </Button>
            </div>
          </div>

          <div className={styles.progressSection}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${pct}%` }} />
            </div>
            <span className={styles.progressLabel}>
              {marcados} de {total} itens marcados — {pct}%
            </span>
          </div>
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

        {/* Tabela de itens */}
        <div className={styles.tableWrapper}>
          <Table bordered hover responsive className={styles.table}>
            <thead>
              <tr className={styles.tableHeader}>
                <th className={styles.tableHeaderCell} style={{ width: 48 }}>✓</th>
                <th className={styles.tableHeaderCell}>Item</th>
                <th className={styles.tableHeaderCell}>Qtd Pedida</th>
                <th className={styles.tableHeaderCell}>Unidade</th>
              </tr>
            </thead>
            <tbody>
              {checklist.itens.map((it) => (
                <tr
                  key={it.id}
                  className={`${styles.tableRow} ${it.marcado ? styles.tableRowDone : ''}`}
                >
                  <td className={`${styles.tableCell} ${styles.checkCell}`}>
                    {marcandoId === it.id ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      <Form.Check
                        type="checkbox"
                        checked={it.marcado}
                        onChange={() => handleMarcar(it.id)}
                        disabled={checklist.status !== 'ABERTO' || marcandoId !== null}
                        aria-label={`Marcar ${it.item.nome}`}
                      />
                    )}
                  </td>
                  <td className={`${styles.tableCell} fw-semibold ${it.marcado ? styles.cellDone : ''}`}>
                    {it.item.nome}
                  </td>
                  <td className={`${styles.tableCell} ${it.marcado ? styles.cellDone : ''}`}>
                    {it.qtdPedida}
                  </td>
                  <td className={`${styles.tableCell} ${it.marcado ? styles.cellDone : ''}`}>
                    {it.item.unidadeMedida}
                  </td>
                </tr>
              ))}
              {checklist.itens.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-4">
                    Nenhum item neste checklist
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </div>

      {/* Modal fallback clipboard */}
      <Modal show={showClipboard} onHide={() => setShowClipboard(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Copiar texto</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted small mb-2">
            Não foi possível copiar automaticamente. Selecione e copie manualmente:
          </p>
          <Form.Control
            as="textarea"
            rows={12}
            value={clipboardText}
            readOnly
            className={styles.clipboardTextarea}
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowClipboard(false)}>
            Fechar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
