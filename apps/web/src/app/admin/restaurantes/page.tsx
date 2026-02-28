'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Container,
  Table,
  Badge,
  Spinner,
  Alert,
  Button,
  Modal,
  Form,
} from 'react-bootstrap';
import { FaStore, FaDownload, FaUpload, FaSync } from 'react-icons/fa';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface Restaurante {
  id: number;
  nome: string;
  cnpj: string | null;
  ativo: boolean;
  _count: { usuarios: number };
}

interface ResumoRestore {
  sucesso: true;
  restaurante: string;
  usuarios: { criados: number; ignorados: number };
  fornecedores: { criados: number; ignorados: number };
  itens: { criados: number; ignorados: number };
  listas: { criadas: number; ignoradas: number };
  listaItemRefs: { criados: number; ignorados: number };
}

export default function AdminRestaurantes() {
  const { isSuperAdmin } = useAuth();
  const router = useRouter();

  const [restaurantes, setRestaurantes] = useState<Restaurante[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Restore modal state
  const [showModal, setShowModal] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<Restaurante | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [restoreResult, setRestoreResult] = useState<ResumoRestore | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Backup state
  const [backupLoading, setBackupLoading] = useState<number | null>(null);

  const loadRestaurantes = () => {
    setLoading(true);
    setError('');
    api
      .get('/restaurantes')
      .then((r) => setRestaurantes(r.data))
      .catch(() => setError('Erro ao carregar restaurantes'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isSuperAdmin) {
      router.replace('/admin/dashboard');
      return;
    }
    loadRestaurantes();
  }, [isSuperAdmin, router]);

  if (!isSuperAdmin) return null;

  const handleBackup = async (r: Restaurante) => {
    setBackupLoading(r.id);
    setError('');
    try {
      const res = await api.get(`/restaurantes/${r.id}/backup`, {
        responseType: 'blob',
      });
      const cd = res.headers['content-disposition'] as string | undefined;
      const match = cd?.match(/filename="?([^";\n]+)"?/);
      const filename = match?.[1] ?? `${r.nome}_backup.kaizen`;

      const url = window.URL.createObjectURL(new Blob([res.data as BlobPart]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError(`Erro ao gerar backup de "${r.nome}"`);
    } finally {
      setBackupLoading(null);
    }
  };

  const openRestoreModal = (r: Restaurante) => {
    setRestoreTarget(r);
    setFile(null);
    setRestoreError('');
    setRestoreResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowModal(true);
  };

  const openRestoreModalNew = () => {
    setRestoreTarget(null);
    setFile(null);
    setRestoreError('');
    setRestoreResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowModal(true);
  };

  const handleRestore = async () => {
    if (!file) {
      setRestoreError('Selecione um arquivo .kaizen');
      return;
    }
    setRestoring(true);
    setRestoreError('');
    setRestoreResult(null);
    try {
      const form = new FormData();
      form.append('arquivo', file);
      if (restoreTarget) form.append('restauranteId', String(restoreTarget.id));
      const res = await api.post('/restaurantes/restore', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setRestoreResult(res.data as ResumoRestore);
      loadRestaurantes();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Erro ao restaurar backup';
      setRestoreError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <FaStore className="me-2" />
          Gerenciar Restaurantes
        </h2>
        <div className="d-flex gap-2">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={openRestoreModalNew}
          >
            <FaUpload className="me-1" /> Restaurar Backup
          </Button>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={loadRestaurantes}
            disabled={loading}
          >
            <FaSync className="me-1" /> Atualizar
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Carregando restaurantes...</p>
        </div>
      ) : (
        <Table hover responsive className="shadow-sm">
          <thead className="table-light">
            <tr>
              <th>Nome</th>
              <th>CNPJ</th>
              <th className="text-center">Status</th>
              <th className="text-center">Usuários</th>
              <th className="text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {restaurantes.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-muted py-4">
                  Nenhum restaurante cadastrado
                </td>
              </tr>
            ) : (
              restaurantes.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.nome}</strong>
                  </td>
                  <td className="text-muted">{r.cnpj ?? '—'}</td>
                  <td className="text-center">
                    <Badge bg={r.ativo ? 'success' : 'secondary'}>
                      {r.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="text-center">{r._count.usuarios}</td>
                  <td className="text-center">
                    <div className="d-flex gap-2 justify-content-center">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleBackup(r)}
                        disabled={backupLoading === r.id}
                        title="Exportar backup"
                      >
                        {backupLoading === r.id ? (
                          <Spinner animation="border" size="sm" />
                        ) : (
                          <FaDownload />
                        )}
                      </Button>
                      <Button
                        variant="outline-warning"
                        size="sm"
                        onClick={() => openRestoreModal(r)}
                        title="Restaurar backup neste restaurante"
                      >
                        <FaUpload />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      )}

      {/* Modal de Restore */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaUpload className="me-2" />
            {restoreTarget
              ? `Restaurar em "${restoreTarget.nome}"`
              : 'Restaurar Backup'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {!restoreResult ? (
            <>
              <p className="text-muted small">
                {restoreTarget
                  ? `Os dados do arquivo serão importados para o restaurante "${restoreTarget.nome}". Registros duplicados serão ignorados.`
                  : 'O restaurante será criado ou encontrado pelo nome no arquivo de backup.'}
              </p>
              <Form.Group className="mb-3">
                <Form.Label>Arquivo .kaizen</Form.Label>
                <Form.Control
                  ref={fileInputRef}
                  type="file"
                  accept=".kaizen"
                  onChange={(e) => {
                    const f = (e.target as HTMLInputElement).files?.[0] ?? null;
                    setFile(f);
                    setRestoreError('');
                  }}
                />
              </Form.Group>
              {restoreError && (
                <Alert variant="danger" className="mb-0">
                  {restoreError}
                </Alert>
              )}
            </>
          ) : (
            <Alert variant="success">
              <Alert.Heading>Restauração concluída!</Alert.Heading>
              <p className="mb-1">
                <strong>Restaurante:</strong> {restoreResult.restaurante}
              </p>
              <hr />
              <div className="small">
                <div>
                  Usuários: {restoreResult.usuarios.criados} criados,{' '}
                  {restoreResult.usuarios.ignorados} ignorados
                </div>
                <div>
                  Fornecedores: {restoreResult.fornecedores.criados} criados,{' '}
                  {restoreResult.fornecedores.ignorados} ignorados
                </div>
                <div>
                  Itens: {restoreResult.itens.criados} criados,{' '}
                  {restoreResult.itens.ignorados} ignorados
                </div>
                <div>
                  Listas: {restoreResult.listas.criadas} criadas,{' '}
                  {restoreResult.listas.ignoradas} ignoradas
                </div>
                <div>
                  Refs de lista: {restoreResult.listaItemRefs.criados} criados,{' '}
                  {restoreResult.listaItemRefs.ignorados} ignorados
                </div>
              </div>
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Fechar
          </Button>
          {!restoreResult && (
            <Button
              variant="warning"
              onClick={handleRestore}
              disabled={restoring || !file}
            >
              {restoring ? (
                <>
                  <Spinner animation="border" size="sm" className="me-1" />
                  Restaurando...
                </>
              ) : (
                <>
                  <FaUpload className="me-1" />
                  Restaurar
                </>
              )}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
