'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Table,
  Button,
  Modal,
  Form,
  Alert,
  Spinner,
} from 'react-bootstrap';
import Link from 'next/link';
import api from '@/lib/api';
import { Item } from 'shared';
import styles from './ListaDetail.module.css';

interface ItemRef {
  id: number;
  quantidadeMinima: number;
  quantidadeAtual: number;
  usaThreshold: boolean;
  qtdFardo: number | null;
  item: Item;
}

interface ListaDetail {
  id: number;
  nome: string;
  colaboradores: Array<{
    id: number;
    usuario: { id: number; nome: string; email: string };
  }>;
  itensRef: ItemRef[];
}

// Estado de loading individual por itemRef
type LoadingField = 'usaThreshold' | 'qtdFardo' | 'quantidadeMinima';
type ItemLoadingState = Partial<Record<LoadingField, boolean>>;

export default function ListaDetailPage() {
  const params = useParams();
  const listaId = params.id as string;

  const [lista, setLista] = useState<ListaDetail | null>(null);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estado de loading individual por itemRef id e campo
  const [itemLoadings, setItemLoadings] = useState<Record<number, ItemLoadingState>>({});

  // Valores locais editados (antes de salvar)
  const [localQtdFardo, setLocalQtdFardo] = useState<Record<number, string>>({});
  const [localQtdMinima, setLocalQtdMinima] = useState<Record<number, string>>({});

  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantidadeMinima, setQuantidadeMinima] = useState('0');

  const fetchLista = useCallback(async () => {
    try {
      const { data } = await api.get(`/v1/listas/${listaId}`);
      setLista(data);
      // Inicializar valores locais editaveis
      const qtdFardoInit: Record<number, string> = {};
      const qtdMinimaInit: Record<number, string> = {};
      (data.itensRef as ItemRef[]).forEach((ir) => {
        qtdFardoInit[ir.id] = ir.qtdFardo !== null ? String(ir.qtdFardo) : '';
        qtdMinimaInit[ir.id] = String(ir.quantidadeMinima ?? 0);
      });
      setLocalQtdFardo(qtdFardoInit);
      setLocalQtdMinima(qtdMinimaInit);
    } catch {
      setError('Erro ao carregar lista');
    } finally {
      setLoading(false);
    }
  }, [listaId]);

  const fetchItems = async () => {
    try {
      const { data } = await api.get('/v1/items');
      setAllItems(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchLista();
    fetchItems();
  }, [fetchLista]);

  // Utilitario: definir loading de campo especifico para um itemRef
  const setFieldLoading = (itemRefId: number, field: LoadingField, value: boolean) => {
    setItemLoadings((prev) => ({
      ...prev,
      [itemRefId]: { ...prev[itemRefId], [field]: value },
    }));
  };

  // PUT helper
  const putItemRefConfig = async (
    itemRefId: number,
    field: LoadingField,
    body: Record<string, unknown>,
  ) => {
    setFieldLoading(itemRefId, field, true);
    try {
      await api.put(`/v1/admin/listas/${listaId}/itens/${itemRefId}`, body);
      // Atualizar estado local da lista sem re-fetch completo
      setLista((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          itensRef: prev.itensRef.map((ir) =>
            ir.id === itemRefId ? { ...ir, ...body } : ir,
          ),
        };
      });
    } catch {
      setError('Erro ao atualizar configuracao do item');
    } finally {
      setFieldLoading(itemRefId, field, false);
    }
  };

  const handleUsaThresholdChange = (ir: ItemRef, checked: boolean) => {
    putItemRefConfig(ir.id, 'usaThreshold', { usaThreshold: checked });
  };

  const handleQtdFardoBlur = (ir: ItemRef) => {
    const raw = localQtdFardo[ir.id];
    const val = raw === '' ? null : parseFloat(raw);
    if (val === ir.qtdFardo) return; // sem mudanca
    putItemRefConfig(ir.id, 'qtdFardo', { qtdFardo: val });
  };

  const handleQtdMinimaBlur = (ir: ItemRef) => {
    const raw = localQtdMinima[ir.id];
    const val = parseFloat(raw) || 0;
    if (val === ir.quantidadeMinima) return; // sem mudanca
    putItemRefConfig(ir.id, 'quantidadeMinima', { quantidadeMinima: val });
  };

  const handleAddItem = async () => {
    setError('');
    try {
      await api.post(`/v1/listas/${listaId}/itens`, {
        itemId: parseInt(selectedItemId),
        quantidadeMinima: parseFloat(quantidadeMinima) || 0,
      });
      setShowItemModal(false);
      setSelectedItemId('');
      setQuantidadeMinima('0');
      fetchLista();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao adicionar item');
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    if (!confirm('Remover item da lista?')) return;
    try {
      await api.delete(`/v1/listas/${listaId}/itens/${itemId}`);
      fetchLista();
    } catch {
      setError('Erro ao remover item');
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
    return <Alert variant="danger">Lista nao encontrada</Alert>;
  }

  const existingItemIds = new Set(lista.itensRef.map((ir) => ir.item.id));
  const availableItems = allItems.filter((i) => !existingItemIds.has(i.id));

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <Link href="/admin/listas" className={styles.backButton}>
          ← Voltar para Listas
        </Link>

        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <h1 className={styles.listTitle}>{lista.nome}</h1>
            <div className={styles.listMeta}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Itens:</span>
                {lista.itensRef.length}
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Colaboradores:</span>
                {lista.colaboradores.length}
              </div>
            </div>
          </div>
        </div>

        {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

        <div className={styles.statsSection}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total de Itens</div>
            <div className={styles.statValue}>{lista.itensRef.length}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Colaboradores</div>
            <div className={styles.statValue}>{lista.colaboradores.length}</div>
          </div>
        </div>

        <div className={styles.tableSection}>
          <h2 className={styles.sectionTitle}>Itens da Lista</h2>
          <div style={{ marginBottom: '1rem' }}>
            <Button variant="primary" onClick={() => setShowItemModal(true)}>
              + Adicionar Item
            </Button>
          </div>
          <div className={styles.tableWrapper}>
            <Table striped bordered hover responsive className={styles.table}>
              <thead>
                <tr className={styles.tableHeader}>
                  <th className={styles.tableHeaderCell}>Item</th>
                  <th className={styles.tableHeaderCell}>Unidade</th>
                  <th className={styles.tableHeaderCell}>Qtd Min</th>
                  <th className={styles.tableHeaderCell}>Qtd/Fardo</th>
                  <th className={styles.tableHeaderCell}>Usa Threshold</th>
                  <th className={styles.tableHeaderCell}></th>
                </tr>
              </thead>
              <tbody>
                {lista.itensRef.map((ir) => {
                  const fl = itemLoadings[ir.id] ?? {};
                  return (
                    <tr key={ir.id} className={styles.tableRow}>
                      <td className={styles.tableCell}>{ir.item.nome}</td>
                      <td className={styles.tableCell}>{ir.item.unidadeMedida}</td>

                      {/* Qtd Minima editavel */}
                      <td className={styles.tableCell}>
                        <Form.Control
                          type="number"
                          size="sm"
                          style={{ width: '80px' }}
                          value={localQtdMinima[ir.id] ?? ir.quantidadeMinima}
                          onChange={(e) =>
                            setLocalQtdMinima((prev) => ({
                              ...prev,
                              [ir.id]: e.target.value,
                            }))
                          }
                          onBlur={() => handleQtdMinimaBlur(ir)}
                          disabled={!!fl.quantidadeMinima}
                          min="0"
                          step="0.01"
                        />
                      </td>

                      {/* Qtd por Fardo */}
                      <td className={styles.tableCell}>
                        <Form.Control
                          type="number"
                          size="sm"
                          style={{ width: '80px' }}
                          value={localQtdFardo[ir.id] ?? (ir.qtdFardo !== null ? String(ir.qtdFardo) : '')}
                          placeholder="—"
                          onChange={(e) =>
                            setLocalQtdFardo((prev) => ({
                              ...prev,
                              [ir.id]: e.target.value,
                            }))
                          }
                          onBlur={() => handleQtdFardoBlur(ir)}
                          disabled={!!fl.qtdFardo}
                          min="0"
                          step="0.01"
                        />
                      </td>

                      {/* Usa Threshold toggle */}
                      <td className={styles.tableCell}>
                        <Form.Check
                          type="switch"
                          id={`threshold-${ir.id}`}
                          checked={ir.usaThreshold ?? false}
                          onChange={(e) => handleUsaThresholdChange(ir, e.target.checked)}
                          disabled={!!fl.usaThreshold}
                          label=""
                        />
                      </td>

                      <td className={styles.tableCell}>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => handleRemoveItem(ir.item.id)}
                        >
                          Remover
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {lista.itensRef.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted">
                      Nenhum item na lista
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </div>

        <div className={styles.tableSection}>
          <h2 className={styles.sectionTitle}>Colaboradores</h2>
          <div className={styles.tableWrapper}>
            <Table striped bordered hover responsive className={styles.table}>
              <thead>
                <tr className={styles.tableHeader}>
                  <th className={styles.tableHeaderCell}>Nome</th>
                  <th className={styles.tableHeaderCell}>Email</th>
                </tr>
              </thead>
              <tbody>
                {lista.colaboradores.map((c) => (
                  <tr key={c.id} className={styles.tableRow}>
                    <td className={styles.tableCell}>{c.usuario.nome}</td>
                    <td className={styles.tableCell}>{c.usuario.email}</td>
                  </tr>
                ))}
                {lista.colaboradores.length === 0 && (
                  <tr>
                    <td colSpan={2} className="text-center text-muted">
                      Nenhum colaborador vinculado
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </div>

        <Modal show={showItemModal} onHide={() => setShowItemModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Adicionar Item</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Item</Form.Label>
              <Form.Select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {availableItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome} ({item.unidadeMedida})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>Quantidade Mínima</Form.Label>
              <Form.Control
                type="number"
                value={quantidadeMinima}
                onChange={(e) => setQuantidadeMinima(e.target.value)}
                min="0"
                step="0.01"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowItemModal(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleAddItem}
              disabled={!selectedItemId}
            >
              Adicionar
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
}
