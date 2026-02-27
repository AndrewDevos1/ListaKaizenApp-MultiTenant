import React, { useState, useEffect } from 'react';
import { Container, Button, Table, Alert, Badge, ButtonGroup, Modal, Form, InputGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft,
    faCheckCircle,
    faTimesCircle,
    faClock,
    faEye,
    faBox,
    faTrash,
    faBoxOpen,
    faSearch,
    faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { formatarDataBrasilia } from '../../utils/dateFormatter';
import styles from './GerenciarSubmissoes.module.css';

interface Submissao {
    id: number;
    lista_id: number;
    lista_nome: string;
    usuario_id: number;
    usuario_nome: string;
    data_submissao: string;
    status: 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'PARCIALMENTE_APROVADO';
    total_pedidos: number;
    tipo_lista?: 'LISTA_TRADICIONAL' | 'LISTA_RAPIDA';
    arquivada?: boolean;
}

type StatusFilter = 'TODOS' | 'PENDENTE' | 'APROVADO' | 'REJEITADO';

const GerenciarSubmissoes: React.FC = () => {
    const [submissoes, setSubmissoes] = useState<Submissao[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Seleção na view ativa (checkboxes sempre visíveis)
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const [bulkArchiving, setBulkArchiving] = useState(false);
    const [archivingKey, setArchivingKey] = useState<string | null>(null);

    // Seleção na view arquivadas
    const [archivedSelectionMode, setArchivedSelectionMode] = useState(false);
    const [archivedSelectedKeys, setArchivedSelectedKeys] = useState<Set<string>>(new Set());
    const [bulkUnarchiving, setBulkUnarchiving] = useState(false);
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const [statusFilter, setStatusFilter] = useLocalStorage<StatusFilter>('admin:submissoes:statusFilter', 'PENDENTE');
    const [showArchived, setShowArchived] = useLocalStorage<boolean>('admin:submissoes:showArchived', false);
    const [searchQuery, setSearchQuery] = useState('');

    type SortColumn = 'id' | 'lista_nome' | 'usuario_nome' | 'data_submissao' | 'total_pedidos' | 'status';
    const [sortColumn, setSortColumn] = useState<SortColumn>('data_submissao');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const navigate = useNavigate();

    useEffect(() => {
        fetchSubmissoes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter, showArchived]);

    const fetchSubmissoes = async () => {
        try {
            setLoading(true);
            setError('');

            const params = new URLSearchParams();
            if (statusFilter !== 'TODOS') params.set('status', statusFilter);
            if (showArchived) params.set('arquivadas', 'true');
            const query = params.toString();
            const url = query ? `/admin/submissoes?${query}` : '/admin/submissoes';

            const response = await api.get(url);
            const payload = response.data;
            const lista = Array.isArray(payload)
                ? payload
                : (payload?.submissoes || payload?.listas || []);

            if (!Array.isArray(lista)) throw new Error('Formato inesperado de resposta');

            setSubmissoes(lista);
            setSelectedKeys(new Set());
            setArchivedSelectedKeys(new Set());
            setArchivedSelectionMode(false);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao carregar submissões');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDENTE':
                return <Badge bg="warning"><FontAwesomeIcon icon={faClock} /> Pendente</Badge>;
            case 'APROVADO':
                return <Badge bg="success"><FontAwesomeIcon icon={faCheckCircle} /> Aprovado</Badge>;
            case 'REJEITADO':
                return <Badge bg="danger"><FontAwesomeIcon icon={faTimesCircle} /> Rejeitado</Badge>;
            case 'PARCIALMENTE_APROVADO':
                return <Badge bg="info"><FontAwesomeIcon icon={faCheckCircle} /> Parcial</Badge>;
            default:
                return <Badge bg="secondary">{status}</Badge>;
        }
    };

    const handleVerDetalhes = (submissao: Submissao) => {
        if (submissao.tipo_lista === 'LISTA_RAPIDA') {
            navigate(`/admin/listas-rapidas/${submissao.id}`);
        } else {
            navigate(`/admin/submissoes/${submissao.id}`);
        }
    };

    const getKey = (sub: Submissao) => `${sub.tipo_lista || 'LISTA_TRADICIONAL'}-${sub.id}`;

    // ─── Seleção (view ativa) ──────────────────────────────────────────────

    const toggleSelection = (sub: Submissao) => {
        if (showArchived) return;
        const key = getKey(sub);
        setSelectedKeys((prev) => {
            const next = new Set(prev);
            if (next.has(key)) { next.delete(key); } else { next.add(key); }
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedKeys(new Set());
        } else {
            setSelectedKeys(new Set(filteredSubmissoes.map(getKey)));
        }
    };

    // ─── Seleção (view arquivadas) ─────────────────────────────────────────

    const handleStartArchivedSelection = () => {
        setArchivedSelectionMode(true);
        setArchivedSelectedKeys(new Set());
    };

    const handleCancelArchivedSelection = () => {
        setArchivedSelectionMode(false);
        setArchivedSelectedKeys(new Set());
        setError('');
    };

    const toggleArchivedSelection = (sub: Submissao) => {
        if (!archivedSelectionMode) return;
        const key = getKey(sub);
        setArchivedSelectedKeys((prev) => {
            const next = new Set(prev);
            if (next.has(key)) { next.delete(key); } else { next.add(key); }
            return next;
        });
    };

    const handleToggleArchived = () => {
        const goingToArchived = !showArchived;
        setShowArchived(goingToArchived);
        if (goingToArchived) setStatusFilter('TODOS');
        setSearchQuery('');
        setSelectedKeys(new Set());
        setArchivedSelectedKeys(new Set());
        setArchivedSelectionMode(false);
        setError('');
    };

    // ─── Arquivar individual ───────────────────────────────────────────────

    const handleArquivar = async (sub: Submissao) => {
        if (!window.confirm(`Arquivar a submissão #${sub.id}?`)) return;
        const key = getKey(sub);
        try {
            setArchivingKey(key);
            setError('');
            const url = sub.tipo_lista === 'LISTA_RAPIDA'
                ? `/admin/listas-rapidas/${sub.id}/arquivar`
                : `/admin/submissoes/${sub.id}/arquivar`;
            await api.post(url);
            setSubmissoes((prev) => prev.filter((s) => getKey(s) !== key));
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao arquivar submissão');
        } finally {
            setArchivingKey(null);
        }
    };

    // ─── Arquivar em lote (view ativa) ─────────────────────────────────────

    const handleArquivarSelecionadas = async () => {
        if (selectedKeys.size === 0) return;
        if (!window.confirm(`Arquivar ${selectedKeys.size} submissão(ões) selecionada(s)?`)) return;

        const selecionadas = submissoes.filter((s) => selectedKeys.has(getKey(s)));
        try {
            setBulkArchiving(true);
            setError('');
            const results = await Promise.allSettled(
                selecionadas.map((s) => {
                    const url = s.tipo_lista === 'LISTA_RAPIDA'
                        ? `/admin/listas-rapidas/${s.id}/arquivar`
                        : `/admin/submissoes/${s.id}/arquivar`;
                    return api.post(url);
                })
            );

            const sucessoKeys = new Set<string>();
            results.forEach((r, i) => {
                if (r.status === 'fulfilled') sucessoKeys.add(getKey(selecionadas[i]));
            });

            if (sucessoKeys.size !== selecionadas.length) {
                setError('Algumas submissões não puderam ser arquivadas.');
            }
            if (sucessoKeys.size > 0) {
                setSubmissoes((prev) => prev.filter((s) => !sucessoKeys.has(getKey(s))));
                setSelectedKeys(new Set());
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao arquivar submissões');
        } finally {
            setBulkArchiving(false);
        }
    };

    // ─── Desarquivar em lote ───────────────────────────────────────────────

    const handleDesarquivarSelecionadas = async () => {
        if (archivedSelectedKeys.size === 0) return;
        const selecionadas = submissoes.filter((s) => archivedSelectedKeys.has(getKey(s)));

        try {
            setBulkUnarchiving(true);
            setError('');
            const results = await Promise.allSettled(
                selecionadas.map((s) => {
                    const url = s.tipo_lista === 'LISTA_RAPIDA'
                        ? `/admin/listas-rapidas/${s.id}/desarquivar`
                        : `/admin/submissoes/${s.id}/desarquivar`;
                    return api.post(url);
                })
            );

            const sucessoKeys = new Set<string>();
            results.forEach((r, i) => {
                if (r.status === 'fulfilled') sucessoKeys.add(getKey(selecionadas[i]));
            });

            if (sucessoKeys.size !== selecionadas.length) {
                setError('Algumas submissões não puderam ser desarquivadas.');
            }
            if (sucessoKeys.size > 0) {
                setSubmissoes((prev) => prev.filter((s) => !sucessoKeys.has(getKey(s))));
                setArchivedSelectedKeys(new Set());
            }
            if (sucessoKeys.size === selecionadas.length) {
                setArchivedSelectionMode(false);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao desarquivar submissões');
        } finally {
            setBulkUnarchiving(false);
        }
    };

    // ─── Excluir definitivamente em lote ──────────────────────────────────

    const handleConfirmarExclusao = async () => {
        const selecionadas = submissoes.filter((s) => archivedSelectedKeys.has(getKey(s)));

        try {
            setBulkDeleting(true);
            setError('');
            const results = await Promise.allSettled(
                selecionadas.map((s) => {
                    const url = s.tipo_lista === 'LISTA_RAPIDA'
                        ? `/admin/listas-rapidas/${s.id}`
                        : `/admin/submissoes/${s.id}`;
                    return api.delete(url);
                })
            );

            const sucessoKeys = new Set<string>();
            results.forEach((r, i) => {
                if (r.status === 'fulfilled') sucessoKeys.add(getKey(selecionadas[i]));
            });

            if (sucessoKeys.size !== selecionadas.length) {
                setError('Algumas submissões não puderam ser excluídas.');
            }
            if (sucessoKeys.size > 0) {
                setSubmissoes((prev) => prev.filter((s) => !sucessoKeys.has(getKey(s))));
                setArchivedSelectedKeys(new Set());
            }
            if (sucessoKeys.size === selecionadas.length) {
                setArchivedSelectionMode(false);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao excluir submissões');
        } finally {
            setBulkDeleting(false);
            setShowDeleteModal(false);
        }
    };

    // ─── Render ────────────────────────────────────────────────────────────

    const handleSort = (col: SortColumn) => {
        if (sortColumn === col) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(col);
            setSortDir('asc');
        }
    };

    const statusOrder: Record<string, number> = {
        PENDENTE: 0, PARCIALMENTE_APROVADO: 1, APROVADO: 2, REJEITADO: 3
    };

    const sortedSubmissoes = [...submissoes].sort((a, b) => {
        let cmp = 0;
        switch (sortColumn) {
            case 'id':            cmp = a.id - b.id; break;
            case 'lista_nome':    cmp = a.lista_nome.localeCompare(b.lista_nome, 'pt-BR'); break;
            case 'usuario_nome':  cmp = a.usuario_nome.localeCompare(b.usuario_nome, 'pt-BR'); break;
            case 'data_submissao': cmp = a.data_submissao.localeCompare(b.data_submissao); break;
            case 'total_pedidos': cmp = a.total_pedidos - b.total_pedidos; break;
            case 'status':        cmp = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9); break;
        }
        return sortDir === 'asc' ? cmp : -cmp;
    });

    const sortIcon = (col: SortColumn) => {
        if (sortColumn !== col) return ' ↕';
        return sortDir === 'asc' ? ' ↑' : ' ↓';
    };

    const thStyle: React.CSSProperties = { cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' };

    const filteredSubmissoes = sortedSubmissoes.filter((sub) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            sub.lista_nome.toLowerCase().includes(q) ||
            sub.usuario_nome.toLowerCase().includes(q) ||
            sub.status.toLowerCase().includes(q) ||
            formatarDataBrasilia(sub.data_submissao).toLowerCase().includes(q) ||
            String(sub.id).includes(q)
        );
    });

    const allSelected = filteredSubmissoes.length > 0 && filteredSubmissoes.every(s => selectedKeys.has(getKey(s)));
    const someSelected = selectedKeys.size > 0;
    const showingArchivedSelection = showArchived && archivedSelectionMode;
    const totalColumns = showArchived ? (showingArchivedSelection ? 8 : 7) : 8;

    if (loading) {
        return (
            <Container className="mt-4">
                <div className="text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Carregando...</span>
                    </div>
                </div>
            </Container>
        );
    }

    return (
        <Container fluid className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h2>
                        <FontAwesomeIcon icon={showArchived ? faBoxOpen : faBox} className="me-2" />
                        {showArchived ? 'Submissões Arquivadas' : 'Gerenciar Submissões'}
                    </h2>
                    <p className="text-muted">
                        {showArchived
                            ? 'Submissões arquivadas — não impactam o fluxo ativo'
                            : 'Visualizar e aprovar submissões de listas de reposição'}
                    </p>
                </div>
                <Link to="/admin">
                    <Button variant="outline-secondary">
                        <FontAwesomeIcon icon={faArrowLeft} /> Voltar
                    </Button>
                </Link>
            </div>

            {/* Banner modo arquivadas */}
            {showArchived && (
                <div className={styles.archivedBanner}>
                    <FontAwesomeIcon icon={faBoxOpen} />
                    <span>Você está visualizando <strong>submissões arquivadas</strong>. Para voltar às submissões ativas, clique em <strong>Ativas</strong> abaixo.</span>
                </div>
            )}

            {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

            {/* Busca */}
            <div className={`${styles.filters} mb-2`}>
                <InputGroup style={{ maxWidth: 420 }}>
                    <InputGroup.Text>
                        <FontAwesomeIcon icon={faSearch} />
                    </InputGroup.Text>
                    <Form.Control
                        type="text"
                        placeholder="Buscar por lista, colaborador, data ou status..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <Button variant="outline-secondary" onClick={() => setSearchQuery('')} title="Limpar busca">
                            <FontAwesomeIcon icon={faTimes} />
                        </Button>
                    )}
                </InputGroup>
            </div>

            {/* Filtros de status */}
            <div className={styles.filters}>
                <ButtonGroup className={styles.filterButtonGroup}>
                    <Button
                        variant={statusFilter === 'TODOS' ? 'primary' : 'outline-primary'}
                        onClick={() => setStatusFilter('TODOS')}
                    >
                        Todos
                    </Button>
                    <Button
                        variant={statusFilter === 'PENDENTE' ? 'warning' : 'outline-warning'}
                        onClick={() => setStatusFilter('PENDENTE')}
                    >
                        <FontAwesomeIcon icon={faClock} /> Pendentes
                    </Button>
                    <Button
                        variant={statusFilter === 'APROVADO' ? 'success' : 'outline-success'}
                        onClick={() => setStatusFilter('APROVADO')}
                    >
                        <FontAwesomeIcon icon={faCheckCircle} /> Aprovados
                    </Button>
                    <Button
                        variant={statusFilter === 'REJEITADO' ? 'danger' : 'outline-danger'}
                        onClick={() => setStatusFilter('REJEITADO')}
                    >
                        <FontAwesomeIcon icon={faTimesCircle} /> Rejeitados
                    </Button>
                </ButtonGroup>
                {searchQuery && (
                    <span className="text-muted ms-2" style={{ fontSize: '0.9rem' }}>
                        {filteredSubmissoes.length} resultado{filteredSubmissoes.length !== 1 ? 's' : ''}
                    </span>
                )}
            </div>

            {/* Tabela Desktop */}
            <Table striped bordered hover responsive className={`${styles.table} ${styles.tableDesktop} ${showArchived ? styles.tableArchived : ''}`}>
                <thead>
                    <tr>
                        {/* Coluna de checkbox: sempre visível na view ativa; só em modo seleção nas arquivadas */}
                        {!showArchived && (
                            <th className="text-center" style={{ width: '48px' }}>
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={toggleSelectAll}
                                    disabled={bulkArchiving || submissoes.length === 0}
                                    title="Selecionar todos"
                                />
                            </th>
                        )}
                        {showingArchivedSelection && (
                            <th className="text-center" style={{ width: '48px' }}>
                                <input
                                    type="checkbox"
                                    checked={filteredSubmissoes.length > 0 && filteredSubmissoes.every(s => archivedSelectedKeys.has(getKey(s)))}
                                    onChange={() => {
                                        const allArchivedSelected = filteredSubmissoes.every(s => archivedSelectedKeys.has(getKey(s)));
                                        if (allArchivedSelected) {
                                            setArchivedSelectedKeys(new Set());
                                        } else {
                                            setArchivedSelectedKeys(new Set(filteredSubmissoes.map(getKey)));
                                        }
                                    }}
                                    disabled={bulkUnarchiving || bulkDeleting}
                                    title="Selecionar todos"
                                />
                            </th>
                        )}
                        <th style={thStyle} onClick={() => handleSort('id')}>#{sortIcon('id')}</th>
                        <th style={thStyle} onClick={() => handleSort('lista_nome')}>Lista{sortIcon('lista_nome')}</th>
                        <th style={thStyle} onClick={() => handleSort('usuario_nome')}>Colaborador{sortIcon('usuario_nome')}</th>
                        <th style={thStyle} onClick={() => handleSort('data_submissao')}>Data/Hora{sortIcon('data_submissao')}</th>
                        <th className="text-center" style={thStyle} onClick={() => handleSort('total_pedidos')}>Total Itens{sortIcon('total_pedidos')}</th>
                        <th className="text-center" style={thStyle} onClick={() => handleSort('status')}>Status{sortIcon('status')}</th>
                        <th className="text-center">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredSubmissoes.length === 0 ? (
                        <tr>
                            <td colSpan={totalColumns} className="text-center text-muted">
                                {searchQuery ? 'Nenhuma submissão encontrada para essa busca' : 'Nenhuma submissão encontrada'}
                            </td>
                        </tr>
                    ) : (
                        filteredSubmissoes.map((sub) => {
                            const key = getKey(sub);
                            const isSelectedActive = !showArchived && selectedKeys.has(key);
                            const isSelectedArchived = showingArchivedSelection && archivedSelectedKeys.has(key);
                            const isSelected = isSelectedActive || isSelectedArchived;

                            return (
                                <tr
                                    key={sub.id}
                                    className={[
                                        !showArchived ? styles.rowClickable : '',
                                        showingArchivedSelection ? styles.rowClickable : '',
                                        isSelected ? styles.rowSelected : ''
                                    ].filter(Boolean).join(' ')}
                                    onClick={() => {
                                        if (!showArchived) toggleSelection(sub);
                                        else if (showingArchivedSelection) toggleArchivedSelection(sub);
                                    }}
                                >
                                    {!showArchived && (
                                        <td className="text-center">
                                            <input
                                                type="checkbox"
                                                checked={isSelectedActive}
                                                onChange={() => toggleSelection(sub)}
                                                onClick={(e) => e.stopPropagation()}
                                                disabled={bulkArchiving}
                                                aria-label={`Selecionar submissão ${sub.id}`}
                                            />
                                        </td>
                                    )}
                                    {showingArchivedSelection && (
                                        <td className="text-center">
                                            <input
                                                type="checkbox"
                                                checked={isSelectedArchived}
                                                onChange={() => toggleArchivedSelection(sub)}
                                                onClick={(e) => e.stopPropagation()}
                                                disabled={bulkUnarchiving || bulkDeleting}
                                                aria-label={`Selecionar submissão ${sub.id}`}
                                            />
                                        </td>
                                    )}
                                    <td>{sub.id}</td>
                                    <td><strong>{sub.lista_nome}</strong></td>
                                    <td>{sub.usuario_nome}</td>
                                    <td>{formatarDataBrasilia(sub.data_submissao)}</td>
                                    <td className="text-center">
                                        <Badge bg="secondary">{sub.total_pedidos}</Badge>
                                    </td>
                                    <td className="text-center">{getStatusBadge(sub.status)}</td>
                                    <td className="text-center">
                                        <div className={styles.actionGroup}>
                                            <Button
                                                size="sm"
                                                variant="primary"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleVerDetalhes(sub);
                                                }}
                                            >
                                                <FontAwesomeIcon icon={faEye} /> Ver Detalhes
                                            </Button>
                                            {!showArchived && (
                                                <Button
                                                    size="sm"
                                                    variant="outline-secondary"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleArquivar(sub);
                                                    }}
                                                    disabled={archivingKey === key || bulkArchiving}
                                                >
                                                    <FontAwesomeIcon icon={faBox} /> Arquivar
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </Table>

            {/* Cards Mobile */}
            <div className={styles.cardsMobile}>
                {filteredSubmissoes.length === 0 ? (
                    <Alert variant="info" className="text-center">
                        {searchQuery ? 'Nenhuma submissão encontrada para essa busca' : 'Nenhuma submissão encontrada'}
                    </Alert>
                ) : (
                    filteredSubmissoes.map((sub) => {
                        const key = getKey(sub);
                        const isSelectedActive = !showArchived && selectedKeys.has(key);
                        const isSelectedArchived = showingArchivedSelection && archivedSelectedKeys.has(key);
                        const isSelected = isSelectedActive || isSelectedArchived;

                        return (
                            <div
                                key={sub.id}
                                className={[
                                    styles.submissaoCard,
                                    showArchived ? styles.cardArchived : '',
                                    !showArchived ? styles.cardSelectable : '',
                                    showingArchivedSelection ? styles.cardSelectable : '',
                                    isSelected ? styles.cardSelected : ''
                                ].filter(Boolean).join(' ')}
                                onClick={() => {
                                    if (!showArchived) toggleSelection(sub);
                                    else if (showingArchivedSelection) toggleArchivedSelection(sub);
                                }}
                                role="button"
                            >
                                <div className={styles.cardHeader}>
                                    <h5 className={styles.cardTitle}>{sub.lista_nome}</h5>
                                    <div className="d-flex align-items-center gap-2">
                                        {(!showArchived || showingArchivedSelection) && (
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => {
                                                    if (!showArchived) toggleSelection(sub);
                                                    else toggleArchivedSelection(sub);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                disabled={bulkArchiving || bulkUnarchiving || bulkDeleting}
                                            />
                                        )}
                                        <span className={styles.cardId}>#{sub.id}</span>
                                    </div>
                                </div>
                                <div className={styles.cardRow}>
                                    <span className={styles.cardLabel}>Colaborador</span>
                                    <span className={styles.cardValue}>{sub.usuario_nome}</span>
                                </div>
                                <div className={styles.cardRow}>
                                    <span className={styles.cardLabel}>Data/Hora</span>
                                    <span className={styles.cardValue}>{formatarDataBrasilia(sub.data_submissao)}</span>
                                </div>
                                <div className={styles.cardRow}>
                                    <span className={styles.cardLabel}>Total Itens</span>
                                    <span className={styles.cardValue}>
                                        <Badge bg="secondary">{sub.total_pedidos}</Badge>
                                    </span>
                                </div>
                                <div className={styles.cardRow}>
                                    <span className={styles.cardLabel}>Status</span>
                                    <span className={styles.cardValue}>{getStatusBadge(sub.status)}</span>
                                </div>
                                <div className={styles.cardActions}>
                                    <Button
                                        variant="primary"
                                        onClick={(e) => { e.stopPropagation(); handleVerDetalhes(sub); }}
                                    >
                                        <FontAwesomeIcon icon={faEye} /> Ver Detalhes
                                    </Button>
                                    {!showArchived && (
                                        <Button
                                            variant="outline-secondary"
                                            onClick={(e) => { e.stopPropagation(); handleArquivar(sub); }}
                                            disabled={archivingKey === key || bulkArchiving}
                                        >
                                            <FontAwesomeIcon icon={faBox} /> Arquivar
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Barra de ações */}
            <div className={styles.bulkActions}>
                {/* View ativa */}
                {!showArchived && (
                    <>
                        {someSelected && (
                            <Button
                                variant="danger"
                                onClick={handleArquivarSelecionadas}
                                disabled={bulkArchiving}
                            >
                                {bulkArchiving ? (
                                    <><span className="spinner-border spinner-border-sm me-2" role="status" />Arquivando...</>
                                ) : (
                                    <><FontAwesomeIcon icon={faBox} /> Arquivar selecionadas ({selectedKeys.size})</>
                                )}
                            </Button>
                        )}
                        <Button variant="outline-secondary" onClick={handleToggleArchived}>
                            Arquivadas
                        </Button>
                    </>
                )}

                {/* View arquivadas — sem modo seleção */}
                {showArchived && !archivedSelectionMode && (
                    <>
                        <Button
                            variant="outline-secondary"
                            onClick={handleStartArchivedSelection}
                            disabled={submissoes.length === 0}
                        >
                            Selecionar
                        </Button>
                        <Button variant="primary" onClick={handleToggleArchived}>
                            Ativas
                        </Button>
                    </>
                )}

                {/* View arquivadas — em modo seleção */}
                {showArchived && archivedSelectionMode && (
                    <>
                        <Button
                            variant="outline-secondary"
                            onClick={handleCancelArchivedSelection}
                            disabled={bulkUnarchiving || bulkDeleting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="outline-success"
                            onClick={handleDesarquivarSelecionadas}
                            disabled={archivedSelectedKeys.size === 0 || bulkUnarchiving || bulkDeleting}
                        >
                            <FontAwesomeIcon icon={faBoxOpen} /> Desarquivar
                            {archivedSelectedKeys.size > 0 ? ` (${archivedSelectedKeys.size})` : ''}
                        </Button>
                        <Button
                            variant="danger"
                            onClick={() => archivedSelectedKeys.size > 0 && setShowDeleteModal(true)}
                            disabled={archivedSelectedKeys.size === 0 || bulkUnarchiving || bulkDeleting}
                        >
                            <FontAwesomeIcon icon={faTrash} /> Excluir definitivamente
                            {archivedSelectedKeys.size > 0 ? ` (${archivedSelectedKeys.size})` : ''}
                        </Button>
                    </>
                )}
            </div>

            {/* Modal de confirmação de exclusão permanente */}
            <Modal show={showDeleteModal} onHide={() => !bulkDeleting && setShowDeleteModal(false)} centered>
                <Modal.Header closeButton={!bulkDeleting}>
                    <Modal.Title>Confirmar Exclusão Permanente</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>
                        Você está prestes a excluir permanentemente{' '}
                        <strong>{archivedSelectedKeys.size} submissão(ões)</strong>.
                    </p>
                    <p className="text-danger mb-0">
                        <strong>Esta ação não pode ser desfeita.</strong> Todos os dados relacionados serão removidos.
                    </p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={bulkDeleting}>
                        Cancelar
                    </Button>
                    <Button variant="danger" onClick={handleConfirmarExclusao} disabled={bulkDeleting}>
                        {bulkDeleting ? (
                            <><span className="spinner-border spinner-border-sm me-2" role="status" />Excluindo...</>
                        ) : (
                            <><FontAwesomeIcon icon={faTrash} /> Excluir Definitivamente</>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default GerenciarSubmissoes;
