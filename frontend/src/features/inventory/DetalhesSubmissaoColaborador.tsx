import React, { useState, useEffect } from 'react';
import { Container, Button, Table, Alert, Badge, Card, Form, Modal } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft,
    faCheckCircle,
    faTimesCircle,
    faClock,
    faClipboardList,
    faEdit,
    faSave,
} from '@fortawesome/free-solid-svg-icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import CustomSpinner from '../../components/Spinner';

interface ItemEstoque {
    id: number;
    item_id: number;
    lista_id: number;
    quantidade_atual: number;
    quantidade_minima: number;
    pedido: number;
    item: {
        id: number;
        nome: string;
        unidade_medida: string;
    };
}

interface Pedido {
    id: number;
    item_nome: string;
    quantidade_solicitada: number;
    status: string;
    unidade: string;
}

interface Submissao {
    id: number;
    lista_id: number;
    lista_nome: string;
    data_submissao: string;
    status: string;
    total_pedidos: number;
    pedidos: Pedido[];
}

const DetalhesSubmissaoColaborador: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [submissao, setSubmissao] = useState<Submissao | null>(null);
    const [itensEstoque, setItensEstoque] = useState<ItemEstoque[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [quantidadesAtuais, setQuantidadesAtuais] = useState<{ [key: number]: number }>({});
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        fetchSubmissao();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const fetchSubmissao = async () => {
        try {
            setLoading(true);
            setError('');
            
            // Buscar submissão
            const responseSubmissao = await api.get('/v1/submissoes/me');
            const sub = responseSubmissao.data.find((s: Submissao) => s.id === Number(id));
            
            if (!sub) {
                setError('Submissão não encontrada');
                return;
            }
            
            setSubmissao(sub);

            // Buscar dados atuais do estoque da lista (para edição)
            try {
                const responseEstoque = await api.get(`/collaborator/listas/${sub.lista_id}/estoque`);
                setItensEstoque(responseEstoque.data);
                
                // Inicializar quantidades atuais
                const qtds: { [key: number]: number } = {};
                responseEstoque.data.forEach((item: ItemEstoque) => {
                    qtds[item.item_id] = item.quantidade_atual;
                });
                setQuantidadesAtuais(qtds);
            } catch (err) {
                console.warn('Não foi possível carregar estoque para edição:', err);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao carregar submissão');
            console.error('Erro:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleQuantidadeChange = (itemId: number, valor: number) => {
        setQuantidadesAtuais(prev => ({
            ...prev,
            [itemId]: valor
        }));
    };

    const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const nextIndex = currentIndex + 1;
            const nextInput = document.getElementById(`qtd-input-${nextIndex}`);
            if (nextInput) {
                nextInput.focus();
            } else {
                // Se chegou no último, foca no botão salvar
                document.getElementById('btn-salvar')?.focus();
            }
        }
    };

    const calcularPedido = (itemId: number): number => {
        const item = itensEstoque.find(i => i.item_id === itemId);
        if (!item) return 0;
        
        const qtdAtual = quantidadesAtuais[itemId] || 0;
        const qtdMinima = item.quantidade_minima || 0;
        
        return Math.max(0, qtdMinima - qtdAtual);
    };

    const handleSalvarEdicao = async () => {
        if (!submissao) return;

        try {
            setLoading(true);
            setError('');
            
            // Resubmeter com as quantidades atuais editadas
            const itemsParaSubmeter = itensEstoque.map(item => ({
                estoque_id: item.item_id,
                quantidade_atual: quantidadesAtuais[item.item_id] || 0
            }));

            const response = await api.post(
                `/v1/listas/${submissao.lista_id}/estoque/submit`,
                { items: itemsParaSubmeter }
            );

            setSuccessMessage(`Submissão atualizada! ${response.data.pedidos_criados} pedido(s) criado(s).`);
            setShowSuccessModal(true);
            setEditMode(false);

            setTimeout(() => {
                navigate('/collaborator/submissions');
            }, 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao salvar alterações');
        } finally {
            setLoading(false);
        }
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case 'PENDENTE': return 'warning';
            case 'APROVADO': return 'success';
            case 'REJEITADO': return 'danger';
            case 'PARCIALMENTE_APROVADO': return 'info';
            default: return 'secondary';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PENDENTE': return faClock;
            case 'APROVADO': return faCheckCircle;
            case 'REJEITADO': return faTimesCircle;
            default: return faClipboardList;
        }
    };

    const formatarData = (dataISO: string) => {
        const data = new Date(dataISO);
        return data.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <Container className="py-4">
                <CustomSpinner />
            </Container>
        );
    }

    if (!submissao) {
        return (
            <Container className="py-4">
                <Alert variant="danger">{error || 'Submissão não encontrada'}</Alert>
                <Button variant="secondary" onClick={() => navigate('/collaborator/submissions')}>
                    <FontAwesomeIcon icon={faArrowLeft} /> Voltar
                </Button>
            </Container>
        );
    }

    const isPendente = submissao.status === 'PENDENTE';

    return (
        <Container fluid className="py-4">
            {/* Header */}
            <div className="mb-4">
                <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => navigate('/collaborator/submissions')}
                    className="mb-3"
                >
                    <FontAwesomeIcon icon={faArrowLeft} /> Voltar às Submissões
                </Button>
                
                <h2>
                    <FontAwesomeIcon icon={faClipboardList} className="me-2" />
                    Detalhes da Submissão #{submissao.id}
                </h2>
            </div>

            {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

            {/* Modal de Sucesso */}
            <Modal show={showSuccessModal} centered backdrop="static">
                <Modal.Body className="text-center py-5">
                    <FontAwesomeIcon icon={faCheckCircle} size="4x" className="text-success mb-4" />
                    <h3 className="text-success mb-3">Submissão Atualizada!</h3>
                    <p>{successMessage}</p>
                    <p className="text-muted small">Redirecionando em 3 segundos...</p>
                </Modal.Body>
            </Modal>

            {/* Card de Informações */}
            <Card className="mb-4">
                <Card.Header className="bg-light">
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h5 className="mb-1">{submissao.lista_nome}</h5>
                            <small className="text-muted">
                                Submetido em: {formatarData(submissao.data_submissao)}
                            </small>
                        </div>
                        <div className="text-end">
                            <Badge 
                                bg={getStatusVariant(submissao.status)}
                                style={{ fontSize: '1.1rem', padding: '0.7rem 1.2rem' }}
                            >
                                <FontAwesomeIcon icon={getStatusIcon(submissao.status)} className="me-2" />
                                {submissao.status}
                            </Badge>
                            <div className="mt-2">
                                <small className="text-muted">
                                    {submissao.total_pedidos} item(ns) solicitado(s)
                                </small>
                            </div>
                        </div>
                    </div>
                </Card.Header>
            </Card>

            {/* Botões de Ação */}
            {isPendente && !editMode && (
                <div className="mb-3">
                    <Button
                        variant="warning"
                        onClick={() => setEditMode(true)}
                    >
                        <FontAwesomeIcon icon={faEdit} /> Editar Quantidades
                    </Button>
                </div>
            )}

            {editMode && (
                <div className="mb-3">
                    <Button
                        id="btn-salvar"
                        variant="success"
                        onClick={handleSalvarEdicao}
                        disabled={loading}
                        className="me-2"
                    >
                        <FontAwesomeIcon icon={faSave} /> Salvar e Resubmeter
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => {
                            setEditMode(false);
                            fetchSubmissao(); // Recarregar dados originais
                        }}
                    >
                        Cancelar
                    </Button>
                    <small className="text-muted ms-3">
                        💡 Dica: Pressione <kbd>Enter</kbd> para ir ao próximo item
                    </small>
                </div>
            )}

            {/* Tabela de Itens */}
            <Card>
                <Card.Header>
                    <h5 className="mb-0">Itens da Submissão</h5>
                </Card.Header>
                <Card.Body className="p-0">
                    <Table striped bordered hover responsive className="mb-0">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Item</th>
                                <th className="text-center">Qtd Atual</th>
                                <th className="text-center">Qtd Mínima</th>
                                <th className="text-center">Pedido</th>
                                <th className="text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {editMode ? (
                                // Modo de Edição: Mostra itens do estoque
                                itensEstoque.map((item, idx) => {
                                    const pedido = calcularPedido(item.item_id);
                                    return (
                                        <tr key={item.item_id}>
                                            <td>{idx + 1}</td>
                                            <td><strong>{item.item.nome}</strong></td>
                                            <td className="text-center">
                                                <Form.Control
                                                    id={`qtd-input-${idx}`}
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={quantidadesAtuais[item.item_id] || 0}
                                                    onChange={(e) => handleQuantidadeChange(item.item_id, parseFloat(e.target.value) || 0)}
                                                    onKeyDown={(e) => handleKeyDown(e, idx)}
                                                    style={{ width: '120px', display: 'inline-block' }}
                                                    autoFocus={idx === 0}
                                                />
                                                <span className="ms-2">{item.item.unidade_medida}</span>
                                            </td>
                                            <td className="text-center">
                                                {item.quantidade_minima} {item.item.unidade_medida}
                                            </td>
                                            <td className="text-center">
                                                <Badge bg={pedido > 0 ? 'warning' : 'success'}>
                                                    {pedido.toFixed(2)} {item.item.unidade_medida}
                                                </Badge>
                                            </td>
                                            <td className="text-center">
                                                <Badge bg={pedido > 0 ? 'warning' : 'success'}>
                                                    {pedido > 0 ? 'NECESSÁRIO' : 'OK'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                // Modo de Visualização: Mostra submissão original
                                submissao.pedidos.map((pedido, idx) => (
                                    <tr key={pedido.id}>
                                        <td>{idx + 1}</td>
                                        <td><strong>{pedido.item_nome}</strong></td>
                                        <td className="text-center" colSpan={2}>
                                            <em className="text-muted">Ver modo de edição</em>
                                        </td>
                                        <td className="text-center">
                                            <strong>{pedido.quantidade_solicitada} {pedido.unidade}</strong>
                                        </td>
                                        <td className="text-center">
                                            <Badge bg={getStatusVariant(pedido.status)}>
                                                {pedido.status}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>

            {!isPendente && (
                <Alert variant="info" className="mt-4">
                    <FontAwesomeIcon icon={faCheckCircle} /> Esta submissão já foi {submissao.status.toLowerCase()} e não pode mais ser editada.
                </Alert>
            )}
        </Container>
    );
};

export default DetalhesSubmissaoColaborador;
