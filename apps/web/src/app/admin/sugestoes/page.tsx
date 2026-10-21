'use client';

import { useState, useEffect, useCallback } from 'react';
import { Table, Alert, Spinner, Badge, Button, Tabs, Tab, Modal, Form } from 'react-bootstrap';
import api from '@/lib/api';
import styles from './Sugestoes.module.css';
import { FaLightbulb, FaCheck, FaTimes } from 'react-icons/fa';

type Status = 'PENDENTE' | 'APROVADO' | 'REJEITADO';

interface Sugestao {
  id: number;
  nome: string;
  unidadeMedida: string;
  status: Status;
  criadoEm: string;
  usuario: { id: number; nome: string };
}

const STATUS_VARIANT: Record<Status, string> = {
  PENDENTE: 'warning',
  APROVADO: 'success',
  REJEITADO: 'danger',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

export default function AdminSugestoesPage() {
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<Status>('PENDENTE');

  // Modal de aprovação com campos editáveis
  const [showAprovarModal, setShowAprovarModal] = useState(false);
  const [sugestaoParaAprovar, setSugestaoParaAprovar] = useState<Sugestao | null>(null);
  const [unidadeEdit, setUnidadeEdit] = useState('');
  const [mensagemAdmin, setMensagemAdmin] = useState('');
  const [modalError, setModalError] = useState('');
  const [confirmando, setConfirmando] = useState(false);

  // Modal de rejeição
  const [showRejeitarModal, setShowRejeitarModal] = useState(false);
  const [sugestaoParaRejeitar, setSugestaoParaRejeitar] = useState<Sugestao | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [rejeitando, setRejeitando] = useState(false);

  const fetchSugestoes = useCallback(async (status: Status) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/v1/admin/sugestoes', { params: { status } });
      setSugestoes(data);
    } catch {
      setError('Erro ao carregar sugestoes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSugestoes(activeTab);
  }, [activeTab, fetchSugestoes]);

  const openAprovarModal = (sugestao: Sugestao) => {
    setSugestaoParaAprovar(sugestao);
    setUnidadeEdit(sugestao.unidadeMedida ?? '');
    setMensagemAdmin('');
    setModalError('');
    setShowAprovarModal(true);
  };

  const closeAprovarModal = () => {
    setShowAprovarModal(false);
    setSugestaoParaAprovar(null);
    setModalError('');
  };

  const handleConfirmarAprovacao = async () => {
    if (!sugestaoParaAprovar) return;
    if (!unidadeEdit.trim()) {
      setModalError('Unidade é obrigatória.');
      return;
    }
    setConfirmando(true);
    setModalError('');
    try {
      await api.put(`/v1/admin/sugestoes/${sugestaoParaAprovar.id}/aprovar`, {
        unidade: unidadeEdit.trim(),
        mensagem_admin: mensagemAdmin.trim() || undefined,
      });
      setSuccess(`Sugestao "${sugestaoParaAprovar.nome}" aprovada! O item foi adicionado ao catalogo.`);
      closeAprovarModal();
      fetchSugestoes(activeTab);
    } catch (err: any) {
      setModalError(err?.response?.data?.message || 'Erro ao aprovar sugestao');
    } finally {
      setConfirmando(false);
    }
  };

  const openRejeitarModal = (sugestao: Sugestao) => {
    setSugestaoParaRejeitar(sugestao);
    setMotivoRejeicao('');
    setModalError('');
    setShowRejeitarModal(true);
  };

  const closeRejeitarModal = () => {
    setShowRejeitarModal(false);
    setSugestaoParaRejeitar(null);
    setModalError('');
  };

  const handleConfirmarRejeicao = async () => {
    if (!sugestaoParaRejeitar) return;
    setRejeitando(true);
    setModalError('');
    try {
      await api.put(`/v1/admin/sugestoes/${sugestaoParaRejeitar.id}/rejeitar`, {
        mensagem_admin: motivoRejeicao.trim() || undefined,
      });
      setSuccess(`Sugestao "${sugestaoParaRejeitar.nome}" rejeitada.`);
      closeRejeitarModal();
      fetchSugestoes(activeTab);
    } catch (err: any) {
      setModalError(err?.response?.data?.message || 'Erro ao rejeitar sugestao');
    } finally {
      setRejeitando(false);
    }
  };

  const handleAprovar = (sugestao: Sugestao) => {
    openAprovarModal(sugestao);
  };

  const handleRejeitar = (sugestao: Sugestao) => {
    openRejeitarModal(sugestao);
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <h2 className={styles.pageTitle}>
            <FaLightbulb className="me-2" />
            Sugestoes de Itens
          </h2>
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

        <div className={styles.tabsWrapper}>
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => {
              setSuccess('');
              setActiveTab(k as Status);
            }}
            className="mb-3"
          >
            <Tab eventKey="PENDENTE" title="Pendente" />
            <Tab eventKey="APROVADO" title="Aprovado" />
            <Tab eventKey="REJEITADO" title="Rejeitado" />
          </Tabs>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" />
          </div>
        ) : sugestoes.length === 0 ? (
          <div className={styles.emptyState}>
            <FaLightbulb className={styles.emptyIcon} />
            <h3 className={styles.emptyTitle}>Nenhuma sugestao encontrada</h3>
            <p className={styles.emptyText}>
              Nenhuma sugestao com status &ldquo;{activeTab}&rdquo; no momento.
            </p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <Table striped bordered hover responsive className={styles.table}>
              <thead>
                <tr className={styles.tableHeader}>
                  <th className={styles.tableHeaderCell}>#</th>
                  <th className={styles.tableHeaderCell}>Nome Sugerido</th>
                  <th className={styles.tableHeaderCell}>Unidade</th>
                  <th className={styles.tableHeaderCell}>Colaborador</th>
                  <th className={styles.tableHeaderCell}>Data</th>
                  <th className={styles.tableHeaderCell}>Status</th>
                  {activeTab === 'PENDENTE' && (
                    <th className={styles.tableHeaderCell} style={{ width: 160 }}>
                      Acoes
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {sugestoes.map((s) => (
                  <tr key={s.id} className={styles.tableRow}>
                    <td className={styles.tableCell}>{s.id}</td>
                    <td className={`${styles.tableCell} fw-semibold`}>{s.nome}</td>
                    <td className={styles.tableCell}>{s.unidadeMedida}</td>
                    <td className={styles.tableCell}>{s.usuario.nome}</td>
                    <td className={styles.tableCell}>{formatDate(s.criadoEm)}</td>
                    <td className={styles.tableCell}>
                      <Badge bg={STATUS_VARIANT[s.status]}>{s.status}</Badge>
                    </td>
                    {activeTab === 'PENDENTE' && (
                      <td className={styles.tableCell}>
                        <div className={styles.actionButtons}>
                          <Button
                            size="sm"
                            variant="outline-success"
                            title="Aprovar"
                            onClick={() => handleAprovar(s)}
                          >
                            <FaCheck />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            title="Rejeitar"
                            onClick={() => handleRejeitar(s)}
                          >
                            <FaTimes />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </div>

      {/* Modal de Aprovação */}
      <Modal show={showAprovarModal} onHide={closeAprovarModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaCheck className="me-2 text-success" />
            Aprovar Sugestao
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalError && (
            <Alert variant="danger" dismissible onClose={() => setModalError('')}>
              {modalError}
            </Alert>
          )}
          {sugestaoParaAprovar && (
            <>
              <p className="text-muted mb-3">
                Item sugerido: <strong>{sugestaoParaAprovar.nome}</strong> por{' '}
                <strong>{sugestaoParaAprovar.usuario.nome}</strong>
              </p>
              <Form.Group className="mb-3">
                <Form.Label>
                  Unidade de Medida <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  value={unidadeEdit}
                  onChange={(e) => setUnidadeEdit(e.target.value)}
                  placeholder="Ex: kg, L, un, cx"
                  required
                  autoFocus
                />
                <Form.Text className="text-muted">
                  Confirme ou ajuste a unidade antes de aprovar.
                </Form.Text>
              </Form.Group>
              <Form.Group>
                <Form.Label>Mensagem para o colaborador (opcional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={mensagemAdmin}
                  onChange={(e) => setMensagemAdmin(e.target.value)}
                  placeholder="Ex: Item adicionado com a unidade ajustada para kg."
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeAprovarModal} disabled={confirmando}>
            Cancelar
          </Button>
          <Button variant="success" onClick={handleConfirmarAprovacao} disabled={confirmando}>
            {confirmando ? (
              <><Spinner animation="border" size="sm" className="me-1" /> Aprovando...</>
            ) : (
              <><FaCheck className="me-1" /> Aprovar</>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Rejeição */}
      <Modal show={showRejeitarModal} onHide={closeRejeitarModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaTimes className="me-2 text-danger" />
            Rejeitar Sugestao
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalError && (
            <Alert variant="danger" dismissible onClose={() => setModalError('')}>
              {modalError}
            </Alert>
          )}
          {sugestaoParaRejeitar && (
            <>
              <p className="text-muted mb-3">
                Item sugerido: <strong>{sugestaoParaRejeitar.nome}</strong> por{' '}
                <strong>{sugestaoParaRejeitar.usuario.nome}</strong>
              </p>
              <Form.Group>
                <Form.Label>Motivo da rejeição (opcional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={motivoRejeicao}
                  onChange={(e) => setMotivoRejeicao(e.target.value)}
                  placeholder="Ex: Item já existe no catalogo com outro nome."
                  autoFocus
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeRejeitarModal} disabled={rejeitando}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirmarRejeicao} disabled={rejeitando}>
            {rejeitando ? (
              <><Spinner animation="border" size="sm" className="me-1" /> Rejeitando...</>
            ) : (
              <><FaTimes className="me-1" /> Rejeitar</>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
