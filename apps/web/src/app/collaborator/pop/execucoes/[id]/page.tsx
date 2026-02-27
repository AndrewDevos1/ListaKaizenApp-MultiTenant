'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Alert, Spinner, Badge, Button, ProgressBar, Form } from 'react-bootstrap';
import api from '@/lib/api';
import styles from './POPExecucaoDetail.module.css';
import { FaClipboard, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

type StatusExecucao = 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';

const STATUS_VARIANT: Record<StatusExecucao, string> = {
  EM_ANDAMENTO: 'primary',
  CONCLUIDO: 'success',
  CANCELADO: 'secondary',
};

interface PassoExecucao {
  id: number;
  marcado: boolean;
  observacao: string | null;
  passo: {
    id: number;
    descricao: string;
    ordem: number;
  };
}

interface POPExecucao {
  id: number;
  status: StatusExecucao;
  criadoEm: string;
  template: { id: number; nome: string; tipo: string };
  passos: PassoExecucao[];
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

export default function CollaboratorPOPExecucaoDetailPage() {
  const params = useParams();
  const execucaoId = params.id as string;

  const [execucao, setExecucao] = useState<POPExecucao | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [marcandoId, setMarcandoId] = useState<number | null>(null);
  const [observacoes, setObservacoes] = useState<Record<number, string>>({});
  const [concluindo, setConcluindo] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  const fetchExecucao = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/v1/collaborator/pop/execucoes/${execucaoId}`);
      setExecucao(data);
      // Inicializar observacoes dos passos ja salvos
      const obs: Record<number, string> = {};
      data.passos.forEach((p: PassoExecucao) => {
        if (p.observacao) obs[p.id] = p.observacao;
      });
      setObservacoes(obs);
    } catch {
      setError('Erro ao carregar execucao POP');
    } finally {
      setLoading(false);
    }
  }, [execucaoId]);

  useEffect(() => {
    fetchExecucao();
  }, [fetchExecucao]);

  const handleMarcar = async (passoExecucaoId: number, marcadoAtual: boolean) => {
    if (execucao?.status !== 'EM_ANDAMENTO') return;
    setMarcandoId(passoExecucaoId);
    setError('');
    try {
      const novoMarcado = !marcadoAtual;
      const obs = observacoes[passoExecucaoId] || undefined;
      await api.put(
        `/v1/collaborator/pop/execucoes/${execucaoId}/passos/${passoExecucaoId}/marcar`,
        { marcado: novoMarcado, observacao: obs },
      );
      // Optimistic update
      setExecucao((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          passos: prev.passos.map((p) =>
            p.id === passoExecucaoId ? { ...p, marcado: novoMarcado } : p,
          ),
        };
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao marcar passo');
    } finally {
      setMarcandoId(null);
    }
  };

  const handleConcluir = async () => {
    if (!confirm('Concluir esta execucao? Esta acao nao pode ser desfeita.')) return;
    setConcluindo(true);
    setError('');
    try {
      await api.put(`/v1/collaborator/pop/execucoes/${execucaoId}/concluir`);
      setSuccess('Execucao concluida com sucesso!');
      fetchExecucao();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao concluir execucao');
    } finally {
      setConcluindo(false);
    }
  };

  const handleCancelar = async () => {
    if (!confirm('Cancelar esta execucao?')) return;
    setCancelando(true);
    setError('');
    try {
      await api.put(`/v1/collaborator/pop/execucoes/${execucaoId}/cancelar`);
      setSuccess('Execucao cancelada.');
      fetchExecucao();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao cancelar execucao');
    } finally {
      setCancelando(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  if (!execucao) {
    return <Alert variant="danger">Execucao POP nao encontrada.</Alert>;
  }

  const totalPassos = execucao.passos.length;
  const marcados = execucao.passos.filter((p) => p.marcado).length;
  const progresso = totalPassos > 0 ? Math.round((marcados / totalPassos) * 100) : 0;
  const isAtiva = execucao.status === 'EM_ANDAMENTO';

  const passosOrdenados = [...execucao.passos].sort(
    (a, b) => a.passo.ordem - b.passo.ordem,
  );

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <Link href="/collaborator/pop/execucoes" className={styles.backButton}>
          ← Voltar para Execucoes
        </Link>

        {/* Cabecalho */}
        <div className={styles.header}>
          <h1
            className={styles.execTitle}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
          >
            <FaClipboard />
            {execucao.template.nome}
          </h1>
          <div className={styles.execMeta}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Status:</span>
              <Badge bg={STATUS_VARIANT[execucao.status]} style={{ fontSize: '0.9rem' }}>
                {execucao.status}
              </Badge>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Tipo:</span>
              <Badge bg="secondary">{execucao.template.tipo}</Badge>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Iniciada em:</span>
              {formatDate(execucao.criadoEm)}
            </div>
          </div>
          <div className={styles.progressSection}>
            <p className={styles.progressText}>
              {marcados} de {totalPassos} passos concluidos ({progresso}%)
            </p>
            <ProgressBar
              now={progresso}
              label={`${progresso}%`}
              variant={progresso === 100 ? 'success' : 'primary'}
              striped={progresso < 100}
              animated={isAtiva && progresso < 100}
            />
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

        {/* Botoes de acao */}
        <div className={styles.actionsBar}>
          <Button
            variant="success"
            onClick={handleConcluir}
            disabled={!isAtiva || concluindo || cancelando}
          >
            {concluindo ? (
              <Spinner animation="border" size="sm" />
            ) : (
              <>
                <FaCheckCircle className="me-1" /> Concluir Execucao
              </>
            )}
          </Button>
          <Button
            variant="outline-danger"
            onClick={handleCancelar}
            disabled={!isAtiva || concluindo || cancelando}
          >
            {cancelando ? (
              <Spinner animation="border" size="sm" />
            ) : (
              <>
                <FaTimesCircle className="me-1" /> Cancelar
              </>
            )}
          </Button>
        </div>

        {/* Lista de Passos */}
        <div className={styles.passosSection}>
          <h2 className={styles.sectionTitle}>Passos ({totalPassos})</h2>

          {passosOrdenados.map((p) => (
            <div
              key={p.id}
              className={`${styles.passoItem} ${p.marcado ? styles.marcado : ''}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.15rem' }}>
                {marcandoId === p.id ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  <Form.Check
                    type="checkbox"
                    className={styles.passoCheckbox}
                    checked={p.marcado}
                    onChange={() => handleMarcar(p.id, p.marcado)}
                    disabled={!isAtiva || marcandoId !== null}
                    aria-label={`Marcar passo: ${p.passo.descricao}`}
                  />
                )}
              </div>

              <div className={styles.passoContent}>
                <span className={styles.passoOrdem}>Passo {p.passo.ordem}</span>
                <p
                  className={`${styles.passoDescricao} ${p.marcado ? styles.textoCortado : ''}`}
                >
                  {p.passo.descricao}
                </p>
                {isAtiva && (
                  <Form.Control
                    className={styles.obsInput}
                    type="text"
                    size="sm"
                    placeholder="Observacao opcional..."
                    value={observacoes[p.id] ?? ''}
                    onChange={(e) =>
                      setObservacoes((prev) => ({ ...prev, [p.id]: e.target.value }))
                    }
                    onBlur={() => {
                      // Salvar observacao ao perder foco se o passo ja esta marcado
                      if (p.marcado) {
                        api
                          .put(
                            `/v1/collaborator/pop/execucoes/${execucaoId}/passos/${p.id}/marcar`,
                            { marcado: true, observacao: observacoes[p.id] || undefined },
                          )
                          .catch(() => {});
                      }
                    }}
                  />
                )}
                {!isAtiva && p.observacao && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Obs: {p.observacao}
                  </p>
                )}
              </div>
            </div>
          ))}

          {passosOrdenados.length === 0 && (
            <p className="text-center text-muted py-3">Este template nao possui passos.</p>
          )}
        </div>
      </div>
    </div>
  );
}
