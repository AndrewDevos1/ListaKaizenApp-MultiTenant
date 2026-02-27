import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Alert, Badge, Spinner, Modal, Form, Card, Row, Col, Table } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCopy, faStore, faEye, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import { formatarDataHoraBrasilia } from '../../utils/dateFormatter';

interface Solicitacao {
    id: number;
    nome_restaurante: string;
    endereco_restaurante: string;
    telefone_restaurante: string;
    email_restaurante: string;
    cnpj: string | null;
    razao_social: string | null;
    nome_responsavel: string;
    email_responsavel: string;
    telefone_responsavel: string;
    status: string;
    criado_em: string;
    processado_em: string | null;
    processado_por_nome: string | null;
    motivo_rejeicao: string | null;
    restaurante_criado_nome: string | null;
    usuario_admin_criado_email: string | null;
    senha_gerada: string | null;
}

const SolicitacoesRestaurante: React.FC = () => {
    const navigate = useNavigate();
    const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [filtroStatus, setFiltroStatus] = useState<string>('PENDENTE');

    // Modals
    const [showDetalhesModal, setShowDetalhesModal] = useState(false);
    const [showAprovacaoModal, setShowAprovacaoModal] = useState(false);
    const [showRejeicaoModal, setShowRejeicaoModal] = useState(false);
    const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState<Solicitacao | null>(null);
    const [motivoRejeicao, setMotivoRejeicao] = useState('');
    const [processando, setProcessando] = useState(false);
    const [credenciaisCopiadas, setCredenciaisCopiadas] = useState(false);

    // Fetch solicitações
    const fetchSolicitacoes = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const params = filtroStatus ? { status: filtroStatus } : {};
            const response = await api.get('/admin/solicitacoes-restaurante', { params });
            setSolicitacoes(response.data.solicitacoes || []);
        } catch (err: any) {
            const mensagem = err.response?.data?.error || 'Erro ao carregar solicitações';
            setError(mensagem);
            console.error('Erro:', err);
        } finally {
            setIsLoading(false);
        }
    }, [filtroStatus]);

    useEffect(() => {
        fetchSolicitacoes();
    }, [fetchSolicitacoes]);

    // Abrir modal de detalhes
    const handleAbrirDetalhes = async (id: number) => {
        try {
            const response = await api.get(`/admin/solicitacoes-restaurante/${id}`);
            setSolicitacaoSelecionada(response.data.solicitacao);
            setShowDetalhesModal(true);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao carregar detalhes');
        }
    };

    // Abrir modal de aprovação
    const handleAbrirAprovacao = async (solicitacao: Solicitacao) => {
        setSolicitacaoSelecionada(solicitacao);
        setShowAprovacaoModal(true);
        setCredenciaisCopiadas(false);
    };

    // Abrir modal de rejeição
    const handleAbrirRejeicao = (solicitacao: Solicitacao) => {
        setSolicitacaoSelecionada(solicitacao);
        setMotivoRejeicao('');
        setShowRejeicaoModal(true);
    };

    // Aprovar solicitação
    const handleAprovar = async () => {
        if (!solicitacaoSelecionada) return;

        setProcessando(true);
        try {
            const response = await api.put(
                `/admin/solicitacoes-restaurante/${solicitacaoSelecionada.id}/aprovar`
            );

            setSuccess(`Solicitação aprovada! Restaurante criado: ${response.data.restaurante.nome}`);
            setShowAprovacaoModal(false);
            setSolicitacaoSelecionada(null);
            await fetchSolicitacoes();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao aprovar solicitação');
        } finally {
            setProcessando(false);
        }
    };

    // Rejeitar solicitação
    const handleRejeitar = async () => {
        if (!solicitacaoSelecionada || !motivoRejeicao.trim()) {
            setError('Motivo da rejeição é obrigatório');
            return;
        }

        setProcessando(true);
        try {
            await api.put(
                `/admin/solicitacoes-restaurante/${solicitacaoSelecionada.id}/rejeitar`,
                { motivo: motivoRejeicao }
            );

            setSuccess('Solicitação rejeitada com sucesso');
            setShowRejeicaoModal(false);
            setSolicitacaoSelecionada(null);
            setMotivoRejeicao('');
            await fetchSolicitacoes();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao rejeitar solicitação');
        } finally {
            setProcessando(false);
        }
    };

    // Copiar credenciais
    const handleCopiarCredenciais = async () => {
        if (!solicitacaoSelecionada?.usuario_admin_criado_email) return;

        const texto = `
Email: ${solicitacaoSelecionada.usuario_admin_criado_email}
Senha: ${solicitacaoSelecionada.senha_gerada}

⚠️ IMPORTANTE: Compartilhe essas credenciais com segurança e solicite que o responsável altere a senha no primeiro acesso.
        `.trim();

        try {
            await navigator.clipboard.writeText(texto);
            setCredenciaisCopiadas(true);
            setTimeout(() => setCredenciaisCopiadas(false), 2000);
        } catch (err) {
            setError('Erro ao copiar credenciais');
        }
    };

    // Badge de status
    const getBadgeStatus = (status: string) => {
        switch (status) {
            case 'PENDENTE':
                return <Badge bg="warning">Pendente</Badge>;
            case 'APROVADO':
                return <Badge bg="success">Aprovado</Badge>;
            case 'REJEITADO':
                return <Badge bg="danger">Rejeitado</Badge>;
            default:
                return <Badge bg="secondary">{status}</Badge>;
        }
    };

    // Formatar data
    const formatarData = (data: string) => {
        if (!data) return '-';
        return formatarDataHoraBrasilia(data);
    };

    return (
        <div>
            <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => navigate('/admin')}
                className="mb-3"
            >
                <FontAwesomeIcon icon={faArrowLeft} /> Voltar
            </Button>

            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
                <h2>
                    <FontAwesomeIcon icon={faStore} className="me-2 text-primary" />
                    Solicitações de Restaurante
                </h2>
            </div>

            {error && (
                <Alert variant="danger" onClose={() => setError('')} dismissible>
                    {error}
                </Alert>
            )}

            {success && (
                <Alert variant="success" onClose={() => setSuccess('')} dismissible>
                    {success}
                </Alert>
            )}

            {/* Filtros */}
            <Card className="mb-4 shadow-sm border-0">
                <Card.Body>
                    <Form.Group className="mb-0">
                        <Form.Label className="mb-2">Filtrar por Status</Form.Label>
                        <div className="d-flex gap-2 flex-wrap">
                            {['PENDENTE', 'APROVADO', 'REJEITADO'].map((status) => (
                                <Button
                                    key={status}
                                    variant={filtroStatus === status ? 'primary' : 'outline-primary'}
                                    size="sm"
                                    onClick={() => setFiltroStatus(status)}
                                >
                                    {status === 'PENDENTE' && 'Pendentes'}
                                    {status === 'APROVADO' && 'Aprovadas'}
                                    {status === 'REJEITADO' && 'Rejeitadas'}
                                </Button>
                            ))}
                        </div>
                    </Form.Group>
                </Card.Body>
            </Card>

            {/* Tabela de Solicitações */}
            {isLoading ? (
                <div className="text-center p-4">
                    <Spinner animation="border" />
                </div>
            ) : solicitacoes.length === 0 ? (
                <Card className="shadow-sm border-0 text-center p-5">
                    <p className="text-muted mb-0">
                        Nenhuma solicitação encontrada para este filtro
                    </p>
                </Card>
            ) : (
                <Card className="shadow-sm border-0">
                    <Table hover responsive className="mb-0">
                        <thead className="bg-light">
                            <tr>
                                <th>Restaurante</th>
                                <th>Responsável</th>
                                <th>Email</th>
                                <th>Status</th>
                                <th>Data</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {solicitacoes.map((sol) => (
                                <tr key={sol.id}>
                                    <td>
                                        <strong>{sol.nome_restaurante}</strong>
                                    </td>
                                    <td>{sol.nome_responsavel}</td>
                                    <td className="text-muted small">{sol.email_responsavel}</td>
                                    <td>{getBadgeStatus(sol.status)}</td>
                                    <td className="text-muted small">
                                        {formatarData(sol.criado_em)}
                                    </td>
                                    <td>
                                        <Button
                                            variant="info"
                                            size="sm"
                                            onClick={() => handleAbrirDetalhes(sol.id)}
                                            title="Detalhes"
                                            className="me-2"
                                        >
                                            <FontAwesomeIcon icon={faEye} className="me-1" />Detalhes
                                        </Button>

                                        {sol.status === 'PENDENTE' && (
                                            <>
                                                <Button
                                                    variant="success"
                                                    size="sm"
                                                    onClick={() => handleAbrirAprovacao(sol)}
                                                    title="Aprovar"
                                                    className="me-2"
                                                >
                                                    <FontAwesomeIcon icon={faCheck} className="me-1" />Aprovar
                                                </Button>
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() => handleAbrirRejeicao(sol)}
                                                    title="Rejeitar"
                                                >
                                                    <FontAwesomeIcon icon={faTimes} className="me-1" />Rejeitar
                                                </Button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Card>
            )}

            {/* MODAL: Detalhes da Solicitação */}
            <Modal show={showDetalhesModal} onHide={() => setShowDetalhesModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Detalhes da Solicitação</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {solicitacaoSelecionada && (
                        <>
                            <h6 className="text-primary mb-3">Dados do Restaurante</h6>
                            <Row className="mb-3">
                                <Col md={6}>
                                    <p>
                                        <strong>Nome:</strong> {solicitacaoSelecionada.nome_restaurante}
                                    </p>
                                </Col>
                                <Col md={6}>
                                    <p>
                                        <strong>CNPJ:</strong>{' '}
                                        {solicitacaoSelecionada.cnpj || '-'}
                                    </p>
                                </Col>
                            </Row>
                            <Row className="mb-3">
                                <Col md={12}>
                                    <p>
                                        <strong>Endereço:</strong>{' '}
                                        {solicitacaoSelecionada.endereco_restaurante}
                                    </p>
                                </Col>
                            </Row>
                            <Row className="mb-3">
                                <Col md={6}>
                                    <p>
                                        <strong>Email:</strong>{' '}
                                        {solicitacaoSelecionada.email_restaurante}
                                    </p>
                                </Col>
                                <Col md={6}>
                                    <p>
                                        <strong>Telefone:</strong>{' '}
                                        {solicitacaoSelecionada.telefone_restaurante}
                                    </p>
                                </Col>
                            </Row>
                            {solicitacaoSelecionada.razao_social && (
                                <Row className="mb-3">
                                    <Col md={12}>
                                        <p>
                                            <strong>Razão Social:</strong>{' '}
                                            {solicitacaoSelecionada.razao_social}
                                        </p>
                                    </Col>
                                </Row>
                            )}

                            <hr />

                            <h6 className="text-primary mb-3">Dados do Responsável</h6>
                            <Row className="mb-3">
                                <Col md={12}>
                                    <p>
                                        <strong>Nome:</strong>{' '}
                                        {solicitacaoSelecionada.nome_responsavel}
                                    </p>
                                </Col>
                            </Row>
                            <Row className="mb-3">
                                <Col md={6}>
                                    <p>
                                        <strong>Email:</strong>{' '}
                                        {solicitacaoSelecionada.email_responsavel}
                                    </p>
                                </Col>
                                <Col md={6}>
                                    <p>
                                        <strong>Telefone:</strong>{' '}
                                        {solicitacaoSelecionada.telefone_responsavel}
                                    </p>
                                </Col>
                            </Row>

                            <hr />

                            <h6 className="text-primary mb-3">Status</h6>
                            <Row className="mb-3">
                                <Col md={6}>
                                    <p>
                                        <strong>Status:</strong>{' '}
                                        {getBadgeStatus(solicitacaoSelecionada.status)}
                                    </p>
                                </Col>
                                <Col md={6}>
                                    <p>
                                        <strong>Data:</strong>{' '}
                                        {formatarData(solicitacaoSelecionada.criado_em)}
                                    </p>
                                </Col>
                            </Row>

                            {solicitacaoSelecionada.processado_por_nome && (
                                <Row className="mb-3">
                                    <Col md={6}>
                                        <p>
                                            <strong>Processado por:</strong>{' '}
                                            {solicitacaoSelecionada.processado_por_nome}
                                        </p>
                                    </Col>
                                    <Col md={6}>
                                        <p>
                                            <strong>Data:</strong>{' '}
                                            {formatarData(
                                                solicitacaoSelecionada.processado_em || ''
                                            )}
                                        </p>
                                    </Col>
                                </Row>
                            )}

                            {solicitacaoSelecionada.restaurante_criado_nome && (
                                <Row className="mb-3">
                                    <Col md={12}>
                                        <Alert variant="success">
                                            <strong>✓ Restaurante Criado:</strong>{' '}
                                            {solicitacaoSelecionada.restaurante_criado_nome}
                                        </Alert>
                                    </Col>
                                </Row>
                            )}

                            {solicitacaoSelecionada.motivo_rejeicao && (
                                <Row className="mb-3">
                                    <Col md={12}>
                                        <Alert variant="danger">
                                            <strong>✗ Motivo da Rejeição:</strong>
                                            <p className="mb-0 mt-2">
                                                {solicitacaoSelecionada.motivo_rejeicao}
                                            </p>
                                        </Alert>
                                    </Col>
                                </Row>
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDetalhesModal(false)}>
                        Fechar
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* MODAL: Aprovar Solicitação */}
            <Modal show={showAprovacaoModal} onHide={() => setShowAprovacaoModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Aprovar Solicitação</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {solicitacaoSelecionada && (
                        <>
                            <p>
                                Você está prestes a aprovar a solicitação de{' '}
                                <strong>{solicitacaoSelecionada.nome_restaurante}</strong>.
                            </p>
                            <p>Isso irá:</p>
                            <ul>
                                <li>
                                    Criar o restaurante no sistema com o nome{' '}
                                    <strong>{solicitacaoSelecionada.nome_restaurante}</strong>
                                </li>
                                <li>
                                    Criar um usuário ADMIN para{' '}
                                    <strong>{solicitacaoSelecionada.nome_responsavel}</strong> com
                                    o email <strong>{solicitacaoSelecionada.email_responsavel}</strong>
                                </li>
                                <li>Gerar uma senha temporária que será exibida abaixo</li>
                            </ul>

                            <Alert variant="warning">
                                <strong>⚠️ Importante:</strong> A senha gerada será exibida apenas
                                uma vez. Você deve copiar e compartilhá-la com segurança com o
                                responsável.
                            </Alert>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAprovacaoModal(false)}>
                        Cancelar
                    </Button>
                    <Button
                        variant="success"
                        onClick={handleAprovar}
                        disabled={processando}
                    >
                        {processando ? (
                            <>
                                <Spinner as="span" animation="border" size="sm" className="me-2" />
                                Aprovando...
                            </>
                        ) : (
                            'Aprovar'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* MODAL: Credenciais Geradas */}
            {solicitacaoSelecionada?.senha_gerada && (
                <Modal
                    show={showAprovacaoModal && !!solicitacaoSelecionada?.senha_gerada}
                    onHide={() => setShowAprovacaoModal(false)}
                >
                    <Modal.Header closeButton>
                        <Modal.Title>Credenciais do Novo Admin</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Alert variant="success">
                            <strong>✓ Solicitação Aprovada com Sucesso!</strong>
                        </Alert>

                        <p>
                            <strong>Restaurante Criado:</strong>{' '}
                            {solicitacaoSelecionada.restaurante_criado_nome}
                        </p>

                        <hr />

                        <h6>Credenciais do Usuário Admin:</h6>
                        <Form.Group className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                                type="text"
                                value={solicitacaoSelecionada.usuario_admin_criado_email || ''}
                                readOnly
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Senha Temporária</Form.Label>
                            <Form.Control
                                type="text"
                                value={solicitacaoSelecionada.senha_gerada}
                                readOnly
                                className="font-monospace"
                            />
                        </Form.Group>

                        <Alert variant="warning">
                            <strong>⚠️ IMPORTANTE:</strong> A senha acima será exibida apenas nesta
                            tela. Copie e compartilhe com segurança. O usuário será solicitado a
                            alterar a senha no primeiro acesso.
                        </Alert>

                        <Button
                            variant="primary"
                            className="w-100"
                            onClick={handleCopiarCredenciais}
                        >
                            <FontAwesomeIcon icon={faCopy} className="me-2" />
                            {credenciaisCopiadas ? 'Copiado!' : 'Copiar Credenciais'}
                        </Button>
                    </Modal.Body>
                </Modal>
            )}

            {/* MODAL: Rejeitar Solicitação */}
            <Modal show={showRejeicaoModal} onHide={() => setShowRejeicaoModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Rejeitar Solicitação</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {solicitacaoSelecionada && (
                        <>
                            <p>
                                Você está prestes a rejeitar a solicitação de{' '}
                                <strong>{solicitacaoSelecionada.nome_restaurante}</strong>.
                            </p>

                            <Form.Group className="mb-3">
                                <Form.Label>Motivo da Rejeição *</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={4}
                                    placeholder="Explique o motivo da rejeição..."
                                    value={motivoRejeicao}
                                    onChange={(e) => setMotivoRejeicao(e.target.value)}
                                    disabled={processando}
                                />
                                <Form.Text className="text-muted">
                                    Este motivo será registrado no sistema
                                </Form.Text>
                            </Form.Group>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowRejeicaoModal(false)}>
                        Cancelar
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleRejeitar}
                        disabled={processando || !motivoRejeicao.trim()}
                    >
                        {processando ? (
                            <>
                                <Spinner as="span" animation="border" size="sm" className="me-2" />
                                Rejeitando...
                            </>
                        ) : (
                            'Rejeitar'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default SolicitacoesRestaurante;
