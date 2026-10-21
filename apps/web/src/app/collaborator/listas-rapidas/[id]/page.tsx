'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Table, Alert, Spinner, Badge, Button, Form } from 'react-bootstrap';
import api from '@/lib/api';
import styles from './ListaRapidaDetalheColaborador.module.css';
import { FaClipboardList, FaPaperPlane, FaPlus } from 'react-icons/fa';

type Status = 'RASCUNHO' | 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'ARQUIVADO';

const STATUS_VARIANT: Record<Status, string> = {
  RASCUNHO: 'secondary',
  PENDENTE: 'warning',
  APROVADO: 'success',
  REJEITADO: 'danger',
  ARQUIVADO: 'dark',
};

interface ListaRapidaItem {
  id: number;
  nome: string;
  quantidade: number | null;
  unidade: string | null;
}

interface ListaRapidaDetail {
  id: number;
  nome: string;
  status: Status;
  criadoEm: string;
  itens: ListaRapidaItem[];
}

interface ItemForm {
  nome: string;
  quantidade: string;
  unidade: string;
}

const emptyItemForm: ItemForm = { nome: '', quantidade: '', unidade: '' };

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function CollaboratorListaRapidaDetailPage() {
  const params = useParams();
  const listaId = params.id as string;

  const [lista, setLista] = useState<ListaRapidaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [itemForm, setItemForm] = useState<ItemForm>(emptyItemForm);
  const [addingItem, setAddingItem] = useState(false);
  const [itemError, setItemError] = useState('');

  const [submetendo, setSubmetendo] = useState(false);

  const fetchLista = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/v1/collaborator/listas-rapidas/${listaId}`);
      setLista(data);
    } catch {
      setError('Erro ao carregar detalhes da lista');
    } finally {
      setLoading(false);
    }
  }, [listaId]);

  useEffect(() => {
    fetchLista();
  }, [fetchLista]);

  const handleAddItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!itemForm.nome.trim()) {
      setItemError('O nome do item e obrigatorio.');
      return;
    }
    setAddingItem(true);
    setItemError('');
    try {
      const payload: Record<string, unknown> = { nome: itemForm.nome.trim() };
      if (itemForm.quantidade) payload.quantidade = Number(itemForm.quantidade);
      if (itemForm.unidade) payload.unidade = itemForm.unidade.trim();

      await api.post(`/v1/collaborator/listas-rapidas/${listaId}/itens`, payload);
      setItemForm(emptyItemForm);
      fetchLista();
    } catch (err: any) {
      setItemError(err?.response?.data?.message || 'Erro ao adicionar item');
    } finally {
      setAddingItem(false);
    }
  };

  const handleSubmeter = async () => {
    if (!confirm('Submeter esta lista para aprovacao do administrador?')) return;
    setSubmetendo(true);
    setError('');
    try {
      await api.post(`/v1/collaborator/listas-rapidas/${listaId}/submeter`);
      setSuccess('Lista submetida para aprovacao com sucesso!');
      fetchLista();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao submeter lista');
    } finally {
      setSubmetendo(false);
    }
  };

  const handleItemFormChange = (field: keyof ItemForm, value: string) => {
    setItemForm((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  if (!lista) {
    return <Alert variant="danger">Lista rapida nao encontrada.</Alert>;
  }

  const isRascunho = lista.status === 'RASCUNHO';

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <Link href="/collaborator/listas-rapidas" className={styles.backButton}>
          ← Voltar para Minhas Listas
        </Link>

        {/* Cabecalho */}
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <h1
              className={styles.listTitle}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
            >
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
                <span className={styles.metaLabel}>Data:</span>
                {formatDate(lista.criadoEm)}
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Itens:</span>
                {lista.itens.length}
              </div>
            </div>
          </div>

          {isRascunho && (
            <div className={styles.headerActions}>
              <Button
                variant="success"
                onClick={handleSubmeter}
                disabled={submetendo || lista.itens.length === 0}
                title={lista.itens.length === 0 ? 'Adicione ao menos um item antes de submeter' : ''}
              >
                {submetendo ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  <>
                    <FaPaperPlane className="me-1" /> Submeter para Aprovacao
                  </>
                )}
              </Button>
            </div>
          )}
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
          <h2 className={styles.sectionTitle}>Itens ({lista.itens.length})</h2>
          <div className={styles.tableWrapper}>
            <Table bordered hover responsive className={styles.table}>
              <thead>
                <tr className={styles.tableHeader}>
                  <th className={styles.tableHeaderCell}>Nome</th>
                  <th className={styles.tableHeaderCell}>Quantidade</th>
                  <th className={styles.tableHeaderCell}>Unidade</th>
                </tr>
              </thead>
              <tbody>
                {lista.itens.map((item) => (
                  <tr key={item.id} className={styles.tableRow}>
                    <td className={`${styles.tableCell} fw-semibold`}>{item.nome}</td>
                    <td className={styles.tableCell}>
                      {item.quantidade ?? <span className={styles.cellMuted}>—</span>}
                    </td>
                    <td className={styles.tableCell}>
                      {item.unidade ?? <span className={styles.cellMuted}>—</span>}
                    </td>
                  </tr>
                ))}
                {lista.itens.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-muted py-4">
                      Nenhum item adicionado ainda
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </div>

        {/* Formulario de adicao de item (apenas RASCUNHO) */}
        {isRascunho && (
          <div className={styles.addItemSection}>
            <h3 className={styles.sectionTitle}>Adicionar Item</h3>
            {itemError && (
              <Alert variant="danger" dismissible onClose={() => setItemError('')}>
                {itemError}
              </Alert>
            )}
            <Form onSubmit={handleAddItem}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <Form.Label>
                    Nome <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={itemForm.nome}
                    onChange={(e) => handleItemFormChange('nome', e.target.value)}
                    placeholder="Ex: Farinha de trigo"
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <Form.Label>Quantidade</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemForm.quantidade}
                    onChange={(e) => handleItemFormChange('quantidade', e.target.value)}
                    placeholder="Ex: 5"
                  />
                </div>
                <div className={styles.formGroup}>
                  <Form.Label>Unidade</Form.Label>
                  <Form.Control
                    type="text"
                    value={itemForm.unidade}
                    onChange={(e) => handleItemFormChange('unidade', e.target.value)}
                    placeholder="Ex: kg, L, un"
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <Button type="submit" variant="primary" disabled={addingItem}>
                    {addingItem ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      <>
                        <FaPlus className="me-1" /> Adicionar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Form>
          </div>
        )}
      </div>
    </div>
  );
}
