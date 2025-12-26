import React, { useState, useEffect } from 'react';
import { Table, Spinner, Alert, Badge, Form, InputGroup } from 'react-bootstrap';
import api from '../../services/api';

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
        <div>
            <h2 className="mb-4">Catálogo Global de Itens</h2>
            <p className="text-muted mb-4">
                Este catálogo contém todos os itens cadastrados no sistema.
                Itens são adicionados automaticamente quando você importa listas.
            </p>

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

            <InputGroup className="mb-3" style={{ maxWidth: '400px' }}>
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

            <div className="mb-3">
                <Badge bg="info" className="me-2">
                    Total: {itens.length} itens
                </Badge>
                {searchTerm && (
                    <Badge bg="secondary">
                        Exibindo: {filteredItens.length} itens
                    </Badge>
                )}
            </div>

            <Table striped bordered hover responsive>
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
        </div>
    );
};

export default CatalogoGlobal;
