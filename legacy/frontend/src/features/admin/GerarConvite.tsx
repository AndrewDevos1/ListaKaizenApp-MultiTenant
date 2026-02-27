import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Table, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faCheck, faLink, faTrash } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface Convite {
    id: number;
    token: string;
    role: string;
    criado_em: string;
    restaurante_id?: number;
    restaurante_nome?: string;
    link?: string;
    usado: boolean;
    usado_em?: string;
    usado_por_nome?: string;
    usado_por_email?: string;
    criado_por_nome?: string;
}

interface Restaurante {
    id: number;
    nome: string;
    slug: string;
}

const GerarConvite: React.FC = () => {
    const { user: authUser } = useAuth();
    const isSuperAdmin = authUser?.role === 'SUPER_ADMIN';
    const [role, setRole] = useState<'ADMIN' | 'COLLABORATOR'>('COLLABORATOR');
    const [linkGerado, setLinkGerado] = useState('');
    const [loading, setLoading] = useState(false);
    const [copiado, setCopiado] = useState(false);
    const [copiadoConviteId, setCopiadoConviteId] = useState<number | null>(null);
    const [error, setError] = useState('');
    const [convites, setConvites] = useState<Convite[]>([]);
    const [loadingConvites, setLoadingConvites] = useState(false);
    const [restaurantes, setRestaurantes] = useState<Restaurante[]>([]);
    const [restauranteSelecionado, setRestauranteSelecionado] = useState('');
    const [loadingRestaurantes, setLoadingRestaurantes] = useState(false);
    const [excluindoId, setExcluindoId] = useState<number | null>(null);

    useEffect(() => {
        carregarConvites();
    }, []);

    useEffect(() => {
        if (isSuperAdmin) {
            carregarRestaurantes();
        }
    }, [isSuperAdmin]);

    const carregarConvites = async () => {
        setLoadingConvites(true);
        try {
            const response = await api.get('/admin/convites');
            setConvites(response.data);
        } catch (err: any) {
            console.error('Erro ao carregar convites:', err);
        } finally {
            setLoadingConvites(false);
        }
    };

    const carregarRestaurantes = async () => {
        setLoadingRestaurantes(true);
        try {
            const response = await api.get('/admin/restaurantes');
            setRestaurantes(response.data.restaurantes || []);
        } catch (err: any) {
            console.error('Erro ao carregar restaurantes:', err);
            setError('Não foi possível carregar os restaurantes');
        } finally {
            setLoadingRestaurantes(false);
        }
    };

    const handleGerarConvite = async () => {
        setError('');
        setLinkGerado('');
        setCopiado(false);

        if (isSuperAdmin && !restauranteSelecionado) {
            setError('Você deve selecionar um restaurante');
            return;
        }

        setLoading(true);

        try {
            const payload: any = { role };
            if (isSuperAdmin) {
                payload.restaurante_id = parseInt(restauranteSelecionado, 10);
            }

            const response = await api.post('/admin/convites', payload);
            setLinkGerado(response.data.link);
            if (isSuperAdmin) {
                setRestauranteSelecionado('');
            }
            carregarConvites();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao gerar convite');
        } finally {
            setLoading(false);
        }
    };

    const handleCopiar = async () => {
        try {
            await navigator.clipboard.writeText(linkGerado);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 3000);
        } catch (err) {
            console.error('Erro ao copiar:', err);
        }
    };

    const gerarLinkConvite = (convite: Convite) =>
        convite.link || `${window.location.origin}/convite?token=${convite.token}`;

    const handleCopiarConvite = async (convite: Convite) => {
        try {
            const link = gerarLinkConvite(convite);
            await navigator.clipboard.writeText(link);
            setCopiadoConviteId(convite.id);
            setTimeout(() => {
                setCopiadoConviteId((current) => (current === convite.id ? null : current));
            }, 3000);
        } catch (err) {
            console.error('Erro ao copiar convite:', err);
            setError('Não foi possível copiar o link do convite');
        }
    };

    const handleWhatsAppConvite = (convite: Convite) => {
        const link = gerarLinkConvite(convite);
        const texto = `Olá! Você foi convidado(a) para se cadastrar no Kaizen Lists como ${
            convite.role === 'ADMIN' ? 'Administrador' : 'Colaborador'
        }.\n\nClique no link abaixo para completar seu cadastro:\n${link}`;
        const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
        window.open(url, '_blank');
    };

    const handleExcluirConvite = async (convite: Convite) => {
        const confirmar = window.confirm('Deseja excluir este convite?');
        if (!confirmar) {
            return;
        }

        setExcluindoId(convite.id);
        setError('');
        try {
            await api.delete(`/admin/convites/${convite.id}`);
            setConvites((prev) => prev.filter((item) => item.id !== convite.id));
        } catch (err: any) {
            console.error('Erro ao excluir convite:', err);
            setError(err.response?.data?.error || 'Erro ao excluir convite');
        } finally {
            setExcluindoId(null);
        }
    };

    const handleWhatsApp = () => {
        const texto = `Olá! Você foi convidado(a) para se cadastrar no Kaizen Lists como ${
            role === 'ADMIN' ? 'Administrador' : 'Colaborador'
        }.\n\nClique no link abaixo para completar seu cadastro:\n${linkGerado}`;
        const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
        window.open(url, '_blank');
    };

    return (
        <Container className="py-4">
            <h2 className="mb-4">
                <i className="fas fa-user-plus me-2"></i>
                Gerar Convite de Usuário
            </h2>

            {/* Card de Geração */}
            <Row className="mb-4">
                <Col lg={6}>
                    <Card className="shadow-sm">
                        <Card.Body>
                            <h5 className="mb-4">Novo Convite</h5>

                            {error && (
                                <Alert
                                    variant="danger"
                                    dismissible
                                    onClose={() => setError('')}
                                >
                                    <i className="fas fa-exclamation-circle me-2"></i>
                                    {error}
                                </Alert>
                            )}

                            <Form>
                                {isSuperAdmin && (
                                    <Form.Group className="mb-3">
                                        <Form.Label>
                                            Restaurante <span className="text-danger">*</span>
                                        </Form.Label>
                                        <Form.Select
                                            value={restauranteSelecionado}
                                            onChange={(e) =>
                                                setRestauranteSelecionado(e.target.value)
                                            }
                                            disabled={loadingRestaurantes}
                                            required
                                        >
                                            <option value="">
                                                {loadingRestaurantes
                                                    ? 'Carregando restaurantes...'
                                                    : 'Selecione um restaurante...'}
                                            </option>
                                            {restaurantes.map((restaurante) => (
                                                <option
                                                    key={restaurante.id}
                                                    value={restaurante.id}
                                                >
                                                    {restaurante.nome}
                                                </option>
                                            ))}
                                        </Form.Select>
                                        <Form.Text className="text-muted">
                                            Escolha para qual restaurante você está convidando
                                            este usuário
                                        </Form.Text>
                                    </Form.Group>
                                )}
                                <Form.Group className="mb-3">
                                    <Form.Label>Tipo de Usuário</Form.Label>
                                    <Form.Select
                                        value={role}
                                        onChange={(e) =>
                                            setRole(
                                                e.target.value as
                                                    | 'ADMIN'
                                                    | 'COLLABORATOR'
                                            )
                                        }
                                    >
                                        <option value="COLLABORATOR">Colaborador</option>
                                        <option value="ADMIN">Administrador</option>
                                    </Form.Select>
                                    <Form.Text className="text-muted">
                                        {role === 'ADMIN'
                                            ? 'Terá acesso total ao sistema'
                                            : 'Terá acesso apenas a listas atribuídas'}
                                    </Form.Text>
                                </Form.Group>

                                <Button
                                    variant="primary"
                                    onClick={handleGerarConvite}
                                    disabled={loading}
                                    className="w-100"
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2"></span>
                                            Gerando...
                                        </>
                                    ) : (
                                        <>
                                            <FontAwesomeIcon icon={faLink} className="me-2" />
                                            Gerar Link de Convite
                                        </>
                                    )}
                                </Button>
                            </Form>

                            {linkGerado && (
                                <div className="mt-4">
                                    <Alert variant="success">
                                        <FontAwesomeIcon icon={faCheck} className="me-2" />
                                        Convite gerado com sucesso!
                                    </Alert>

                                    <Form.Group>
                                        <Form.Label>Link de Convite</Form.Label>
                                        <div className="d-flex gap-2">
                                            <Form.Control
                                                type="text"
                                                value={linkGerado}
                                                readOnly
                                                onClick={(e) => e.currentTarget.select()}
                                            />
                                            <Button
                                                variant={copiado ? 'success' : 'outline-primary'}
                                                onClick={handleCopiar}
                                            >
                                                <FontAwesomeIcon
                                                    icon={copiado ? faCheck : faCopy}
                                                />
                                            </Button>
                                        </div>
                                    </Form.Group>

                                    <div className="d-grid gap-2 mt-3">
                                        <Button
                                            variant="success"
                                            onClick={handleWhatsApp}
                                        >
                                            <i className="fab fa-whatsapp me-2"></i>
                                            Compartilhar via WhatsApp
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Histórico de Convites */}
            <Card className="shadow-sm">
                <Card.Body>
                    <h5 className="mb-4">
                        <i className="fas fa-history me-2"></i>
                        Histórico de Convites
                    </h5>

                    {loadingConvites ? (
                        <div className="text-center py-4">
                            <span className="spinner-border me-2"></span>
                            Carregando convites...
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <Table hover>
                                    <thead>
                                        <tr>
                                            {isSuperAdmin && <th>Restaurante</th>}
                                            <th>Tipo</th>
                                            <th>Criado em</th>
                                            <th>Status</th>
                                            <th>Usado por</th>
                                            <th>Usado em</th>
                                            <th>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {convites.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={isSuperAdmin ? 7 : 6}
                                                    className="text-center text-muted py-4"
                                                >
                                                    Nenhum convite gerado ainda
                                                </td>
                                            </tr>
                                    ) : (
                                        convites.map((convite) => (
                                            <tr key={convite.id}>
                                                {isSuperAdmin && (
                                                    <td>
                                                        <Badge bg="secondary">
                                                            {convite.restaurante_nome || '-'}
                                                        </Badge>
                                                    </td>
                                                )}
                                                <td>
                                                    <Badge
                                                        bg={
                                                            convite.role === 'ADMIN'
                                                                ? 'danger'
                                                                : 'info'
                                                        }
                                                    >
                                                        {convite.role}
                                                    </Badge>
                                                </td>
                                                <td>{convite.criado_em}</td>
                                                <td>
                                                    {convite.usado ? (
                                                        <Badge bg="success">Usado</Badge>
                                                    ) : (
                                                        <Badge bg="warning text-dark">
                                                            Pendente
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td>
                                                    {convite.usado_por_nome ? (
                                                        <>
                                                            <strong>
                                                                {convite.usado_por_nome}
                                                            </strong>
                                                            <br />
                                                            <small className="text-muted">
                                                                {convite.usado_por_email}
                                                            </small>
                                                        </>
                                                    ) : (
                                                        <span className="text-muted">-</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {convite.usado_em || (
                                                        <span className="text-muted">-</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="d-flex gap-2 flex-wrap">
                                                        <Button
                                                            size="sm"
                                                            variant="outline-primary"
                                                            onClick={() => handleCopiarConvite(convite)}
                                                            disabled={convite.usado}
                                                        >
                                                            <FontAwesomeIcon
                                                                icon={
                                                                    copiadoConviteId === convite.id
                                                                        ? faCheck
                                                                        : faCopy
                                                                }
                                                                className="me-1"
                                                            />
                                                            Copiar
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline-success"
                                                            onClick={() => handleWhatsAppConvite(convite)}
                                                            disabled={convite.usado}
                                                        >
                                                            <i className="fab fa-whatsapp me-1"></i>
                                                            WhatsApp
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline-danger"
                                                            onClick={() => handleExcluirConvite(convite)}
                                                            disabled={excluindoId === convite.id}
                                                        >
                                                            <FontAwesomeIcon
                                                                icon={faTrash}
                                                                className="me-1"
                                                            />
                                                            Excluir
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
};

export default GerarConvite;
