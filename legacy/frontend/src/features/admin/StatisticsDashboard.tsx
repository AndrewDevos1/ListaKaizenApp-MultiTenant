import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Container, Card, Alert, Button, Spinner, Form, Table, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faChartBar,
    faCheckCircle,
    faExclamationTriangle,
    faListAlt,
    faArrowLeft,
    faBoxes,
    faSearch,
    faSync,
} from '@fortawesome/free-solid-svg-icons';
import {
    Chart as ChartJS,
    ArcElement,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import styles from './StatisticsDashboard.module.css';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

interface ListaStat {
    lista_id: number;
    lista_nome: string;
    area_nome: string | null;
    area_id: number | null;
    total_itens: number;
    itens_ok: number;
    itens_faltantes: number;
}

interface ItemStat {
    item_id: number;
    item_nome: string;
    unidade: string;
    lista_id: number;
    lista_nome: string;
    area_id: number | null;
    area_nome: string | null;
    quantidade_atual: number;
    quantidade_minima: number;
}

interface EstatisticasData {
    resumo: {
        total_listas: number;
        total_itens: number;
        itens_ok: number;
        itens_faltantes: number;
    };
    por_lista: ListaStat[];
    submissoes_por_status: {
        PENDENTE: number;
        APROVADO: number;
        REJEITADO: number;
        PARCIALMENTE_APROVADO: number;
    };
    itens: ItemStat[];
}

type Situacao = 'falta' | 'quase_acabando' | 'precisa_comprar' | 'completo' | 'excesso';

function getSituacao(atual: number, minimo: number): Situacao {
    if (minimo === 0) return 'excesso';
    if (atual === 0)  return 'falta';
    const pct = atual / minimo;
    if (pct < 0.25) return 'quase_acabando';
    if (pct < 1.0)  return 'precisa_comprar';
    if (pct < 1.5)  return 'completo';
    return 'excesso';
}

const SITUACAO_LABELS: Record<Situacao, string> = {
    falta:           '⚠ Falta',
    quase_acabando:  'Quase acabando',
    precisa_comprar: 'Precisa comprar',
    completo:        'Completo',
    excesso:         'Em excesso',
};

const SITUACAO_CORES: Record<Situacao, string> = {
    falta:           '#e55353',
    quase_acabando:  '#fd7e14',
    precisa_comprar: '#ffc107',
    completo:        '#2eb85c',
    excesso:         '#3b82f6',
};

const FUEL_TICKS = [16.7, 66.7]; // 25% e 100% do mínimo na escala 0–150%

const FuelBar: React.FC<{ atual: number; minimo: number }> = ({ atual, minimo }) => {
    const maxScale = minimo > 0 ? minimo * 1.5 : 1;
    const fillPct  = Math.min((atual / maxScale) * 100, 100);
    const sit      = getSituacao(atual, minimo);
    const cor      = SITUACAO_CORES[sit];
    const zerado   = atual === 0;
    return (
        <div className={`${styles.fuelBar}${zerado ? ` ${styles.fuelBarZerado}` : ''}`}>
            <div className={styles.fuelFill} style={{ width: `${fillPct}%`, backgroundColor: cor }} />
            {FUEL_TICKS.map(pos => (
                <div key={pos} className={styles.fuelTick} style={{ left: `${pos}%` }} />
            ))}
        </div>
    );
};

const StatisticsDashboard: React.FC = () => {
    const [data, setData] = useState<EstatisticasData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Filtros dos gráficos
    const [selectedArea, setSelectedArea] = useState<number | null>(null);

    // Filtros da tabela
    const [busca, setBusca] = useState('');
    const [filtroLista, setFiltroLista] = useState('');
    const [filtroArea, setFiltroArea] = useState('');
    const [filtroSituacao, setFiltroSituacao] = useState('');

    // Ordenação da tabela
    type SortCol = 'item_nome' | 'lista_nome' | 'area_nome' | 'quantidade_atual' | 'quantidade_minima' | 'situacao';
    const [sortCol, setSortCol] = useState<SortCol>('situacao');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    const fetchData = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);
            const res = await api.get('/admin/estatisticas');
            setData(res.data);
            setLastUpdated(new Date());
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao carregar estatísticas');
        } finally {
            if (isRefresh) setRefreshing(false);
            else setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(false); }, [fetchData]);

    useEffect(() => {
        if (autoRefresh) {
            intervalRef.current = setInterval(() => fetchData(true), 30000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [autoRefresh, fetchData]);

    const handleSort = (col: SortCol) => {
        if (sortCol === col) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortCol(col);
            setSortDir('asc');
        }
    };

    const sortIcon = (col: SortCol) => sortCol !== col ? ' ↕' : sortDir === 'asc' ? ' ↑' : ' ↓';

    const thStyle: React.CSSProperties = { cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' };

    const itensFiltrados = useMemo(() => {
        if (!data) return [];
        const situacaoOrder: Record<Situacao, number> = { falta: 0, quase_acabando: 1, precisa_comprar: 2, completo: 3, excesso: 4 };

        return data.itens
            .filter(item => {
                const sit = getSituacao(item.quantidade_atual, item.quantidade_minima);
                const matchBusca = busca === '' || item.item_nome.toLowerCase().includes(busca.toLowerCase());
                const matchLista = filtroLista === '' || String(item.lista_id) === filtroLista;
                const matchArea = filtroArea === '' || String(item.area_id) === filtroArea;
                const matchSit = filtroSituacao === '' || sit === filtroSituacao;
                return matchBusca && matchLista && matchArea && matchSit;
            })
            .sort((a, b) => {
                let cmp = 0;
                if (sortCol === 'item_nome') cmp = a.item_nome.localeCompare(b.item_nome, 'pt-BR');
                else if (sortCol === 'lista_nome') cmp = a.lista_nome.localeCompare(b.lista_nome, 'pt-BR');
                else if (sortCol === 'area_nome') cmp = (a.area_nome || '').localeCompare(b.area_nome || '', 'pt-BR');
                else if (sortCol === 'quantidade_atual') cmp = a.quantidade_atual - b.quantidade_atual;
                else if (sortCol === 'quantidade_minima') cmp = a.quantidade_minima - b.quantidade_minima;
                else if (sortCol === 'situacao') {
                    cmp = situacaoOrder[getSituacao(a.quantidade_atual, a.quantidade_minima)]
                        - situacaoOrder[getSituacao(b.quantidade_atual, b.quantidade_minima)];
                }
                return sortDir === 'asc' ? cmp : -cmp;
            });
    }, [data, busca, filtroLista, filtroArea, filtroSituacao, sortCol, sortDir]);

    if (loading) {
        return (
            <Container className="mt-5 text-center">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2 text-muted">Carregando estatísticas...</p>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="mt-4">
                <Alert variant="danger">{error}</Alert>
            </Container>
        );
    }

    if (!data) return null;

    const { resumo, por_lista, submissoes_por_status } = data;

    // Áreas e listas únicas para os filtros dos gráficos e da tabela
    const areas = [...new Map(
        por_lista.filter(l => l.area_id !== null)
            .map(l => [l.area_id, { id: l.area_id!, nome: l.area_nome! }])
    ).values()];

    const listasFiltradas = selectedArea !== null
        ? por_lista.filter(l => l.area_id === selectedArea)
        : por_lista;

    const pctFaltantes = resumo.total_itens > 0
        ? Math.round((resumo.itens_faltantes / resumo.total_itens) * 100)
        : 0;

    // Opções únicas para dropdowns da tabela
    const listasUnicas = [...new Map(data.itens.map(i => [i.lista_id, i.lista_nome])).entries()];
    const areasUnicas = [...new Map(
        data.itens.filter(i => i.area_id !== null).map(i => [i.area_id, i.area_nome!])
    ).entries()];

    // Doughnut — proporção geral
    const doughnutItemData = {
        labels: ['Em dia', 'Faltantes'],
        datasets: [{ data: [resumo.itens_ok, resumo.itens_faltantes], backgroundColor: ['#2eb85c', '#e55353'], borderWidth: 0 }],
    };

    // Doughnut — submissões
    const doughnutSubmissoesData = {
        labels: ['Pendente', 'Aprovado', 'Rejeitado', 'Parcial'],
        datasets: [{
            data: [submissoes_por_status.PENDENTE, submissoes_por_status.APROVADO, submissoes_por_status.REJEITADO, submissoes_por_status.PARCIALMENTE_APROVADO],
            backgroundColor: ['#ffc107', '#2eb85c', '#e55353', '#17a2b8'],
            borderWidth: 0,
        }],
    };

    // Bar — itens por lista
    const barData = {
        labels: listasFiltradas.map(l => l.lista_nome.length > 22 ? l.lista_nome.substring(0, 20) + '…' : l.lista_nome),
        datasets: [
            { label: 'Em dia', data: listasFiltradas.map(l => l.itens_ok), backgroundColor: '#2eb85c', borderRadius: 4 },
            { label: 'Faltantes', data: listasFiltradas.map(l => l.itens_faltantes), backgroundColor: '#e55353', borderRadius: 4 },
        ],
    };

    const doughnutOptions = { plugins: { legend: { position: 'bottom' as const } }, cutout: '65%' };
    const barOptions = {
        responsive: true, maintainAspectRatio: false,
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 } } },
        plugins: { legend: { position: 'top' as const } },
    };
    const temSubmissoes = Object.values(submissoes_por_status).some(v => v > 0);

    return (
        <div className={styles.pageWrapper}>
            <Container fluid>
                {/* Header */}
                <div className={styles.pageHeader}>
                    <div>
                        <Link to="/admin" className={styles.backButton}>
                            <FontAwesomeIcon icon={faArrowLeft} /> Voltar ao Dashboard
                        </Link>
                        <h1 className={styles.pageTitle}>
                            <FontAwesomeIcon icon={faChartBar} /> Estatísticas
                        </h1>
                        <p className={styles.pageSubtitle}>Visão geral de itens e submissões</p>
                    </div>
                    <div className={styles.refreshControl}>
                        <Button
                            size="sm"
                            variant={autoRefresh ? 'success' : 'outline-secondary'}
                            onClick={() => setAutoRefresh(v => !v)}
                        >
                            <FontAwesomeIcon icon={faSync} spin={refreshing} />
                            {' '}{autoRefresh ? 'Ao vivo: ON' : 'Ao vivo: OFF'}
                        </Button>
                        {lastUpdated && (
                            <small className={styles.lastUpdated}>
                                Atualizado às {lastUpdated.toLocaleTimeString('pt-BR')}
                            </small>
                        )}
                    </div>
                </div>

                {/* Cards */}
                <div className={styles.cardsGrid}>
                    <div className={`${styles.metricCard} ${styles.cardBlue}`}>
                        <div className={styles.cardIcon}><FontAwesomeIcon icon={faListAlt} /></div>
                        <div className={styles.cardValue}>{resumo.total_listas}</div>
                        <div className={styles.cardLabel}>Listas Ativas</div>
                    </div>
                    <div className={`${styles.metricCard} ${styles.cardGray}`}>
                        <div className={styles.cardIcon}><FontAwesomeIcon icon={faBoxes} /></div>
                        <div className={styles.cardValue}>{resumo.total_itens}</div>
                        <div className={styles.cardLabel}>Total de Itens</div>
                    </div>
                    <div className={`${styles.metricCard} ${styles.cardGreen}`}>
                        <div className={styles.cardIcon}><FontAwesomeIcon icon={faCheckCircle} /></div>
                        <div className={styles.cardValue}>{resumo.itens_ok}</div>
                        <div className={styles.cardLabel}>Itens em Dia</div>
                    </div>
                    <div className={`${styles.metricCard} ${styles.cardRed}`}>
                        <div className={styles.cardIcon}><FontAwesomeIcon icon={faExclamationTriangle} /></div>
                        <div className={styles.cardValue}>
                            {resumo.itens_faltantes}{resumo.total_itens > 0 && <small> ({pctFaltantes}%)</small>}
                        </div>
                        <div className={styles.cardLabel}>Itens Faltantes</div>
                    </div>
                </div>

                {/* Filtro por área (gráficos) */}
                {areas.length > 0 && (
                    <div className={styles.areaFilter}>
                        <span className={styles.filterLabel}>Filtrar gráficos por área:</span>
                        <Button size="sm" variant={selectedArea === null ? 'primary' : 'outline-primary'} onClick={() => setSelectedArea(null)}>Todas</Button>
                        {areas.map(a => (
                            <Button key={a.id} size="sm" variant={selectedArea === a.id ? 'primary' : 'outline-primary'}
                                onClick={() => setSelectedArea(selectedArea === a.id ? null : a.id)}>
                                {a.nome}
                            </Button>
                        ))}
                    </div>
                )}

                {/* Gráficos */}
                <div className={styles.chartsGrid}>
                    <Card className={styles.chartCard}>
                        <Card.Body>
                            <Card.Title className={styles.chartTitle}>Proporção de Itens</Card.Title>
                            {resumo.total_itens > 0
                                ? <div className={styles.doughnutWrapper}><Doughnut data={doughnutItemData} options={doughnutOptions} /></div>
                                : <p className="text-muted text-center mt-4">Nenhum item cadastrado</p>}
                        </Card.Body>
                    </Card>
                    <Card className={styles.chartCard}>
                        <Card.Body>
                            <Card.Title className={styles.chartTitle}>Submissões — Últimos 30 dias</Card.Title>
                            {temSubmissoes
                                ? <div className={styles.doughnutWrapper}><Doughnut data={doughnutSubmissoesData} options={doughnutOptions} /></div>
                                : <p className="text-muted text-center mt-4">Nenhuma submissão recente</p>}
                        </Card.Body>
                    </Card>
                </div>
                <Card className={styles.chartCard}>
                    <Card.Body>
                        <Card.Title className={styles.chartTitle}>
                            Itens por Lista
                            {selectedArea !== null && <span className={styles.filterBadge}>{areas.find(a => a.id === selectedArea)?.nome}</span>}
                        </Card.Title>
                        {listasFiltradas.length > 0
                            ? <div className={styles.barWrapper}><Bar data={barData} options={barOptions} /></div>
                            : <p className="text-muted text-center mt-4">Nenhuma lista com itens nesta área</p>}
                    </Card.Body>
                </Card>

                {/* ─── Tabela de Itens ─── */}
                <Card className={styles.chartCard}>
                    <Card.Body>
                        <Card.Title className={styles.chartTitle}>
                            <FontAwesomeIcon icon={faBoxes} /> Detalhamento por Item
                            <span className={styles.filterBadge}>{itensFiltrados.length} item(s)</span>
                        </Card.Title>

                        {/* Filtros da tabela */}
                        <div className={styles.tableFilters}>
                            <div className={styles.searchWrapper}>
                                <FontAwesomeIcon icon={faSearch} className={styles.searchIcon} />
                                <Form.Control
                                    size="sm"
                                    placeholder="Buscar item..."
                                    value={busca}
                                    onChange={e => setBusca(e.target.value)}
                                    className={styles.searchInput}
                                />
                            </div>
                            <Form.Select size="sm" value={filtroLista} onChange={e => setFiltroLista(e.target.value)} className={styles.filterSelect}>
                                <option value="">Todas as listas</option>
                                {listasUnicas.map(([id, nome]) => <option key={id} value={String(id)}>{nome}</option>)}
                            </Form.Select>
                            <Form.Select size="sm" value={filtroArea} onChange={e => setFiltroArea(e.target.value)} className={styles.filterSelect}>
                                <option value="">Todas as áreas</option>
                                {areasUnicas.map(([id, nome]) => <option key={id} value={String(id)}>{nome}</option>)}
                            </Form.Select>
                            <Form.Select size="sm" value={filtroSituacao} onChange={e => setFiltroSituacao(e.target.value)} className={styles.filterSelect}>
                                <option value="">Todas as situações</option>
                                <option value="falta">🔴 Falta</option>
                                <option value="quase_acabando">🟠 Quase acabando</option>
                                <option value="precisa_comprar">🟡 Precisa comprar</option>
                                <option value="completo">🟢 Completo</option>
                                <option value="excesso">🔵 Em excesso</option>
                            </Form.Select>
                        </div>

                        {itensFiltrados.length === 0 ? (
                            <p className="text-muted text-center mt-3">Nenhum item encontrado com os filtros selecionados.</p>
                        ) : (
                            <div className={styles.tableWrapper}>
                                <Table hover responsive className={styles.itemTable}>
                                    <thead>
                                        <tr>
                                            <th style={thStyle} onClick={() => handleSort('item_nome')}>Item{sortIcon('item_nome')}</th>
                                            <th>Unid.</th>
                                            <th style={thStyle} onClick={() => handleSort('lista_nome')}>Lista{sortIcon('lista_nome')}</th>
                                            <th style={thStyle} onClick={() => handleSort('area_nome')}>Área{sortIcon('area_nome')}</th>
                                            <th className="text-center" style={thStyle} onClick={() => handleSort('quantidade_atual')}>Atual{sortIcon('quantidade_atual')}</th>
                                            <th className="text-center" style={thStyle} onClick={() => handleSort('quantidade_minima')}>Mínimo{sortIcon('quantidade_minima')}</th>
                                            <th style={{ ...thStyle, minWidth: '180px' }} onClick={() => handleSort('situacao')}>Situação{sortIcon('situacao')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {itensFiltrados.map((item, idx) => {
                                            const sit = getSituacao(item.quantidade_atual, item.quantidade_minima);
                                            const cor = SITUACAO_CORES[sit];
                                            return (
                                                <tr key={`${item.lista_id}-${item.item_id}-${idx}`}>
                                                    <td><strong>{item.item_nome}</strong></td>
                                                    <td><span className="text-muted">{item.unidade}</span></td>
                                                    <td>{item.lista_nome}</td>
                                                    <td>{item.area_nome ?? <span className="text-muted">—</span>}</td>
                                                    <td className="text-center">{item.quantidade_atual}</td>
                                                    <td className="text-center">{item.quantidade_minima}</td>
                                                    <td>
                                                        <div className={styles.situacaoCell}>
                                                            <FuelBar atual={item.quantidade_atual} minimo={item.quantidade_minima} />
                                                            <Badge
                                                                className={`${styles.situacaoBadge}${sit === 'falta' ? ` ${styles.badgeZerado}` : ''}`}
                                                                style={{ backgroundColor: cor }}
                                                            >
                                                                {SITUACAO_LABELS[sit]}
                                                            </Badge>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </Table>
                            </div>
                        )}
                    </Card.Body>
                </Card>
            </Container>
        </div>
    );
};

export default StatisticsDashboard;
