'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Table, Alert, Spinner, Badge, Button, Form, ProgressBar } from 'react-bootstrap';
import api from '@/lib/api';
import styles from '@/app/admin/listas/[id]/ListaDetail.module.css';
import { FaClipboardList, FaCheckCircle } from 'react-icons/fa';

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
  submissao: { id: number };
  itens: ChecklistItem[];
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

export default function ChecklistDetailPage() {
  const params = useParams();
  const checklistId = params.id as string;

  const [checklist, setChecklist] = useState<ChecklistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [marcandoId, setMarcandoId] = useState<number | null>(null);
  const [finalizando, setFinalizando] = useState(false);

  const fetchChecklist = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/v1/admin/checklists/${checklistId}`);
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

  const handleMarcar = async (itemId: number) => {
    if (checklist?.status !== 'ABERTO') return;
    setMarcandoId(itemId);
    try {
      await api.put(`/v1/admin/checklist-itens/${itemId}/marcar`);
      // Optimistic update
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

  const handleFinalizar = async () => {
    if (!confirm('Finalizar este checklist? Esta ação não pode ser desfeita.')) return;
    setFinalizando(true);
    try {
      await api.put(`/v1/admin/checklists/${checklistId}/finalizar`);
      fetchChecklist();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao finalizar checklist');
    } finally {
      setFinalizando(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  if (!checklist) {
    return <Alert variant="danger">Checklist não encontrado</Alert>;
  }

  const totalItens = checklist.itens.length;
  const marcados = checklist.itens.filter((it) => it.marcado).length;
  const progresso = totalItens > 0 ? Math.round((marcados / totalItens) * 100) : 0;

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <Link href="/admin/checklists" className={styles.backButton}>
          ← Voltar para Checklists
        </Link>

        {/* Cabeçalho */}
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <h1 className={styles.listTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FaClipboardList />
              Checklist #{checklist.id}
            </h1>
            <div className={styles.listMeta}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Status:</span>
                <Badge bg={checklist.status === 'ABERTO' ? 'primary' : 'success'} style={{ fontSize: '0.9rem' }}>
                  {checklist.status}
                </Badge>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Data:</span>
                {formatDate(checklist.criadoEm)}
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Submissão:</span>
                <Link href={`/admin/submissoes/${checklist.submissao.id}`} style={{ color: 'var(--color-primary)' }}>
                  #{checklist.submissao.id}
                </Link>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Progresso:</span>
                {marcados} de {totalItens} marcados
              </div>
            </div>
            <div style={{ marginTop: '1rem', maxWidth: '400px' }}>
              <ProgressBar
                now={progresso}
                label={`${progresso}%`}
                variant={progresso === 100 ? 'success' : 'primary'}
                striped={progresso < 100}
                animated={checklist.status === 'ABERTO' && progresso < 100}
              />
            </div>
          </div>
          <div className={styles.headerActions}>
            <Button
              variant="success"
              onClick={handleFinalizar}
              disabled={finalizando || checklist.status !== 'ABERTO'}
            >
              {finalizando ? (
                <Spinner animation="border" size="sm" />
              ) : (
                <><FaCheckCircle style={{ marginRight: '0.4rem' }} />Finalizar Checklist</>
              )}
            </Button>
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
            Itens ({totalItens})
          </h2>
          <div className={styles.tableWrapper}>
            <Table bordered hover responsive className={styles.table}>
              <thead>
                <tr className={styles.tableHeader}>
                  <th className={styles.tableHeaderCell} style={{ width: '3rem' }}>Feito</th>
                  <th className={styles.tableHeaderCell}>Item</th>
                  <th className={styles.tableHeaderCell}>Unidade</th>
                  <th className={styles.tableHeaderCell}>Qtd Pedida</th>
                </tr>
              </thead>
              <tbody>
                {checklist.itens.map((it) => (
                  <tr
                    key={it.id}
                    className={styles.tableRow}
                    style={{
                      backgroundColor: it.marcado ? 'rgba(40, 167, 69, 0.1)' : undefined,
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <td className={styles.tableCell} style={{ textAlign: 'center' }}>
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
                    <td
                      className={`${styles.tableCell} ${styles.cellBold}`}
                      style={{
                        textDecoration: it.marcado ? 'line-through' : undefined,
                        color: it.marcado ? 'var(--text-secondary)' : undefined,
                      }}
                    >
                      {it.item.nome}
                    </td>
                    <td
                      className={styles.tableCell}
                      style={{
                        textDecoration: it.marcado ? 'line-through' : undefined,
                        color: it.marcado ? 'var(--text-secondary)' : undefined,
                      }}
                    >
                      {it.item.unidadeMedida}
                    </td>
                    <td
                      className={styles.tableCell}
                      style={{
                        textDecoration: it.marcado ? 'line-through' : undefined,
                        color: it.marcado ? 'var(--text-secondary)' : undefined,
                      }}
                    >
                      {it.qtdPedida}
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
      </div>
    </div>
  );
}
