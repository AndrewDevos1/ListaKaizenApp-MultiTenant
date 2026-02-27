'use client';

import { useState, useEffect, useRef } from 'react';
import { Container, Card, Button, Form, Badge, Row, Col, Alert, Spinner, ListGroup } from 'react-bootstrap';
import {
  FaCog, FaUser, FaSignOutAlt, FaMoon, FaSun, FaClock,
  FaSyncAlt, FaDownload, FaBell, FaBellSlash, FaMobileAlt, FaUserEdit,
  FaUpload, FaFileArchive, FaFileCsv, FaCheckCircle, FaExclamationTriangle,
} from 'react-icons/fa';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import InstallAppButton from '@/components/InstallAppButton';
import api from '@/lib/api';

const SESSION_TIMEOUTS = [
  { value: 5, label: '5 minutos — Alta segurança' },
  { value: 10, label: '10 minutos — Alta segurança' },
  { value: 15, label: '15 minutos — Alta segurança' },
  { value: 30, label: '30 minutos — Padrão (recomendado)' },
  { value: 45, label: '45 minutos — Balanceado' },
  { value: 60, label: '60 minutos — Conveniência' },
  { value: 90, label: '90 minutos — Conveniência' },
  { value: 120, label: '120 minutos — Máximo' },
];

interface ZipResult {
  fornecedores: { criados: number; ignorados: number };
  areas: { criados: number; ignorados: number };
  itens: { criados: number; ignorados: number };
  listas: { criados: number; ignorados: number };
  erros: string[];
}

interface ListaCsvResult {
  vinculados: number;
  ignorados: number;
  naoEncontrados: string[];
  erros: string[];
}

