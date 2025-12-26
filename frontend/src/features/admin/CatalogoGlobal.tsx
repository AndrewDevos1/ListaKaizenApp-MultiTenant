import React, { useState, useEffect } from 'react';
import { Table, Spinner, Alert, Badge, Form, InputGroup } from 'react-bootstrap';
import api from '../../services/api';
import styles from './CatalogoGlobal.module.css';

interface CatalogoItem {
    id: number;
    nome: string;
    unidade: string;
    total_listas: number;
    criado_em: string | null;
    atualizado_em: string | null;
}

interface CatalogoResponse {
    itens: CatalogoItem[];
    total: number;
}

const CatalogoGlobal: React.FC = () => {
    const [itens, setItens] = useState<CatalogoItem[]>([]);
    const [filteredItens, setFilteredItens] = useState<CatalogoItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        setIsLoading(true);
        setError('');
        try {
            console.log('[CatalogoGlobal] Buscando catálogo...');
            const response = await api.get<CatalogoResponse>('/admin/catalogo-global');
            console.log('[CatalogoGlobal] Resposta:', response.data);

            const itensData = response.data.itens || [];
            setItens(itensData);
            setFilteredItens(itensData);
        } catch (err: any) {
            console.error('[CatalogoGlobal] Erro:', err);
            setError(`Falha ao carregar catálogo: ${err.response?.data?.error || err.message}`);
            setItens([]);
            setFilteredItens([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (!itens || !Array.isArray(itens)) {
            setFilteredItens([]);
            return;
        }

        if (!searchTerm.trim()) {
            setFilteredItens(itens);
        } else {
            const term = searchTerm.toLowerCase();
            setFilteredItens(itens.filter(item =>
                item.nome.toLowerCase().includes(term) ||
                item.unidade.toLowerCase().includes(term)
            ));
        }
    }, [searchTerm, itens]);

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR');
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className="mb-2">Catálogo Global de Itens</h2>
                <p className="text-muted mb-0">
                    Este catálogo contém todos os itens cadastrados no sistema.
                    Itens são adicionados automaticamente quando você importa listas.
                </p>
            </div>

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

            <InputGroup className={styles.searchBox}>
                <InputGroup.Text>
                    <i className="fas fa-search"></i>
                </InputGroup.Text>
                <Form.Control
                    type="text"
                    placeholder="Buscar item..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </InputGroup>

            <div className={styles.badges}>
                <Badge bg="info" className="me-2">
                    Total: {itens.length} itens
                </Badge>
                {searchTerm && (
                    <Badge bg="secondary">
                        Exibindo: {filteredItens.length} itens
                    </Badge>
                )}
            </div>

            {/* Tabela Desktop */}
            <Table striped bordered hover responsive className={styles.tableDesktop}>
                <thead className="table-dark">
                    <tr>
                        <th>#</th>
                        <th>Nome</th>
                        <th>Unidade</th>
                        <th>Listas Vinculadas</th>
                        <th>Cadastrado em</th>
                    </tr>
                </thead>
                <tbody>
                    {isLoading ? (
                        <tr>
                            <td colSpan={5} className="text-center py-4">
                                <Spinner animation="border" />
                                <p className="mt-2 mb-0">Carregando catálogo...</p>
                            </td>
                        </tr>
                    ) : filteredItens.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="text-center py-4 text-muted">
                                {searchTerm ? 'Nenhum item encontrado com esse termo.' : 'Nenhum item no catálogo.'}
                            </td>
                        </tr>
                    ) : filteredItens.map((item, index) => (
                        <tr key={item.id}>
                            <td>{index + 1}</td>
                            <td>{item.nome}</td>
                            <td>{item.unidade}</td>
                            <td>
                                <Badge bg={item.total_listas > 0 ? 'success' : 'secondary'}>
                                    {item.total_listas} lista(s)
                                </Badge>
                            </td>
                            <td>{formatDate(item.criado_em)}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            {/* Cards Mobile */}
            <div className={styles.cardsMobile}>
                {isLoading ? (
                    <div className={styles.loadingState}>
                        <Spinner animation="border" />
                        <p className="mt-2 mb-0">Carregando catálogo...</p>
                    </div>
                ) : filteredItens.length === 0 ? (
                    <div className={styles.emptyState}>
                        {searchTerm ? 'Nenhum item encontrado com esse termo.' : 'Nenhum item no catálogo.'}
                    </div>
                ) : filteredItens.map((item, index) => (
                    <div key={item.id} className={styles.itemCard}>
                        <div className={styles.cardRow}>
                            <span className={styles.cardLabel}>#</span>
                            <span className={styles.cardValue}>{index + 1}</span>
                        </div>
                        <div className={styles.cardRow}>
                            <span className={styles.cardLabel}>Nome</span>
                            <span className={styles.cardValue}><strong>{item.nome}</strong></span>
                        </div>
                        <div className={styles.cardRow}>
                            <span className={styles.cardLabel}>Unidade</span>
                            <span className={styles.cardValue}>{item.unidade}</span>
                        </div>
                        <div className={styles.cardRow}>
                            <span className={styles.cardLabel}>Listas</span>
                            <span className={styles.cardValue}>
                                <Badge bg={item.total_listas > 0 ? 'success' : 'secondary'}>
                                    {item.total_listas} lista(s)
                                </Badge>
                            </span>
                        </div>
                        <div className={styles.cardRow}>
                            <span className={styles.cardLabel}>Cadastrado</span>
                            <span className={styles.cardValue}>{formatDate(item.criado_em)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CatalogoGlobal;
