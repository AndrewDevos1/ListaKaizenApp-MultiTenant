'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Table, Alert, Spinner, Badge } from 'react-bootstrap';
import api from '@/lib/api';
import styles from '@/app/admin/listas/[id]/ListaDetail.module.css';
import { FaClipboardList } from 'react-icons/fa';

type StatusSubmissao = 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'PARCIAL' | 'ARQUIVADO';
type StatusPedido = 'PENDENTE' | 'APROVADO' | 'REJEITADO';

interface Pedido {
  id: number;
  status: StatusPedido;
  quantidadeSolicitada: number;
  item: { id: number; nome: string; unidadeMedida: string };
}

interface SubmissaoDetail {
  id: number;
  status: StatusSubmissao;
  criadoEm: string;
  lista: { id: number; nome: string };
  pedidos: Pedido[];
}

const STATUS_SUB_VARIANT: Record<StatusSubmissao, string> = {
  PENDENTE: 'warning',
  APROVADO: 'success',
  REJEITADO: 'danger',
  PARCIAL: 'info',
  ARQUIVADO: 'secondary',
};

const STATUS_PED_VARIANT: Record<StatusPedido, string> = {
  PENDENTE: 'warning',
  APROVADO: 'success',
  REJEITADO: 'danger',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CollaboratorSubmissaoDetailPage() {
  const params = useParams();
  const submissaoId = params.id as string;

  const [submissao, setSubmissao] = useState<SubmissaoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSubmissao = useCallback(async () => {
    try {
      const { data } = await api.get(`/v1/collaborator/submissoes/${submissaoId}`);
      setSubmissao(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao carregar submissão');
    } finally {
      setLoading(false);
    }
  }, [submissaoId]);

  useEffect(() => {
    fetchSubmissao();
  }, [fetchSubmissao]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  if (!submissao) {
    return <Alert variant="danger">Submissão não encontrada</Alert>;
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <Link href="/collaborator/submissoes" className={styles.backButton}>
          ← Voltar para Minhas Submissões
        </Link>

        {/* Cabeçalho */}
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <h1 className={styles.listTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FaClipboardList />
              {submissao.lista.nome}
            </h1>
            <div className={styles.listMeta}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Data:</span>
                {formatDate(submissao.criadoEm)}
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Status:</span>
                <Badge
                  bg={STATUS_SUB_VARIANT[submissao.status] ?? 'secondary'}
                  style={{ fontSize: '0.95rem' }}
                >
                  {submissao.status}
                </Badge>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Pedidos:</span>
                {submissao.pedidos.length}
              </div>
            </div>
          </div>
        </div>

        {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

        {/* Tabela de pedidos — somente leitura */}
        <div className={styles.tableSection}>
          <h2 className={styles.sectionTitle}>Itens Solicitados</h2>
          <div className={styles.tableWrapper}>
            <Table striped bordered hover responsive className={styles.table}>
              <thead>
                <tr className={styles.tableHeader}>
                  <th className={styles.tableHeaderCell}>Item</th>
                  <th className={styles.tableHeaderCell}>Unidade</th>
                  <th className={styles.tableHeaderCell}>Qtd Solicitada</th>
                  <th className={styles.tableHeaderCell}>Status do Pedido</th>
                </tr>
              </thead>
              <tbody>
                {submissao.pedidos.map((pedido) => (
                  <tr key={pedido.id} className={styles.tableRow}>
                    <td className={`${styles.tableCell} ${styles.cellBold}`}>
                      {pedido.item.nome}
                    </td>
                    <td className={styles.tableCell}>{pedido.item.unidadeMedida}</td>
                    <td className={styles.tableCell}>{pedido.quantidadeSolicitada}</td>
                    <td className={styles.tableCell}>
                      <Badge bg={STATUS_PED_VARIANT[pedido.status] ?? 'secondary'}>
                        {pedido.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {submissao.pedidos.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-muted py-4">
                      Nenhum pedido nesta submissão
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
