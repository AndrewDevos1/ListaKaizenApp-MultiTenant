'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Form, Row, Spinner, Table } from 'react-bootstrap';
import {
  FaBuilding,
  FaChartBar,
  FaCheckCircle,
  FaClipboardList,
  FaFileExcel,
  FaFilePdf,
  FaFileInvoiceDollar,
  FaShoppingCart,
  FaStore,
  FaSync,
  FaUserClock,
  FaUsers,
} from 'react-icons/fa';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import styles from './GlobalDashboard.module.css';

interface DashboardGlobalData {
  filtros: {
    restauranteId: number | null;
    period: number;
    generatedAt: string;
  };
  restaurantesDisponiveis: Array<{
    id: number;
    nome: string;
    ativo: boolean;
  }>;
  summary: {
    totalRestaurantes: number;
    totalUsuarios: number;
    pendingApprovals: number;
    totalListas: number;
    totalItens: number;
    submissoesHoje: number;
    pendingCotacoes: number;
    completedCotacoes: number;
  };
  temporal: {
    submissoesPorDia: Array<{ dia: string; total: number }>;
    usuariosPorDia: Array<{ dia: string; total: number }>;
  };
  listas: {
    total: number;
    top: Array<{
      id: number;
      nome: string;
      restauranteId: number;
      restauranteNome: string;
      itens: number;
      submissoes: number;
    }>;
  };
  checklists: {
    total: number;
    abertos: number;
    finalizados: number;
  };
  users: {
    ativos: number;
    inativos: number;
    pendingApproval: number;
    porRole: {
      SUPER_ADMIN: number;
      ADMIN: number;
      COLLABORATOR: number;
      SUPPLIER: number;
    };
  };
  suppliers: {
    total: number;
    ativos: number;
    inativos: number;
  };
  suggestions: {
    total: number;
    pendentes: number;
    aprovadas: number;
    rejeitadas: number;
  };
  recentActivities: Array<{
    id: number;
    criadoEm: string;
    acao: string;
    entidade: string | null;
    mensagem: string;
    restauranteId: number | null;
    restauranteNome: string;
    usuarioId: number | null;
    usuarioNome: string | null;
  }>;
  restaurantes: Array<{
    id: number;
    nome: string;
    ativo: boolean;
    usuarios: number;
    listas: number;
    itens: number;
    submissoes: number;
    submissoesPendentes: number;
    aprovacoesPendentes: number;
  }>;
}

type PeriodOption = 7 | 30 | 60 | 90;

const PERIOD_OPTIONS: Array<{ value: PeriodOption; label: string }> = [
  { value: 7, label: 'Últimos 7 dias' },
  { value: 30, label: 'Últimos 30 dias' },
  { value: 60, label: 'Últimos 60 dias' },
  { value: 90, label: 'Últimos 90 dias' },
];

const SUMMARY_CARDS = [
  { key: 'totalRestaurantes', label: 'Restaurantes', icon: <FaBuilding />, color: 'var(--summary-blue)' },
  { key: 'totalUsuarios', label: 'Usuários', icon: <FaUsers />, color: 'var(--summary-green)' },
  { key: 'pendingApprovals', label: 'Aguardando', icon: <FaUserClock />, color: 'var(--summary-orange)' },
  { key: 'totalListas', label: 'Listas', icon: <FaClipboardList />, color: 'var(--summary-cyan)' },
  { key: 'totalItens', label: 'Itens', icon: <FaStore />, color: 'var(--summary-purple)' },
  { key: 'submissoesHoje', label: 'Submissões Hoje', icon: <FaShoppingCart />, color: 'var(--summary-red)' },
  { key: 'pendingCotacoes', label: 'Cotações Pend.', icon: <FaFileInvoiceDollar />, color: 'var(--summary-yellow)' },
  { key: 'completedCotacoes', label: 'Cotações OK', icon: <FaCheckCircle />, color: 'var(--summary-teal)' },
] as const;

