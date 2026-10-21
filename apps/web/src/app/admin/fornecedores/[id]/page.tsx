'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Alert, Spinner, Badge } from 'react-bootstrap';
import Link from 'next/link';
import api from '@/lib/api';
import styles from './FornecedorDetail.module.css';

interface ItemVinculado {
  id: number;
  nome: string;
  unidadeMedida: string;
}

interface FornecedorDetail {
  id: number;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
  itens: ItemVinculado[];
}

export default function FornecedorDetailPage() {
  const params = useParams();
  const fornecedorId = params.id as string;

  const [fornecedor, setFornecedor] = useState<FornecedorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchFornecedor = async () => {
      try {
        const { data } = await api.get(`/v1/admin/fornecedores/${fornecedorId}`);
        setFornecedor(data);
      } catch {
        setError('Erro ao carregar fornecedor');
      } finally {
        setLoading(false);
      }
    };
    fetchFornecedor();
  }, [fornecedorId]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  if (error || !fornecedor) {
    return (
      <div style={{ padding: '2rem' }}>
        <Alert variant="danger">{error || 'Fornecedor nao encontrado'}</Alert>
        <Link href="/admin/fornecedores" className={styles.backButton}>
          ← Voltar para Fornecedores
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <Link href="/admin/fornecedores" className={styles.backButton}>
          ← Voltar para Fornecedores
        </Link>

        <div className={styles.header}>
          <h1 className={styles.headerTitle}>Fornecedor: {fornecedor.nome}</h1>
          <Badge bg={fornecedor.ativo ? 'success' : 'secondary'} style={{ fontSize: '0.9rem' }}>
            {fornecedor.ativo ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>

        <div className={styles.infoCard}>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>CNPJ</span>
              <span className={fornecedor.cnpj ? styles.infoValue : styles.infoMuted}>
                {fornecedor.cnpj ?? 'Nao informado'}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Telefone</span>
              <span className={fornecedor.telefone ? styles.infoValue : styles.infoMuted}>
                {fornecedor.telefone ?? 'Nao informado'}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Email</span>
              <span className={fornecedor.email ? styles.infoValue : styles.infoMuted}>
                {fornecedor.email ?? 'Nao informado'}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Status</span>
              <span className={styles.infoValue}>
                <Badge bg={fornecedor.ativo ? 'success' : 'secondary'}>
                  {fornecedor.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </span>
            </div>
          </div>
        </div>

        <div className={styles.tableSection}>
          <h2 className={styles.sectionTitle}>
            Itens Vinculados ({fornecedor.itens.length})
          </h2>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.tableHeader}>
                  <th className={styles.tableHeaderCell}>Nome</th>
                  <th className={styles.tableHeaderCell}>Unidade de Medida</th>
                </tr>
              </thead>
              <tbody>
                {fornecedor.itens.map((item) => (
                  <tr key={item.id} className={styles.tableRow}>
                    <td className={styles.tableCell}>{item.nome}</td>
                    <td className={styles.tableCell}>{item.unidadeMedida}</td>
                  </tr>
                ))}
                {fornecedor.itens.length === 0 && (
                  <tr>
                    <td colSpan={2} className={`${styles.tableCell} ${styles.emptyState}`}>
                      Nenhum item vinculado a este fornecedor
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
