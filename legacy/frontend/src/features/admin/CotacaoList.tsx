import React, { useState } from 'react';
import { Container, Card, Badge, Alert, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileInvoiceDollar, faArrowLeft, faEye, faCalendar, faTruck, faBoxes } from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate } from 'react-router-dom';
import ResponsiveTable from '../../components/ResponsiveTable';
import { formatarDataHoraBrasilia } from '../../utils/dateFormatter';

interface Cotacao {
    id: number;
    data_cotacao: string;
    fornecedor: {
        nome: string;
    };
    status: 'PENDENTE' | 'CONCLUIDA' | 'CANCELADA';
    total_itens: number;
    valor_total: number;
}

// DADOS MOCKADOS - Remover quando backend estiver pronto
const MOCK_COTACOES: Cotacao[] = [
    {
        id: 1,
        data_cotacao: '2025-12-28T10:30:00',
        fornecedor: { nome: 'Fornecedor ABC Ltda' },
        status: 'PENDENTE',
        total_itens: 12,
        valor_total: 1850.50
    },
    {
        id: 2,
        data_cotacao: '2025-12-27T14:15:00',
        fornecedor: { nome: 'Distribuidora XYZ' },
        status: 'CONCLUIDA',
        total_itens: 8,
        valor_total: 920.00
    },
    {
        id: 3,
        data_cotacao: '2025-12-25T09:00:00',
        fornecedor: { nome: 'Mercado Central' },
        status: 'CONCLUIDA',
        total_itens: 15,
        valor_total: 2340.75
    },
    {
        id: 4,
        data_cotacao: '2025-12-24T16:45:00',
        fornecedor: { nome: 'Hortifrutti Bom Preço' },
        status: 'CANCELADA',
        total_itens: 6,
        valor_total: 450.00
    },
];

const CotacaoList: React.FC = () => {
    const [cotacoes] = useState<Cotacao[]>(MOCK_COTACOES);
    const navigate = useNavigate();

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDENTE':
                return <Badge bg="warning">Pendente</Badge>;
            case 'CONCLUIDA':
                return <Badge bg="success">Concluída</Badge>;
            case 'CANCELADA':
                return <Badge bg="danger">Cancelada</Badge>;
            default:
                return <Badge bg="secondary">{status}</Badge>;
        }
    };

    const formatarData = (dataISO: string) => {
        return formatarDataHoraBrasilia(dataISO);
    };

    const formatarValor = (valor: number) => {
        return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    return (
        <Container fluid className="py-4">
            <div className="mb-4">
                <Link to="/admin" className="btn btn-outline-secondary mb-3">
                    <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                    Voltar
                </Link>

                <div className="d-flex align-items-center gap-3 mb-3">
                    <FontAwesomeIcon icon={faFileInvoiceDollar} size="2x" className="text-primary" />
                    <div>
                        <h2 className="mb-0">Cotações</h2>
                        <p className="text-muted mb-0">Gerencie suas cotações de compras</p>
                    </div>
                </div>

                <Alert variant="info">
                    <FontAwesomeIcon icon={faFileInvoiceDollar} className="me-2" />
                    <strong>Demonstração:</strong> Esta é uma tela mockada com dados de exemplo.
                    A integração com o backend está em desenvolvimento.
                </Alert>
            </div>

            <Card>
                <Card.Body>
                    <ResponsiveTable
                        data={cotacoes}
                        columns={[
                            {
                                header: '#',
                                accessor: 'id'
                            },
                            {
                                header: 'Fornecedor',
                                accessor: (c: Cotacao) => (
                                    <>
                                        <FontAwesomeIcon icon={faTruck} className="me-2 text-muted" />
                                        {c.fornecedor.nome}
                                    </>
                                )
                            },
                            {
                                header: 'Data',
                                accessor: (c: Cotacao) => (
                                    <>
                                        <FontAwesomeIcon icon={faCalendar} className="me-2 text-muted" />
                                        {formatarData(c.data_cotacao)}
                                    </>
                                ),
                                mobileLabel: 'Data'
                            },
                            {
                                header: 'Itens',
                                accessor: (c: Cotacao) => (
                                    <>
                                        <FontAwesomeIcon icon={faBoxes} className="me-2 text-muted" />
                                        {c.total_itens}
                                    </>
                                )
                            },
                            {
                                header: 'Valor Total',
                                accessor: (c: Cotacao) => <strong>{formatarValor(c.valor_total)}</strong>,
                                mobileLabel: 'Valor'
                            },
                            {
                                header: 'Status',
                                accessor: (c: Cotacao) => getStatusBadge(c.status)
                            }
                        ]}
                        keyExtractor={(c) => c.id.toString()}
                        renderActions={(c) => (
                            <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => navigate(`/admin/cotacoes/${c.id}`)}
                            >
                                <FontAwesomeIcon icon={faEye} className="me-1" />
                                Ver Detalhes
                            </Button>
                        )}
                        emptyMessage="Nenhuma cotação encontrada"
                    />
                </Card.Body>
            </Card>
        </Container>
    );
};

export default CotacaoList;