function formatDateLabel(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

function formatDateTime(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toCsvValue(value: string | number | null | undefined): string {
  const normalized = String(value ?? '');
  return `"${normalized.replace(/"/g, '""')}"`;
}

export default function GlobalDashboardPage() {
  const { isSuperAdmin } = useAuth();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardGlobalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRestauranteId, setSelectedRestauranteId] = useState<string>('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>(30);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = {
        period: selectedPeriod,
      };
      if (selectedRestauranteId !== 'ALL') {
        params.restauranteId = Number(selectedRestauranteId);
      }
      const response = await api.get<DashboardGlobalData>('/v1/restaurantes/stats/global', { params });
      setDashboard(response.data);
    } catch {
      setError('Erro ao carregar o dashboard global.');
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, selectedRestauranteId]);

  useEffect(() => {
    if (!isSuperAdmin) {
      router.replace('/admin/dashboard');
      return;
    }
    loadDashboard();
  }, [isSuperAdmin, loadDashboard, router]);

  useEffect(() => {
    if (!dashboard) return;
    if (selectedRestauranteId === 'ALL') return;
    const exists = dashboard.restaurantesDisponiveis.some((restaurante) => restaurante.id === Number(selectedRestauranteId));
    if (!exists) {
      setSelectedRestauranteId('ALL');
    }
  }, [dashboard, selectedRestauranteId]);

  const submissoesSerie = useMemo(() => {
    const series = dashboard?.temporal.submissoesPorDia ?? [];
    return series.slice(-14);
  }, [dashboard]);

  const usuariosSerie = useMemo(() => {
    const series = dashboard?.temporal.usuariosPorDia ?? [];
    return series.slice(-14);
  }, [dashboard]);

  const submissoesMax = Math.max(...submissoesSerie.map((item) => item.total), 1);
  const usuariosMax = Math.max(...usuariosSerie.map((item) => item.total), 1);

  const handleExportExcel = () => {
    if (!dashboard) return;

    const lines: string[] = [];
    lines.push('Resumo');
    lines.push(['Métrica', 'Valor'].map(toCsvValue).join(','));
    lines.push(['Restaurantes', dashboard.summary.totalRestaurantes].map(toCsvValue).join(','));
    lines.push(['Usuários', dashboard.summary.totalUsuarios].map(toCsvValue).join(','));
    lines.push(['Aguardando aprovação', dashboard.summary.pendingApprovals].map(toCsvValue).join(','));
    lines.push(['Listas', dashboard.summary.totalListas].map(toCsvValue).join(','));
    lines.push(['Itens', dashboard.summary.totalItens].map(toCsvValue).join(','));
    lines.push(['Submissões hoje', dashboard.summary.submissoesHoje].map(toCsvValue).join(','));
    lines.push(['Cotações pendentes', dashboard.summary.pendingCotacoes].map(toCsvValue).join(','));
    lines.push(['Cotações concluídas', dashboard.summary.completedCotacoes].map(toCsvValue).join(','));
    lines.push('');
    lines.push('Restaurantes');
    lines.push(
      ['Restaurante', 'Status', 'Usuários', 'Listas', 'Itens', 'Submissões', 'Submissões pendentes', 'Aprovações pendentes']
        .map(toCsvValue)
        .join(','),
    );
    dashboard.restaurantes.forEach((restaurante) => {
      lines.push([
        restaurante.nome,
        restaurante.ativo ? 'Ativo' : 'Inativo',
        restaurante.usuarios,
        restaurante.listas,
        restaurante.itens,
        restaurante.submissoes,
        restaurante.submissoesPendentes,
        restaurante.aprovacoesPendentes,
      ].map(toCsvValue).join(','));
    });

    const csv = `\uFEFF${lines.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `dashboard-global-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    if (!dashboard) return;

    const popup = window.open('', '_blank', 'width=1120,height=760');
    if (!popup) return;

    const summaryHtml = SUMMARY_CARDS.map((card) => {
      const value = dashboard.summary[card.key];
      return `<tr><td>${card.label}</td><td style="text-align:right;font-weight:700;">${value}</td></tr>`;
    }).join('');

    const restaurantsHtml = dashboard.restaurantes
      .map((restaurante) => `
        <tr>
          <td>${restaurante.nome}</td>
          <td>${restaurante.ativo ? 'Ativo' : 'Inativo'}</td>
          <td style="text-align:right;">${restaurante.usuarios}</td>
          <td style="text-align:right;">${restaurante.listas}</td>
          <td style="text-align:right;">${restaurante.itens}</td>
          <td style="text-align:right;">${restaurante.submissoes}</td>
          <td style="text-align:right;">${restaurante.submissoesPendentes}</td>
        </tr>
      `)
      .join('');

    popup.document.write(`
      <html lang="pt-BR">
        <head>
          <title>Dashboard Global</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            h1 { margin: 0 0 6px; }
            p { margin: 0 0 20px; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
            th { text-align: left; background: #f5f5f5; }
          </style>
        </head>
        <body>
          <h1>Dashboard Global</h1>
          <p>Gerado em ${formatDateTime(new Date().toISOString())}</p>
          <h2>Resumo</h2>
          <table>
            <thead><tr><th>Métrica</th><th>Valor</th></tr></thead>
            <tbody>${summaryHtml}</tbody>
          </table>
          <h2>Restaurantes</h2>
          <table>
            <thead>
              <tr>
                <th>Restaurante</th>
                <th>Status</th>
                <th>Usuários</th>
                <th>Listas</th>
                <th>Itens</th>
                <th>Submissões</th>
                <th>Submissões Pendentes</th>
              </tr>
            </thead>
            <tbody>${restaurantsHtml}</tbody>
          </table>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    setTimeout(() => popup.print(), 200);
  };

  if (!isSuperAdmin) return null;

  return (
    <Container fluid className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Dashboard Global</h1>
          <p className={styles.subtitle}>
            {dashboard?.filtros.generatedAt
              ? `Última atualização: ${formatDateTime(dashboard.filtros.generatedAt)}`
              : 'Carregando atualização...'}
          </p>
        </div>
        <div className={styles.controls}>
          <Form.Select
            className={styles.select}
            value={selectedRestauranteId}
            onChange={(event) => setSelectedRestauranteId(event.target.value)}
          >
            <option value="ALL">Todos os Restaurantes</option>
            {dashboard?.restaurantesDisponiveis.map((restaurante) => (
              <option key={restaurante.id} value={String(restaurante.id)}>
                {restaurante.nome}
              </option>
            ))}
          </Form.Select>
          <Form.Select
            className={styles.select}
            value={selectedPeriod}
            onChange={(event) => setSelectedPeriod(Number(event.target.value) as PeriodOption)}
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Form.Select>
          <div className={styles.actions}>
            <Button
              variant="outline-primary"
              className={styles.actionButton}
              onClick={loadDashboard}
              disabled={loading}
            >
              {loading ? <Spinner animation="border" size="sm" className="me-2" /> : <FaSync className="me-2" />}
              Atualizar
            </Button>
            <Button
              variant="outline-danger"
              className={styles.actionButton}
              onClick={handleExportPdf}
              disabled={!dashboard}
            >
              <FaFilePdf className="me-2" />
              PDF
            </Button>
            <Button
              variant="outline-success"
              className={styles.actionButton}
              onClick={handleExportExcel}
              disabled={!dashboard}
            >
              <FaFileExcel className="me-2" />
              Excel
            </Button>
          </div>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {loading && !dashboard ? (
        <div className={styles.loadingBox}>
          <Spinner animation="border" />
          <span>Carregando dashboard global...</span>
        </div>
      ) : null}

      {dashboard ? (
        <>
          <div className={styles.summaryGrid}>
            {SUMMARY_CARDS.map((card) => (
              <Card key={card.key} className={styles.summaryCard}>
                <Card.Body>
                  <div className={styles.summaryLabel}>{card.label}</div>
                  <div className={styles.summaryValueRow}>
                    <strong className={styles.summaryValue}>{dashboard.summary[card.key]}</strong>
                    <span className={styles.summaryIcon} style={{ backgroundColor: card.color }}>
                      {card.icon}
                    </span>
                  </div>
                </Card.Body>
              </Card>
            ))}
          </div>

          <Row className="g-3 mb-3">
            <Col lg={6}>
              <Card className={styles.panelCard}>
                <Card.Header className={styles.panelHeader}>
                  <span><FaChartBar className="me-2" />Submissões por Dia</span>
                  <Badge bg="primary">últimos 14 dias</Badge>
                </Card.Header>
                <Card.Body>
                  <div className={styles.chartBars}>
                    {submissoesSerie.map((point) => {
                      const height = Math.max(8, Math.round((point.total / submissoesMax) * 100));
                      return (
                        <div key={point.dia} className={styles.chartPoint}>
                          <span className={styles.chartValue}>{point.total}</span>
                          <div className={styles.chartBarWrap}>
                            <div className={styles.chartBar} style={{ height: `${height}%` }} />
                          </div>
                          <span className={styles.chartLabel}>{formatDateLabel(point.dia)}</span>
                        </div>
                      );
                    })}
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={6}>
              <Card className={styles.panelCard}>
                <Card.Header className={styles.panelHeader}>
                  <span><FaUsers className="me-2" />Usuários Criados por Dia</span>
                  <Badge bg="info">últimos 14 dias</Badge>
                </Card.Header>
                <Card.Body>
                  <div className={styles.chartBars}>
                    {usuariosSerie.map((point) => {
                      const height = Math.max(8, Math.round((point.total / usuariosMax) * 100));
                      return (
                        <div key={point.dia} className={styles.chartPoint}>
                          <span className={styles.chartValue}>{point.total}</span>
                          <div className={styles.chartBarWrap}>
                            <div className={`${styles.chartBar} ${styles.chartBarAlt}`} style={{ height: `${height}%` }} />
                          </div>
                          <span className={styles.chartLabel}>{formatDateLabel(point.dia)}</span>
                        </div>
                      );
                    })}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="g-3 mb-3">
            <Col lg={8}>
              <Card className={styles.panelCard}>
                <Card.Header className={styles.panelHeader}>
                  <span>Restaurantes</span>
                </Card.Header>
                <Card.Body className="p-0">
                  <Table responsive hover className="mb-0">
                    <thead>
                      <tr>
                        <th>Restaurante</th>
                        <th>Status</th>
                        <th className="text-end">Usuários</th>
                        <th className="text-end">Listas</th>
                        <th className="text-end">Itens</th>
                        <th className="text-end">Submissões</th>
                        <th className="text-end">Pendências</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.restaurantes.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-4 text-muted">Nenhum restaurante encontrado</td>
                        </tr>
                      ) : (
                        dashboard.restaurantes.map((restaurante) => (
                          <tr key={restaurante.id}>
                            <td>{restaurante.nome}</td>
                            <td>
                              <Badge bg={restaurante.ativo ? 'success' : 'secondary'}>
                                {restaurante.ativo ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </td>
                            <td className="text-end">{restaurante.usuarios}</td>
                            <td className="text-end">{restaurante.listas}</td>
                            <td className="text-end">{restaurante.itens}</td>
                            <td className="text-end">{restaurante.submissoes}</td>
                            <td className="text-end">
                              <Badge bg={restaurante.submissoesPendentes > 0 ? 'warning' : 'success'}>
                                {restaurante.submissoesPendentes}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4}>
              <div className={styles.metricsStack}>
                <Card className={styles.metricCard}>
                  <Card.Body>
                    <h6>Checklists</h6>
                    <div className={styles.metricLine}>Abertos: <strong>{dashboard.checklists.abertos}</strong></div>
                    <div className={styles.metricLine}>Finalizados: <strong>{dashboard.checklists.finalizados}</strong></div>
                  </Card.Body>
                </Card>
                <Card className={styles.metricCard}>
                  <Card.Body>
                    <h6>Usuários por Perfil</h6>
                    <div className={styles.metricLine}>Super Admin: <strong>{dashboard.users.porRole.SUPER_ADMIN}</strong></div>
                    <div className={styles.metricLine}>Admin: <strong>{dashboard.users.porRole.ADMIN}</strong></div>
                    <div className={styles.metricLine}>Colaborador: <strong>{dashboard.users.porRole.COLLABORATOR}</strong></div>
                    <div className={styles.metricLine}>Fornecedor: <strong>{dashboard.users.porRole.SUPPLIER}</strong></div>
                  </Card.Body>
                </Card>
                <Card className={styles.metricCard}>
                  <Card.Body>
                    <h6>Sugestões (período)</h6>
                    <div className={styles.metricLine}>Pendentes: <strong>{dashboard.suggestions.pendentes}</strong></div>
                    <div className={styles.metricLine}>Aprovadas: <strong>{dashboard.suggestions.aprovadas}</strong></div>
                    <div className={styles.metricLine}>Rejeitadas: <strong>{dashboard.suggestions.rejeitadas}</strong></div>
                  </Card.Body>
                </Card>
              </div>
            </Col>
          </Row>

          <Row className="g-3">
            <Col lg={6}>
              <Card className={styles.panelCard}>
                <Card.Header className={styles.panelHeader}>
                  <span>Top Listas</span>
                  <Badge bg="secondary">{dashboard.listas.total} listas</Badge>
                </Card.Header>
                <Card.Body className="p-0">
                  <Table responsive hover className="mb-0">
                    <thead>
                      <tr>
                        <th>Lista</th>
                        <th>Restaurante</th>
                        <th className="text-end">Itens</th>
                        <th className="text-end">Submissões</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.listas.top.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-4 text-muted">Sem listas para o filtro atual</td>
                        </tr>
                      ) : (
                        dashboard.listas.top.map((lista) => (
                          <tr key={lista.id}>
                            <td>{lista.nome}</td>
                            <td>{lista.restauranteNome}</td>
                            <td className="text-end">{lista.itens}</td>
                            <td className="text-end">{lista.submissoes}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={6}>
              <Card className={styles.panelCard}>
                <Card.Header className={styles.panelHeader}>
                  <span>Atividade Recente</span>
                  <Badge bg="dark">{dashboard.recentActivities.length}</Badge>
                </Card.Header>
                <Card.Body className={styles.activityBody}>
                  {dashboard.recentActivities.length === 0 ? (
                    <div className="text-center text-muted py-3">Sem atividades recentes para este filtro.</div>
                  ) : (
                    dashboard.recentActivities.map((activity) => (
                      <div key={activity.id} className={styles.activityItem}>
                        <div>
                          <div className={styles.activityTitle}>{activity.mensagem}</div>
                          <div className={styles.activityMeta}>
                            {activity.restauranteNome}
                            {activity.usuarioNome ? ` • ${activity.usuarioNome}` : ''}
                          </div>
                        </div>
                        <span className={styles.activityTime}>{formatDateTime(activity.criadoEm)}</span>
                      </div>
                    ))
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      ) : null}
    </Container>
  );
}