export default function ConfiguracoesAdmin() {
  const { logout, user } = useAuth();
  const { success, error } = useToast();
  const { state: pushState, subscribe, unsubscribe } = usePushNotifications();

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(30);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingItens, setExportingItens] = useState(false);
  const [exportingFornecedores, setExportingFornecedores] = useState(false);

  // Import ZIP (Phase 1)
  const [importingZip, setImportingZip] = useState(false);
  const [zipResult, setZipResult] = useState<ZipResult | null>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  // Import per-list CSV (Phase 2)
  const [listas, setListas] = useState<{ id: number; nome: string }[]>([]);
  const [selectedListaId, setSelectedListaId] = useState<number | ''>('');
  const [importingCsv, setImportingCsv] = useState(false);
  const [csvResult, setCsvResult] = useState<ListaCsvResult | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const theme = localStorage.getItem('theme') || 'light';
    setIsDarkMode(theme === 'dark');
    const saved = localStorage.getItem('configSessionTimeout');
    if (saved) setSessionTimeout(parseInt(saved, 10));
    // Load listas for phase 2 dropdown
    api.get('/v1/admin/import/listas')
      .then((r) => setListas(r.data))
      .catch(() => {/* silently ignore */});
  }, []);

  const handleToggleDarkMode = () => {
    const newState = !isDarkMode;
    setIsDarkMode(newState);
    localStorage.setItem('theme', newState ? 'dark' : 'light');
    if (newState) document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  };

  const handleSaveSession = () => {
    localStorage.setItem('configSessionTimeout', sessionTimeout.toString());
    success('Configuração salva', `Timeout de sessão definido para ${sessionTimeout} minutos`);
  };

  const handleExportItens = async () => {
    setExportingItens(true);
    try {
      const { data } = await api.get('/v1/items/exportar-csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url; link.setAttribute('download', 'itens.csv');
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(url);
    } catch { /* handled by api interceptor */ } finally { setExportingItens(false); }
  };

  const handleExportFornecedores = async () => {
    setExportingFornecedores(true);
    try {
      const { data } = await api.get('/v1/admin/fornecedores/exportar-csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url; link.setAttribute('download', 'fornecedores.csv');
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(url);
    } catch { /* handled by api interceptor */ } finally { setExportingFornecedores(false); }
  };

  const handleHardRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
      window.location.reload();
    } catch { window.location.reload(); }
  };

  // ── Import: Phase 1 — ZIP ────────────────────────────────────────────────
  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportingZip(true);
    setZipResult(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await api.post<ZipResult>('/v1/admin/import/backup-zip', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setZipResult(data);
      const total = data.fornecedores.criados + data.areas.criados + data.itens.criados + data.listas.criados;
      success('Importação concluída', `${total} registros criados com sucesso`);
      // Refresh listas dropdown
      const r = await api.get('/v1/admin/import/listas');
      setListas(r.data);
    } catch (err: any) {
      error('Erro na importação', err.response?.data?.message ?? 'Não foi possível processar o arquivo');
    } finally {
      setImportingZip(false);
    }
  };

  // ── Import: Phase 2 — per-list CSV ──────────────────────────────────────
  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedListaId) return;
    setImportingCsv(true);
    setCsvResult(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await api.post<ListaCsvResult>(
        `/v1/admin/import/lista-csv/${selectedListaId}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      setCsvResult(data);
      success('Itens importados', `${data.vinculados} itens vinculados à lista`);
    } catch (err: any) {
      error('Erro na importação', err.response?.data?.message ?? 'Não foi possível processar o CSV');
    } finally {
      setImportingCsv(false);
    }
  };

  return (
    <Container className="py-4" style={{ maxWidth: 680 }}>
      <h2 className="mb-4"><FaCog className="me-2" />Configurações</h2>

      {/* Conta */}
      <Card className="mb-4 shadow-sm">
        <Card.Header><strong><FaUser className="me-2" />Conta do Usuário</strong></Card.Header>
        <Card.Body>
          <p className="text-muted mb-3">
            Logado como <strong>{user?.nome}</strong>
            {' '}<Badge bg="warning" text="dark" className="ms-1">{user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Administrador'}</Badge>
          </p>
          <div className="d-flex gap-2 flex-wrap">
            <Link href="/admin/editar-perfil">
              <Button variant="outline-primary" size="sm"><FaUserEdit className="me-1" /> Editar Perfil</Button>
            </Link>
            <Button variant="outline-danger" size="sm" onClick={logout}>
              <FaSignOutAlt className="me-1" /> Sair da Conta
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Aparência */}
      <Card className="mb-4 shadow-sm">
        <Card.Header><strong>{isDarkMode ? <FaMoon className="me-2" /> : <FaSun className="me-2" />}Aparência</strong></Card.Header>
        <Card.Body>
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <div className="fw-semibold">Modo {isDarkMode ? 'Escuro' : 'Claro'}</div>
              <small className="text-muted">Alterna entre tema claro e escuro</small>
            </div>
            <Button variant={isDarkMode ? 'light' : 'dark'} size="sm" onClick={handleToggleDarkMode}>
              {isDarkMode ? <><FaSun className="me-1" /> Modo Claro</> : <><FaMoon className="me-1" /> Modo Escuro</>}
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* ── Importar Dados do Legado ─────────────────────────────────────── */}
      <Card className="mb-4 shadow-sm border-primary">
        <Card.Header className="bg-primary text-white">
          <strong><FaUpload className="me-2" />Importar Dados do Legado</strong>
        </Card.Header>
        <Card.Body>
          <p className="text-muted mb-4">
            Migre seus dados do sistema antigo (Flask) em duas fases. A Fase 1 cria todas as
            entidades; a Fase 2 vincula os itens às listas com quantidades.
          </p>

          {/* ── Fase 1 ── */}
          <h6 className="fw-bold mb-1">Fase 1 — Backup ZIP do sistema legado</h6>
          <p className="text-muted small mb-3">
            No sistema antigo: <strong>Configurações → Exportar Dados</strong> (selecione
            Áreas, Itens, Fornecedores e Listas). Faça o upload do ZIP gerado aqui.
          </p>

          <div className="d-flex align-items-center gap-3 mb-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => zipInputRef.current?.click()}
              disabled={importingZip}
            >
              {importingZip
                ? <><Spinner size="sm" className="me-1" /> Importando...</>
                : <><FaFileArchive className="me-1" /> Selecionar arquivo .zip</>}
            </Button>
            <small className="text-muted">Máx. 20 MB</small>
          </div>
          <input ref={zipInputRef} type="file" accept=".zip" style={{ display: 'none' }} onChange={handleZipUpload} />

          {zipResult && (
            <Alert variant={zipResult.erros.length > 0 ? 'warning' : 'success'} className="mb-3">
              <div className="fw-bold mb-2">
                <FaCheckCircle className="me-1" /> Resultado da importação:
              </div>
              <Row className="g-2 mb-2">
                {(['fornecedores', 'areas', 'itens', 'listas'] as const).map((k) => (
                  <Col xs={6} key={k}>
                    <small>
                      <strong>{k.charAt(0).toUpperCase() + k.slice(1)}:</strong>{' '}
                      {zipResult[k].criados} criado{zipResult[k].criados !== 1 ? 's' : ''},{' '}
                      {zipResult[k].ignorados} já existia{zipResult[k].ignorados !== 1 ? 'm' : ''}
                    </small>
                  </Col>
                ))}
              </Row>
              {zipResult.erros.length > 0 && (
                <>
                  <div className="fw-bold text-danger mt-2"><FaExclamationTriangle className="me-1" />{zipResult.erros.length} erro(s):</div>
                  <ListGroup variant="flush" className="mt-1">
                    {zipResult.erros.slice(0, 5).map((e, i) => (
                      <ListGroup.Item key={i} className="py-1 px-0 small text-danger bg-transparent">{e}</ListGroup.Item>
                    ))}
                    {zipResult.erros.length > 5 && <ListGroup.Item className="py-1 px-0 small text-muted bg-transparent">…e mais {zipResult.erros.length - 5}</ListGroup.Item>}
                  </ListGroup>
                </>
              )}
            </Alert>
          )}

          <hr />

          {/* ── Fase 2 ── */}
          <h6 className="fw-bold mb-1">Fase 2 — CSV de itens por lista</h6>
          <p className="text-muted small mb-3">
            No sistema antigo: abra cada lista e use o botão{' '}
            <strong>"Exportar CSV"</strong>. Selecione a lista correspondente abaixo e
            faça o upload do CSV. Repita para cada lista.
          </p>

          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold">Selecione a lista de destino</Form.Label>
            <Form.Select
              value={selectedListaId}
              onChange={(e) => { setSelectedListaId(e.target.value ? parseInt(e.target.value) : ''); setCsvResult(null); }}
              style={{ maxWidth: 360 }}
              size="sm"
            >
              <option value="">— escolha uma lista —</option>
              {listas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </Form.Select>
            {listas.length === 0 && (
              <Form.Text className="text-muted">Importe o ZIP (Fase 1) primeiro para que as listas apareçam aqui.</Form.Text>
            )}
          </Form.Group>

          <div className="d-flex align-items-center gap-3 mb-3">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => csvInputRef.current?.click()}
              disabled={!selectedListaId || importingCsv}
            >
              {importingCsv
                ? <><Spinner size="sm" className="me-1" /> Importando...</>
                : <><FaFileCsv className="me-1" /> Selecionar arquivo .csv</>}
            </Button>
            <small className="text-muted">Máx. 5 MB</small>
          </div>
          <input ref={csvInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvUpload} />

          {csvResult && (
            <Alert variant={csvResult.erros.length > 0 || csvResult.naoEncontrados.length > 0 ? 'warning' : 'success'}>
              <div className="fw-bold mb-1"><FaCheckCircle className="me-1" /> Resultado:</div>
              <div className="small">
                <strong>{csvResult.vinculados}</strong> itens vinculados ·{' '}
                <strong>{csvResult.ignorados}</strong> já existiam
              </div>
              {csvResult.naoEncontrados.length > 0 && (
                <div className="mt-2 small text-warning">
                  <FaExclamationTriangle className="me-1" />
                  <strong>{csvResult.naoEncontrados.length} item(s) não encontrado(s)</strong> no catálogo
                  (serão ignorados): {csvResult.naoEncontrados.slice(0, 5).join(', ')}
                  {csvResult.naoEncontrados.length > 5 && '…'}
                </div>
              )}
            </Alert>
          )}
        </Card.Body>
      </Card>

      {/* Exportar Dados CSV */}
      <Card className="mb-4 shadow-sm">
        <Card.Header><strong><FaDownload className="me-2" />Exportar Dados</strong></Card.Header>
        <Card.Body>
          <p className="text-muted mb-3">Exporta os dados do restaurante em formato CSV.</p>
          <Row className="g-2">
            <Col xs="auto">
              <Button variant="outline-success" size="sm" onClick={handleExportItens} disabled={exportingItens}>
                <FaDownload className="me-1" /> {exportingItens ? 'Exportando...' : 'Exportar Itens (CSV)'}
              </Button>
            </Col>
            <Col xs="auto">
              <Button variant="outline-success" size="sm" onClick={handleExportFornecedores} disabled={exportingFornecedores}>
                <FaDownload className="me-1" /> {exportingFornecedores ? 'Exportando...' : 'Exportar Fornecedores (CSV)'}
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Timeout de Sessão */}
      <Card className="mb-4 shadow-sm">
        <Card.Header><strong><FaClock className="me-2" />Timeout de Sessão</strong></Card.Header>
        <Card.Body>
          <p className="text-muted mb-3">
            Define o tempo de inatividade antes de solicitar novo login.
          </p>
          <Form.Group className="mb-3">
            <Form.Label>Tempo de sessão</Form.Label>
            <Form.Select value={sessionTimeout} onChange={(e) => setSessionTimeout(parseInt(e.target.value, 10))} style={{ maxWidth: 360 }}>
              {SESSION_TIMEOUTS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </Form.Select>
            <Form.Text className="text-muted">
              Após {sessionTimeout} minuto{sessionTimeout !== 1 ? 's' : ''} sem atividade, o login será encerrado.
            </Form.Text>
          </Form.Group>
          <div className="d-flex gap-2">
            <Button variant="primary" size="sm" onClick={handleSaveSession}>Salvar</Button>
            <Button variant="outline-secondary" size="sm" onClick={() => { setSessionTimeout(30); localStorage.setItem('configSessionTimeout', '30'); success('Padrão restaurado', 'Timeout resetado para 30 minutos'); }}>
              Resetar Padrão
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Notificações Push */}
      <Card className="mb-4 shadow-sm">
        <Card.Header><strong><FaBell className="me-2" />Notificações Push</strong></Card.Header>
        <Card.Body>
          <p className="text-muted mb-3">Receba notificações nativas mesmo com o app fechado.</p>
          {pushState === 'unsupported' && <Alert variant="warning" className="mb-0">Seu navegador não suporta notificações push.</Alert>}
          {pushState === 'denied' && <Alert variant="danger" className="mb-0">Permissão negada. Habilite nas configurações do navegador.</Alert>}
          {(pushState === 'idle' || pushState === 'loading') && (
            <Button variant="primary" size="sm" onClick={subscribe} disabled={pushState === 'loading'}>
              <FaBell className="me-1" /> {pushState === 'loading' ? 'Ativando...' : 'Ativar notificações'}
            </Button>
          )}
          {pushState === 'subscribed' && (
            <div className="d-flex align-items-center gap-3">
              <Badge bg="success"><FaBell className="me-1" /> Notificações ativas</Badge>
              <Button variant="outline-secondary" size="sm" onClick={unsubscribe}><FaBellSlash className="me-1" /> Desativar</Button>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Instalar App (PWA) */}
      <Card className="mb-4 shadow-sm">
        <Card.Header><strong><FaMobileAlt className="me-2" />Instalar App</strong></Card.Header>
        <Card.Body>
          <p className="text-muted mb-3">Instale o Kaizen na tela inicial do seu dispositivo para acesso rápido.</p>
          <InstallAppButton />
          <small className="text-muted d-block mt-2">Se o botão não aparecer, o app já está instalado ou seu navegador não suporta instalação.</small>
        </Card.Body>
      </Card>

      {/* Atualizar App */}
      <Card className="mb-4 shadow-sm">
        <Card.Header><strong><FaSyncAlt className="me-2" />Atualizar App</strong></Card.Header>
        <Card.Body>
          <p className="text-muted mb-3">Limpa o cache do service worker e força o carregamento da versão mais recente.</p>
          <Button variant="outline-primary" size="sm" onClick={handleHardRefresh} disabled={refreshing}>
            <FaSyncAlt className={`me-1 ${refreshing ? 'fa-spin' : ''}`} />
            {refreshing ? 'Atualizando...' : 'Atualizar agora'}
          </Button>
        </Card.Body>
      </Card>
    </Container>
  );
}
