'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Table, Alert, Spinner, Badge, Button } from 'react-bootstrap';
import api from '@/lib/api';
import styles from './ListaRapidaDetail.module.css';
import { FaClipboardList, FaCheck, FaTimes, FaArchive } from 'react-icons/fa';

type Status = 'RASCUNHO' | 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'ARQUIVADO';

const STATUS_VARIANT: Record<Status, string> = {
  RASCUNHO: 'secondary',
  PENDENTE: 'warning',
  APROVADO: 'success',
  REJEITADO: 'danger',
  ARQUIVADO: 'secondary',
};

interface ListaRapidaItem {
  id: number;
  nome: string;
  quantidade: number | null;
  unidade: string | null;
  descartado: boolean;
}

interface ListaRapidaDetail {
  id: number;
  nome: string;
  status: Status;
  criadoEm: string;
  usuario: { id: number; nome: string };
  itens: ListaRapidaItem[];
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

export default function AdminListaRapidaDetailPage() {
  const params = useParams();
  const listaId = params.id as string;

  const [lista, setLista] = useState<ListaRapidaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchLista = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/v1/admin/listas-rapidas/${listaId}`);
      setLista(data);
    } catch {
      setError('Erro ao carregar detalhes da lista rápida');
    } finally {
      setLoading(false);
    }
  }, [listaId]);

  useEffect(() => {
    fetchLista();
  }, [fetchLista]);

  const handleAprovar = async () => {
    if (!confirm('Aprovar esta lista rápida?')) return;
    setActionLoading('aprovar');
    setError('');
    try {
      await api.put(`/v1/admin/listas-rapidas/${listaId}/aprovar`);
      setSuccess('Lista aprovada com sucesso!');
      fetchLista();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao aprovar lista');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejeitar = async () => {
    if (!confirm('Rejeitar esta lista rápida?')) return;
    setActionLoading('rejeitar');
    setError('');
    try {
      await api.put(`/v1/admin/listas-rapidas/${listaId}/rejeitar`);
      setSuccess('Lista rejeitada.');
      fetchLista();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao rejeitar lista');
    } finally {
      setActionLoading(null);
    }
  };

  const handleArquivar = async () => {
    if (!confirm('Arquivar esta lista rápida?')) return;
    setActionLoading('arquivar');
    setError('');
    try {
      await api.put(`/v1/admin/listas-rapidas/${listaId}/arquivar`);
      setSuccess('Lista arquivada.');
      fetchLista();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao arquivar lista');
    } finally {
      setActionLoading(null);
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
    return <Alert variant="danger">Lista rápida não encontrada.</Alert>;
  }

  const itensFiltrados = lista.itens.filter((it) => !it.descartado);
  const itensDescartados = lista.itens.filter((it) => it.descartado);

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <Link href="/admin/listas-rapidas" className={styles.backButton}>
          ← Voltar para Listas Rápidas
        </Link>

        {/* Cabeçalho */}
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <h1 className={styles.listTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FaClipboardList />
              {lista.nome}
            </h1>
            <div className={styles.listMeta}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Status:</span>
                <Badge bg={STATUS_VARIANT[lista.status]} style={{ fontSize: '0.9rem' }}>
                  {lista.status}
                </Badge>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Colaborador:</span>
                {lista.usuario.nome}
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Data:</span>
                {formatDate(lista.criadoEm)}
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Itens:</span>
                {lista.itens.length}
              </div>
            </div>
          </div>

          <div className={styles.headerActions}>
            {lista.status === 'PENDENTE' && (
              <>
                <Button
                  variant="success"
                  onClick={handleAprovar}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === 'aprovar' ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <><FaCheck className="me-1" /> Aprovar</>
                  )}
                </Button>
                <Button
                  variant="danger"
                  onClick={handleRejeitar}
                  disabled={actionLoading !== null}
                >
                  {actionLoading === 'rejeitar' ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <><FaTimes className="me-1" /> Rejeitar</>
                  )}
                </Button>
              </>
            )}
            {(lista.status === 'APROVADO' || lista.status === 'REJEITADO') && (
              <Button
                variant="warning"
                onClick={handleArquivar}
                disabled={actionLoading !== null}
              >
                {actionLoading === 'arquivar' ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  <><FaArchive className="me-1" /> Arquivar</>
                )}
              </Button>
            )}
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

        {/* Tabela de Itens */}
        <div className={styles.tableSection}>
          <h2 className={styles.sectionTitle}>
            Itens ({lista.itens.length})
          </h2>
          <div className={styles.tableWrapper}>
            <Table bordered hover responsive className={styles.table}>
              <thead>
                <tr className={styles.tableHeader}>
                  <th className={styles.tableHeaderCell}>Nome</th>
                  <th className={styles.tableHeaderCell}>Quantidade</th>
                  <th className={styles.tableHeaderCell}>Unidade</th>
                  <th className={styles.tableHeaderCell}>Situacao</th>
                </tr>
              </thead>
              <tbody>
                {lista.itens.map((item) => (
                  <tr
                    key={item.id}
                    className={styles.tableRow}
                    style={{ opacity: item.descartado ? 0.6 : 1 }}
                  >
                    <td
                      className={`${styles.tableCell} fw-semibold`}
                      style={{ textDecoration: item.descartado ? 'line-through' : undefined }}
                    >
                      {item.nome}
                    </td>
                    <td className={styles.tableCell}>
                      {item.quantidade ?? <span className={styles.cellMuted}>—</span>}
                    </td>
                    <td className={styles.tableCell}>
                      {item.unidade ?? <span className={styles.cellMuted}>—</span>}
                    </td>
                    <td className={styles.tableCell}>
                      {item.descartado ? (
                        <Badge bg="danger">Descartado</Badge>
                      ) : (
                        <Badge bg="success">Ativo</Badge>
                      )}
                    </td>
                  </tr>
                ))}
                {lista.itens.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-muted py-4">
                      Nenhum item nesta lista
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>

          {itensDescartados.length > 0 && (
            <p className="text-muted mt-2" style={{ fontSize: '0.85rem' }}>
              {itensDescartados.length} item(ns) descartado(s) exibido(s) com linha-through.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
