'use client';

import { useState, useEffect, use } from 'react';
import { Table, Button, Alert, Spinner, Form } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import styles from './AreaEstoque.module.css';
import { FaArrowLeft, FaSave, FaPaperPlane } from 'react-icons/fa';

interface ItemEstoque {
  id: number;
  quantidadeMinima: number;
  quantidadeAtual: number;
  item: { id: number; nome: string; unidadeMedida: string };
  lista: { id: number; nome: string };
}

export default function AreaEstoquePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const areaId = Number(id);

  const [itens, setItens] = useState<ItemEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [qtds, setQtds] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get(`/v1/collaborator/areas/${areaId}/estoque`);
        setItens(data);
        const init: Record<number, number> = {};
        data.forEach((i: ItemEstoque) => { init[i.id] = i.quantidadeAtual; });
        setQtds(init);
      } catch {
        setError('Erro ao carregar estoque');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [areaId]);

  const handleSalvar = async () => {
    setSaving(true);
    setError('');
    try {
      const itensMod = itens
        .filter((i) => qtds[i.id] !== i.quantidadeAtual)
        .map((i) => ({ itemRefId: i.id, quantidadeAtual: qtds[i.id] ?? i.quantidadeAtual }));

      if (itensMod.length === 0) {
        setSuccess('Nenhuma alteração detectada');
        setSaving(false);
        return;
      }
      await api.put(`/v1/collaborator/areas/${areaId}/estoque`, { itens: itensMod });
      // Atualiza estado local
      setItens((prev) =>
        prev.map((i) => ({ ...i, quantidadeAtual: qtds[i.id] ?? i.quantidadeAtual })),
      );
      setSuccess('Quantidades salvas com sucesso!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmeter = async () => {
    if (!confirm('Submeter esta área? Serão criados pedidos para todos os itens abaixo do mínimo.')) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/v1/collaborator/areas/${areaId}/submeter`);
      setSuccess('Submissão criada com sucesso! O administrador foi notificado.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao submeter');
    } finally {
      setSubmitting(false);
    }
  };

  const itensPendentes = itens.filter(
    (i) => (qtds[i.id] ?? i.quantidadeAtual) < i.quantidadeMinima,
  ).length;

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <button className={styles.backBtn} onClick={() => router.push('/collaborator/areas')}>
            <FaArrowLeft /> Voltar
          </button>
          <h2 className={styles.pageTitle}>Estoque da Área</h2>
          <div className={styles.headerActions}>
            <Button
              variant="outline-primary"
              onClick={handleSalvar}
              disabled={saving}
            >
              {saving ? <Spinner size="sm" animation="border" /> : <><FaSave className="me-1" />Salvar</>}
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmeter}
              disabled={submitting || itensPendentes === 0}
            >
              {submitting
                ? <Spinner size="sm" animation="border" />
                : <><FaPaperPlane className="me-1" />Submeter {itensPendentes > 0 && `(${itensPendentes})`}</>}
            </Button>
          </div>
        </div>

        {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

        {itens.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>Nenhum item com quantidade mínima definida nesta área.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <Table responsive className={styles.table}>
              <thead className={styles.tableHeader}>
                <tr>
                  <th className={styles.th}>Lista</th>
                  <th className={styles.th}>Item</th>
                  <th className={styles.th}>Unidade</th>
                  <th className={styles.th} style={{ width: 90 }}>Mínimo</th>
                  <th className={styles.th} style={{ width: 120 }}>Atual</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => {
                  const atual = qtds[item.id] ?? item.quantidadeAtual;
                  const baixo = atual < item.quantidadeMinima;
                  return (
                    <tr key={item.id} className={baixo ? styles.rowBaixo : styles.row}>
                      <td className={styles.td}>
                        <span className={styles.listaNome}>{item.lista.nome}</span>
                      </td>
                      <td className={styles.td}>{item.item.nome}</td>
                      <td className={styles.td}>{item.item.unidadeMedida}</td>
                      <td className={styles.td}>{item.quantidadeMinima}</td>
                      <td className={styles.td}>
                        <Form.Control
                          type="number"
                          min={0}
                          step={0.01}
                          size="sm"
                          className={styles.qtdInput}
                          value={atual}
                          onChange={(e) =>
                            setQtds((prev) => ({
                              ...prev,
                              [item.id]: Number(e.target.value),
                            }))
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
