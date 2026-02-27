import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Form, Modal, Spinner, Table } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faEdit, faTrash, faUsers, faRandom, faLink, faPause, faPlay, faUserSecret, faFilter, faSyncAlt } from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatarDataBrasilia, formatarDataBrasiliaSemHora, formatarDataHoraBrasilia, parseISODate } from '../../utils/dateFormatter';
import styles from './GerenciarRestaurantes.module.css';
import ResponsiveTable from '../../components/ResponsiveTable';

interface Restaurante {
    id: number;
    nome: string;
    slug: string;
    ativo: boolean;
    criado_em?: string | null;
    atualizado_em?: string | null;
    usuario_admin_email?: string;
    usuario_admin_senha?: string;
}

interface Usuario {
    id: number;
    nome: string;
    email: string;
    senha_texto_puro: string | null;
    role: string;
    ativo: boolean;
}

interface ConviteRestaurante {
    id: number;
    token: string;
    criado_em: string;
    expira_em?: string | null;
    link?: string;
    usado: boolean;
    usado_em?: string | null;
    usado_por_nome?: string | null;
    usado_por_email?: string | null;
    restaurante_nome?: string | null;
    limite_usos: number;
    quantidade_usos: number;
    usos_restantes: number;
    ativo: boolean;
}

const PRODUCTION_URL = 'https://kaizen-compras.up.railway.app';

const GerenciarRestaurantes: React.FC = () => {
    const { user: authUser, login } = useAuth();
    const isSuperAdmin = authUser?.role === 'SUPER_ADMIN';
    const [restaurantes, setRestaurantes] = useState<Restaurante[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentRestaurante, setCurrentRestaurante] = useState<Partial<Restaurante>>({
        nome: '',
        ativo: true,
    });

    // Estados para confirmação dupla de exclusão
    const [showFirstConfirmModal, setShowFirstConfirmModal] = useState(false);
    const [showSecondConfirmModal, setShowSecondConfirmModal] = useState(false);
    const [restauranteToDelete, setRestauranteToDelete] = useState<Restaurante | null>(null);
    const [confirmationText, setConfirmationText] = useState('');

    const [showCredentialsModal, setShowCredentialsModal] = useState(false);
    const [selectedRestauranteCredentials, setSelectedRestauranteCredentials] = useState<Restaurante | null>(null);
    const [copiedToClipboard, setCopiedToClipboard] = useState(false);
    const [showCopiarModal, setShowCopiarModal] = useState(false);
    const [textoCopiar, setTextoCopiar] = useState('');

    // Estados para gerenciamento de usuários
    const [showUsersModal, setShowUsersModal] = useState(false);
    const [selectedRestauranteUsers, setSelectedRestauranteUsers] = useState<Restaurante | null>(null);
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // Estados para alterar senha
    const [showAlterarSenhaModal, setShowAlterarSenhaModal] = useState(false);
    const [usuarioAlterarSenha, setUsuarioAlterarSenha] = useState<Usuario | null>(null);
    const [novaSenhaInput, setNovaSenhaInput] = useState('');

    const [convitesRestaurante, setConvitesRestaurante] = useState<ConviteRestaurante[]>([]);
    const [loadingConvites, setLoadingConvites] = useState(false);
    const [gerandoConvite, setGerandoConvite] = useState(false);
    const [linkConviteRestaurante, setLinkConviteRestaurante] = useState('');
    const [conviteCopiado, setConviteCopiado] = useState(false);
    const [excluindoConviteId, setExcluindoConviteId] = useState<number | null>(null);
    const [limiteUsos, setLimiteUsos] = useState<number>(1);

    // Estados para edição de convite
    const [showEditConviteModal, setShowEditConviteModal] = useState(false);
    const [conviteEditando, setConviteEditando] = useState<ConviteRestaurante | null>(null);
    const [editLimiteUsos, setEditLimiteUsos] = useState<number>(1);
    const [editAtivo, setEditAtivo] = useState<boolean>(true);
    const [salvandoConvite, setSalvandoConvite] = useState(false);

    // Estados para logs
    const [logs, setLogs] = useState<any[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [logsError, setLogsError] = useState('');
    const [logsFilters, setLogsFilters] = useState({
        restaurante_id: '',
        usuario_id: '',
        acao: '',
        entidade: '',
        start_date: '',
        end_date: ''
    });

    const [impersonatingUserId, setImpersonatingUserId] = useState<number | null>(null);

    const fetchRestaurantes = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get('/admin/restaurantes');
            setRestaurantes(response.data.restaurantes || []);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao carregar restaurantes.');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchLogs = useCallback(async (overrideFilters?: Partial<typeof logsFilters>) => {
        if (!isSuperAdmin) return;
        setLogsLoading(true);
        setLogsError('');
        try {
            const finalFilters = { ...logsFilters, ...(overrideFilters || {}) };
            const params: Record<string, string> = {};
            if (finalFilters.restaurante_id) params.restaurante_id = finalFilters.restaurante_id;
            if (finalFilters.usuario_id) params.usuario_id = finalFilters.usuario_id;
            if (finalFilters.acao) params.acao = finalFilters.acao;
            if (finalFilters.entidade) params.entidade = finalFilters.entidade;
            if (finalFilters.start_date) params.start_date = finalFilters.start_date;
            if (finalFilters.end_date) params.end_date = finalFilters.end_date;
            const response = await api.get('/admin/logs', { params });
            setLogs(response.data.logs || []);
        } catch (err: any) {
            setLogsError(err.response?.data?.error || 'Erro ao carregar logs.');
        } finally {
            setLogsLoading(false);
        }
    }, [isSuperAdmin, logsFilters]);

    const resetLogsFilters = () => {
        const reset = {
            restaurante_id: '',
            usuario_id: '',
            acao: '',
            entidade: '',
            start_date: '',
            end_date: ''
        };
        setLogsFilters(reset);
        fetchLogs(reset);
    };

    const handleImpersonarUsuario = async (usuario: Usuario) => {
        setError('');
        setImpersonatingUserId(usuario.id);
        try {
            const response = await api.post('/admin/impersonar', { usuario_id: usuario.id });
            const token = response.data?.access_token;
            if (token) {
                login(token);
            } else {
                setError('Token de impersonação não retornado.');
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao iniciar impersonação.');
        } finally {
            setImpersonatingUserId(null);
        }
    };

    const fetchConvitesRestaurante = useCallback(async () => {
        setLoadingConvites(true);
        try {
            const response = await api.get('/admin/convites-restaurante');
            setConvitesRestaurante(response.data.convites || []);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao carregar convites de restaurante.');
        } finally {
            setLoadingConvites(false);
        }
    }, []);

    useEffect(() => {
        fetchRestaurantes();
        if (isSuperAdmin) {
            fetchConvitesRestaurante();
            fetchLogs();
        }
    }, [isSuperAdmin, fetchRestaurantes, fetchConvitesRestaurante, fetchLogs]);

    const buildConviteRestauranteLink = (token: string) =>
        `${window.location.origin}/register-restaurant?token=${token}`;

    const gerarLinkConvite = (convite: ConviteRestaurante) => {
        if (convite.token) {
            return buildConviteRestauranteLink(convite.token);
        }
        return convite.link || '';
    };

    const handleGerarConviteRestaurante = async () => {
        setError('');
        setSuccess('');
        setConviteCopiado(false);
        setLinkConviteRestaurante('');
        setGerandoConvite(true);
        try {
            const response = await api.post('/admin/convites-restaurante', {
                limite_usos: limiteUsos
            });
            const token = response.data?.token;
            const link = token
                ? buildConviteRestauranteLink(token)
                : response.data?.link;
            setLinkConviteRestaurante(link || '');
            const usosTexto = limiteUsos === 1 ? '1 uso' : `${limiteUsos} usos`;
            setSuccess(`Convite de restaurante gerado com sucesso (${usosTexto}).`);
            setLimiteUsos(1); // Reset para valor padrão
            fetchConvitesRestaurante();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao gerar convite de restaurante.');
        } finally {
            setGerandoConvite(false);
        }
    };

    const handleCopiarConviteRestaurante = async (convite?: ConviteRestaurante) => {
        const link = convite ? gerarLinkConvite(convite) : linkConviteRestaurante;
        if (!link) {
            setError('Link de convite indisponível.');
            return;
        }
        try {
            await navigator.clipboard.writeText(link);
            setConviteCopiado(true);
            setTimeout(() => setConviteCopiado(false), 3000);
        } catch (err) {
            setError('Não foi possível copiar o link do convite.');
        }
    };

    const handleWhatsAppConviteRestaurante = (convite?: ConviteRestaurante) => {
        const link = convite ? gerarLinkConvite(convite) : linkConviteRestaurante;
        if (!link) return;
        const texto = `Olá! Você foi convidado(a) a cadastrar seu restaurante no Kaizen Lists.\n\n` +
            `Clique no link abaixo para concluir o cadastro imediato:\n${link}`;
        const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
        window.open(url, '_blank');
    };

    const handleExcluirConviteRestaurante = async (convite: ConviteRestaurante) => {
        const confirmar = window.confirm('Deseja excluir este convite de restaurante?');
        if (!confirmar) {
            return;
        }
        setExcluindoConviteId(convite.id);
        setError('');
        try {
            await api.delete(`/admin/convites-restaurante/${convite.id}`);
            setConvitesRestaurante((prev) => prev.filter((item) => item.id !== convite.id));
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao excluir convite de restaurante.');
        } finally {
            setExcluindoConviteId(null);
        }
    };

    const handleEditarConvite = (convite: ConviteRestaurante) => {
        setConviteEditando(convite);
        setEditLimiteUsos(convite.limite_usos);
        setEditAtivo(convite.ativo);
        setShowEditConviteModal(true);
    };

    const handleSalvarConvite = async () => {
        if (!conviteEditando) return;

        setSalvandoConvite(true);
        setError('');
        try {
            const response = await api.put(`/admin/convites-restaurante/${conviteEditando.id}`, {
                limite_usos: editLimiteUsos,
                ativo: editAtivo
            });
            setSuccess(response.data.message || 'Convite atualizado com sucesso!');
            setShowEditConviteModal(false);
            fetchConvitesRestaurante();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao atualizar convite.');
        } finally {
            setSalvandoConvite(false);
        }
    };

    const handleToggleAtivoConvite = async (convite: ConviteRestaurante) => {
        setError('');
        try {
            await api.put(`/admin/convites-restaurante/${convite.id}`, {
                ativo: !convite.ativo
            });
            setSuccess(convite.ativo ? 'Convite pausado.' : 'Convite ativado.');
            fetchConvitesRestaurante();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao alterar status do convite.');
        }
    };

    const handleShowModal = (restaurante?: Restaurante) => {
        if (restaurante) {
            setCurrentRestaurante(restaurante);
            setIsEditing(true);
        } else {
            setCurrentRestaurante({ nome: '', ativo: true });
            setIsEditing(false);
        }
        setError('');
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!currentRestaurante.nome?.trim()) {
            setError('O nome do restaurante é obrigatório.');
            return;
        }

        try {
            if (isEditing && currentRestaurante.id) {
                await api.put(`/admin/restaurantes/${currentRestaurante.id}`, {
                    nome: currentRestaurante.nome,
                    ativo: currentRestaurante.ativo,
                });
                setSuccess('Restaurante atualizado com sucesso.');
            } else {
                await api.post('/admin/restaurantes', {
                    nome: currentRestaurante.nome,
                });
                setSuccess('Restaurante criado com sucesso.');
            }
            setShowModal(false);
            fetchRestaurantes();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao salvar restaurante.');
        }
    };

    const handleShowDeleteModal = (restaurante: Restaurante) => {
        setRestauranteToDelete(restaurante);
        setShowFirstConfirmModal(true);
    };

    const handleFirstConfirm = () => {
        setShowFirstConfirmModal(false);
        setShowSecondConfirmModal(true);
        setConfirmationText(''); // Limpar campo de texto
    };

    const handleCancelDelete = () => {
        setShowFirstConfirmModal(false);
        setShowSecondConfirmModal(false);
        setRestauranteToDelete(null);
        setConfirmationText('');
    };

    const handleConfirmDelete = async () => {
        if (!restauranteToDelete) return;

        // Validar que o nome digitado corresponde exatamente ao nome do restaurante
        if (confirmationText.trim() !== restauranteToDelete.nome) {
            setError('O nome digitado não corresponde ao nome do restaurante.');
            return;
        }

        try {
            await api.delete(`/admin/restaurantes/${restauranteToDelete.id}`);
            setSuccess('Restaurante deletado com sucesso.');
            setShowSecondConfirmModal(false);
            setRestauranteToDelete(null);
            setConfirmationText('');
            fetchRestaurantes();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao deletar restaurante.');
        }
    };

    const handleShowCredentialsModal = (restaurante: Restaurante) => {
        setSelectedRestauranteCredentials(restaurante);
        setCopiedToClipboard(false);
        setShowCredentialsModal(true);
    };

    const abrirModalCopiar = (texto: string) => {
        setTextoCopiar(texto);
        setShowCopiarModal(true);
    };

    const copiarTexto = async (texto: string) => {
        if (navigator.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(texto);
                return true;
            } catch (error) {
                console.warn('[GerenciarRestaurantes] Falha ao copiar via clipboard:', error);
            }
        }

        const textarea = document.createElement('textarea');
        textarea.value = texto;
        textarea.style.position = 'fixed';
        textarea.style.top = '-1000px';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        try {
            return document.execCommand('copy');
        } catch (error) {
            console.warn('[GerenciarRestaurantes] Falha ao copiar via execCommand:', error);
            return false;
        } finally {
            document.body.removeChild(textarea);
        }
    };

    const handleCopyCredentials = async () => {
        if (!selectedRestauranteCredentials) return;

        const { nome, usuario_admin_email, usuario_admin_senha } = selectedRestauranteCredentials;
        const loginUrl = PRODUCTION_URL;

        const message = `*Credenciais de Acesso - ${nome}*\n\n` +
            `📧 Email: ${usuario_admin_email}\n` +
            `🔑 Senha: ${usuario_admin_senha}\n\n` +
            `🌐 Acesso: ${loginUrl}\n\n` +
            `Utilize essas credenciais para acessar o sistema Kaizen Lists.`;

        try {
            const copiado = await copiarTexto(message);
            if (copiado) {
                setCopiedToClipboard(true);
                setTimeout(() => setCopiedToClipboard(false), 3000);
            } else {
                setCopiedToClipboard(false);
                abrirModalCopiar(message);
            }
            setError('');
            setSuccess(copiado ? 'Credenciais copiadas!' : 'Credenciais geradas. Copie manualmente.');
        } catch (err) {
            setError('Erro ao copiar para clipboard');
            setSuccess('');
        }
    };

    const handleShareWhatsApp = async () => {
        if (!selectedRestauranteCredentials) return;

        const { nome, usuario_admin_email, usuario_admin_senha } = selectedRestauranteCredentials;
        const loginUrl = PRODUCTION_URL;

        const message = `*Credenciais de Acesso - ${nome}*\n\n` +
            `📧 Email: ${usuario_admin_email}\n` +
            `🔑 Senha: ${usuario_admin_senha}\n\n` +
            `🌐 Acesso: ${loginUrl}\n\n` +
            `Utilize essas credenciais para acessar o sistema Kaizen Lists.`;

        const popup = window.open('about:blank', '_blank');

        try {
            const copiado = await copiarTexto(message);

            const url = new URL('https://wa.me/');
            url.searchParams.set('text', message);
            if (popup) {
                popup.location.href = url.toString();
            } else {
                window.location.href = url.toString();
            }

            setError('');
            setSuccess(copiado ? 'Texto copiado e WhatsApp aberto!' : 'WhatsApp aberto. Copie o texto manualmente.');
            if (!copiado) {
                abrirModalCopiar(message);
            }
        } catch (err) {
            if (popup) {
                popup.close();
            }
            setError('Erro ao compartilhar no WhatsApp.');
            setSuccess('');
        }
    };

    const fetchUsuariosRestaurante = async (restaurante_id: number) => {
        setLoadingUsers(true);
        try {
            const response = await api.get(`/admin/restaurantes/${restaurante_id}/usuarios`);
            setUsuarios(response.data.usuarios || []);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao carregar usuários.');
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleShowUsersModal = (restaurante: Restaurante) => {
        setSelectedRestauranteUsers(restaurante);
        setShowUsersModal(true);
        fetchUsuariosRestaurante(restaurante.id);
    };

    const handleAlterarSenha = async () => {
        if (!usuarioAlterarSenha || !novaSenhaInput.trim()) {
            setError('Digite uma nova senha.');
            return;
        }

        if (novaSenhaInput.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        try {
            await api.put(`/admin/usuarios/${usuarioAlterarSenha.id}/alterar-senha`, {
                nova_senha: novaSenhaInput
            });
            setSuccess('Senha alterada com sucesso!');
            setShowAlterarSenhaModal(false);
            setNovaSenhaInput('');
            // Recarregar lista de usuários
            if (selectedRestauranteUsers) {
                fetchUsuariosRestaurante(selectedRestauranteUsers.id);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao alterar senha.');
        }
    };

    const handleResetarSenha = async (usuario: Usuario) => {
        if (!window.confirm(`Resetar senha de ${usuario.nome} para senha aleatória?`)) {
            return;
        }

        try {
            const response = await api.post(`/admin/usuarios/${usuario.id}/resetar-senha`);
            setSuccess(`Senha resetada! Nova senha: ${response.data.nova_senha}`);
            // Recarregar lista de usuários
            if (selectedRestauranteUsers) {
                fetchUsuariosRestaurante(selectedRestauranteUsers.id);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao resetar senha.');
        }
    };

    const handleCopyUserCredentials = async (usuario: Usuario) => {
        const message = `Credenciais de Acesso\n\n` +
            `Nome: ${usuario.nome}\n` +
            `Email: ${usuario.email}\n` +
            `Senha: ${usuario.senha_texto_puro}\n\n` +
            `Acesso: ${PRODUCTION_URL}`;

        try {
            const copiado = await copiarTexto(message);
            if (!copiado) {
                abrirModalCopiar(message);
            }
            setError('');
            setSuccess(copiado ? 'Credenciais copiadas!' : 'Credenciais geradas. Copie manualmente.');
        } catch (err) {
            setError('Erro ao copiar credenciais.');
            setSuccess('');
        }
    };

    const handleShareUserWhatsApp = async (usuario: Usuario) => {
        const message = `*Credenciais de Acesso*\n\n` +
            `👤 Nome: ${usuario.nome}\n` +
            `📧 Email: ${usuario.email}\n` +
            `🔑 Senha: ${usuario.senha_texto_puro}\n\n` +
            `🌐 Acesso: ${PRODUCTION_URL}`;

        const popup = window.open('about:blank', '_blank');

        try {
            const copiado = await copiarTexto(message);

            const url = new URL('https://wa.me/');
            url.searchParams.set('text', message);
            if (popup) {
                popup.location.href = url.toString();
            } else {
                window.location.href = url.toString();
            }

            setError('');
            setSuccess(copiado ? 'Texto copiado e WhatsApp aberto!' : 'WhatsApp aberto. Copie o texto manualmente.');
            if (!copiado) {
                abrirModalCopiar(message);
            }
        } catch (err) {
            if (popup) {
                popup.close();
            }
            setError('Erro ao compartilhar no WhatsApp.');
            setSuccess('');
        }
    };

    const handleCopiarTextoModal = async () => {
        if (!textoCopiar) return;

        const copiado = await copiarTexto(textoCopiar);
        setError('');
        setSuccess(copiado ? 'Texto copiado para a área de transferência!' : 'Selecione o texto e copie manualmente.');
        if (copiado) {
            setShowCopiarModal(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h2>Gerenciar Restaurantes</h2>
                    <p className="text-muted mb-0">
                        Crie e gerencie restaurantes do sistema
                    </p>
                </div>
                {isSuperAdmin && (
                    <div className={styles.headerActions}>
                        <Button
                            variant="outline-primary"
                            onClick={handleGerarConviteRestaurante}
                            disabled={gerandoConvite}
                        >
                            <FontAwesomeIcon icon={faLink} className="me-2" />
                            Gerar Convite
                        </Button>
                        <Button variant="primary" onClick={() => handleShowModal()}>
                            <i className="fas fa-plus me-2"></i>
                            Criar Novo Restaurante
                        </Button>
                    </div>
                )}
            </div>

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

            {isSuperAdmin && (
                <Card className="mb-4">
                    <Card.Body>
                        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                            <div>
                                <h5 className="mb-1">Convites de Restaurante</h5>
                                <p className="text-muted mb-0">
                                    Gere convites com validade de 72 horas para cadastro imediato.
                                </p>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <Form.Group className="mb-0" style={{ width: '120px' }}>
                                    <Form.Label className="small mb-1">Limite de usos</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min={1}
                                        max={100}
                                        value={limiteUsos}
                                        onChange={(e) => setLimiteUsos(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                                        size="sm"
                                    />
                                </Form.Group>
                                <Button
                                    variant="outline-primary"
                                    onClick={handleGerarConviteRestaurante}
                                    disabled={gerandoConvite}
                                    className="align-self-end"
                                >
                                    {gerandoConvite ? (
                                        <>
                                            <Spinner as="span" animation="border" size="sm" className="me-2" />
                                            Gerando...
                                        </>
                                    ) : (
                                        <>
                                            <FontAwesomeIcon icon={faLink} className="me-2" />
                                            Gerar Convite
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {linkConviteRestaurante && (
                            <div className="mt-3">
                                <Form.Label>Link do convite gerado</Form.Label>
                                <div className="d-flex gap-2 flex-wrap">
                                    <Form.Control
                                        type="text"
                                        value={linkConviteRestaurante}
                                        readOnly
                                        onClick={(event) => event.currentTarget.select()}
                                    />
                                    <Button
                                        variant={conviteCopiado ? 'success' : 'outline-secondary'}
                                        onClick={() => handleCopiarConviteRestaurante()}
                                    >
                                        <FontAwesomeIcon icon={faCopy} />
                                    </Button>
                                    <Button
                                        variant="outline-success"
                                        onClick={() => handleWhatsAppConviteRestaurante()}
                                    >
                                        <FontAwesomeIcon icon={faWhatsapp} />
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="mt-4 table-responsive">
                            <Table hover size="sm">
                                <thead>
                                    <tr>
                                        <th>Restaurante</th>
                                        <th>Criado em</th>
                                        <th className="d-none d-sm-table-cell">Expira em</th>
                                        <th>Usos</th>
                                        <th>Status</th>
                                        <th className="d-none d-sm-table-cell">Último uso</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingConvites ? (
                                        <tr>
                                            <td colSpan={7} className="text-center text-muted py-3">
                                                Carregando convites...
                                            </td>
                                        </tr>
                                    ) : convitesRestaurante.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center text-muted py-3">
                                                Nenhum convite gerado ainda
                                            </td>
                                        </tr>
                                    ) : (
                                        convitesRestaurante.map((convite) => {
                                            const expiraEm = convite.expira_em ? parseISODate(convite.expira_em) : null;
                                            const expirado = expiraEm ? expiraEm.getTime() < Date.now() : false;
                                            const esgotado = convite.quantidade_usos >= convite.limite_usos;
                                            const pausado = !convite.ativo;
                                            const statusLabel = pausado
                                                ? { texto: 'Pausado', variant: 'warning' }
                                                : esgotado
                                                    ? { texto: 'Esgotado', variant: 'success' }
                                                    : expirado
                                                        ? { texto: 'Expirado', variant: 'secondary' }
                                                        : { texto: 'Disponível', variant: 'primary' };
                                            const desabilitado = esgotado || expirado || pausado;

                                            return (
                                                <tr key={convite.id} className={pausado ? 'table-warning' : ''}>
                                                    <td>{convite.restaurante_nome || '-'}</td>
                                                    <td>{convite.criado_em ? formatarDataHoraBrasilia(convite.criado_em) : '-'}</td>
                                                    <td className="d-none d-sm-table-cell">{convite.expira_em ? formatarDataHoraBrasilia(convite.expira_em) : '-'}</td>
                                                    <td>
                                                        <Badge bg={esgotado ? 'secondary' : 'info'}>
                                                            {convite.quantidade_usos}/{convite.limite_usos}
                                                        </Badge>
                                                    </td>
                                                    <td>
                                                        <Badge bg={statusLabel.variant} className={statusLabel.variant === 'warning' ? 'text-dark' : ''}>
                                                            {statusLabel.texto}
                                                        </Badge>
                                                    </td>
                                                    <td className="d-none d-sm-table-cell">
                                                        {convite.usado_por_nome ? (
                                                            <>
                                                                <strong>{convite.usado_por_nome}</strong>
                                                                <br />
                                                                <small className="text-muted">
                                                                    {convite.usado_em ? formatarDataHoraBrasilia(convite.usado_em) : ''}
                                                                </small>
                                                            </>
                                                        ) : (
                                                            <span className="text-muted">-</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div className="d-flex gap-1 flex-wrap">
                                                            <Button
                                                                size="sm"
                                                                variant="outline-primary"
                                                                onClick={() => handleEditarConvite(convite)}
                                                                title="Editar limite de usos"
                                                            >
                                                                <FontAwesomeIcon icon={faEdit} />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant={convite.ativo ? 'outline-warning' : 'outline-success'}
                                                                onClick={() => handleToggleAtivoConvite(convite)}
                                                                title={convite.ativo ? 'Pausar convite' : 'Ativar convite'}
                                                            >
                                                                <FontAwesomeIcon icon={convite.ativo ? faPause : faPlay} />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline-secondary"
                                                                onClick={() => handleCopiarConviteRestaurante(convite)}
                                                                disabled={desabilitado}
                                                                title="Copiar link"
                                                            >
                                                                <FontAwesomeIcon icon={faCopy} />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline-success"
                                                                onClick={() => handleWhatsAppConviteRestaurante(convite)}
                                                                disabled={desabilitado}
                                                                title="Compartilhar WhatsApp"
                                                            >
                                                                <FontAwesomeIcon icon={faWhatsapp} />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline-danger"
                                                                onClick={() => handleExcluirConviteRestaurante(convite)}
                                                                disabled={excluindoConviteId === convite.id}
                                                                title="Excluir convite"
                                                            >
                                                                <FontAwesomeIcon icon={faTrash} />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    </Card.Body>
                </Card>
            )}

            {loading ? (
                <div className="text-center py-4">
                    <Spinner animation="border" />
                </div>
            ) : (
                <ResponsiveTable
                    data={restaurantes}
                    columns={[
                        { header: 'Nome', accessor: 'nome' },
                        { header: 'Slug', accessor: 'slug' },
                        {
                            header: 'Status',
                            accessor: (restaurante: Restaurante) => (
                                <Badge bg={restaurante.ativo ? 'success' : 'secondary'}>
                                    {restaurante.ativo ? 'Ativo' : 'Inativo'}
                                </Badge>
                            )
                        },
                        {
                            header: 'Criado em',
                            accessor: (restaurante: Restaurante) =>
                                restaurante.criado_em
                                    ? formatarDataBrasiliaSemHora(restaurante.criado_em)
                                    : '-'
                        }
                    ]}
                    keyExtractor={(restaurante) => restaurante.id.toString()}
                    renderActions={(restaurante) => (
                        <div className={styles.tableActions}>
                            <Button
                                variant="outline-info"
                                size="sm"
                                onClick={() => handleShowCredentialsModal(restaurante)}
                                title="Copiar ou compartilhar credenciais"
                            >
                                <FontAwesomeIcon icon={faCopy} /><span className="btn-text"> Login</span>
                            </Button>
                            <Button
                                variant="outline-success"
                                size="sm"
                                onClick={() => handleShowUsersModal(restaurante)}
                                title="Gerenciar usuários"
                            >
                                <FontAwesomeIcon icon={faUsers} /><span className="btn-text"> Usuários</span>
                            </Button>
                            <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => handleShowModal(restaurante)}
                                title="Editar restaurante"
                            >
                                <FontAwesomeIcon icon={faEdit} /><span className="btn-text"> Editar</span>
                            </Button>
                            <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleShowDeleteModal(restaurante)}
                                title="Deletar restaurante"
                            >
                                <FontAwesomeIcon icon={faTrash} /><span className="btn-text"> Deletar</span>
                            </Button>
                        </div>
                    )}
                    emptyMessage="Nenhum restaurante encontrado."
                />
            )}

            {isSuperAdmin && (
                <Card className="mb-4">
                    <Card.Body>
                        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                            <div>
                                <h5 className="mb-1">Logs do Sistema</h5>
                                <p className="text-muted mb-0">
                                    Acompanhe eventos e auditoria por restaurante, usuario e periodo.
                                </p>
                            </div>
                            <div className="d-flex gap-2 align-items-center">
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={() => fetchLogs()}
                                    disabled={logsLoading}
                                >
                                    <FontAwesomeIcon icon={faSyncAlt} className="me-2" />
                                    Atualizar
                                </Button>
                            </div>
                        </div>

                        <Form className="mt-3">
                            <div className="row g-2 align-items-end">
                                <div className="col-12 col-md-3">
                                    <Form.Label className="small">Restaurante</Form.Label>
                                    <Form.Select
                                        value={logsFilters.restaurante_id}
                                        onChange={(e) => setLogsFilters((prev) => ({ ...prev, restaurante_id: e.target.value }))}
                                    >
                                        <option value="">Todos</option>
                                        {restaurantes.map((restaurante) => (
                                            <option key={restaurante.id} value={restaurante.id}>
                                                {restaurante.nome}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </div>
                                <div className="col-12 col-md-2">
                                    <Form.Label className="small">Usuario ID</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={logsFilters.usuario_id}
                                        onChange={(e) => setLogsFilters((prev) => ({ ...prev, usuario_id: e.target.value }))}
                                        placeholder="Ex: 42"
                                    />
                                </div>
                                <div className="col-12 col-md-2">
                                    <Form.Label className="small">Acao</Form.Label>
                                    <Form.Select
                                        value={logsFilters.acao}
                                        onChange={(e) => setLogsFilters((prev) => ({ ...prev, acao: e.target.value }))}
                                    >
                                        <option value="">Todas</option>
                                        <option value="login">Login</option>
                                        <option value="create">Criacao</option>
                                        <option value="update">Atualizacao</option>
                                        <option value="delete">Exclusao</option>
                                        <option value="approve">Aprovacao</option>
                                        <option value="restore">Restauracao</option>
                                        <option value="permanent_delete">Delete permanente</option>
                                        <option value="deactivate">Desativacao</option>
                                        <option value="reactivate">Reativacao</option>
                                        <option value="impersonate_start">Impersonacao inicio</option>
                                        <option value="impersonate_end">Impersonacao fim</option>
                                    </Form.Select>
                                </div>
                                <div className="col-12 col-md-2">
                                    <Form.Label className="small">Entidade</Form.Label>
                                    <Form.Select
                                        value={logsFilters.entidade}
                                        onChange={(e) => setLogsFilters((prev) => ({ ...prev, entidade: e.target.value }))}
                                    >
                                        <option value="">Todas</option>
                                        <option value="usuario">Usuario</option>
                                        <option value="restaurante">Restaurante</option>
                                        <option value="lista">Lista</option>
                                        <option value="fornecedor">Fornecedor</option>
                                        <option value="item">Item</option>
                                        <option value="item_global">Item global</option>
                                    </Form.Select>
                                </div>
                                <div className="col-12 col-md-3">
                                    <Form.Label className="small">Periodo inicial</Form.Label>
                                    <Form.Control
                                        type="datetime-local"
                                        value={logsFilters.start_date}
                                        onChange={(e) => setLogsFilters((prev) => ({ ...prev, start_date: e.target.value }))}
                                    />
                                </div>
                                <div className="col-12 col-md-3">
                                    <Form.Label className="small">Periodo final</Form.Label>
                                    <Form.Control
                                        type="datetime-local"
                                        value={logsFilters.end_date}
                                        onChange={(e) => setLogsFilters((prev) => ({ ...prev, end_date: e.target.value }))}
                                    />
                                </div>
                                <div className="col-12 col-md-3 d-flex gap-2">
                                    <Button
                                        variant="primary"
                                        onClick={() => fetchLogs()}
                                        disabled={logsLoading}
                                        className="w-100"
                                    >
                                        <FontAwesomeIcon icon={faFilter} className="me-2" />
                                        Filtrar
                                    </Button>
                                    <Button
                                        variant="outline-secondary"
                                        onClick={resetLogsFilters}
                                        disabled={logsLoading}
                                        className="w-100"
                                    >
                                        Limpar
                                    </Button>
                                </div>
                            </div>
                        </Form>

                        {logsError && <Alert variant="danger" className="mt-3">{logsError}</Alert>}

                        <div className="mt-3 table-responsive">
                            <Table striped bordered hover size="sm">
                                <thead>
                                    <tr>
                                        <th>Data</th>
                                        <th>Restaurante</th>
                                        <th>Usuario</th>
                                        <th>Acao</th>
                                        <th>Entidade</th>
                                        <th>Mensagem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logsLoading ? (
                                        <tr>
                                            <td colSpan={6} className="text-center text-muted py-3">
                                                Carregando logs...
                                            </td>
                                        </tr>
                                    ) : logs.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center text-muted py-3">
                                                Nenhum log encontrado.
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.map((log) => (
                                            <tr key={log.id}>
                                                <td>{log.criado_em ? formatarDataBrasilia(log.criado_em) : '-'}</td>
                                                <td>{log.restaurante?.nome || log.restaurante_id || '-'}</td>
                                                <td>{log.usuario?.nome || log.usuario_id || '-'}</td>
                                                <td>{log.acao}</td>
                                                <td>{log.entidade || '-'}</td>
                                                <td>{log.mensagem || '-'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    </Card.Body>
                </Card>
            )}

            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{isEditing ? 'Editar Restaurante' : 'Criar Restaurante'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Nome do Restaurante</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Ex: Restaurante Central"
                                value={currentRestaurante.nome || ''}
                                onChange={(e) => setCurrentRestaurante({ ...currentRestaurante, nome: e.target.value })}
                            />
                        </Form.Group>
                        {isEditing && (
                            <Form.Group>
                                <Form.Check
                                    type="checkbox"
                                    label="Restaurante ativo"
                                    checked={!!currentRestaurante.ativo}
                                    onChange={(e) => setCurrentRestaurante({ ...currentRestaurante, ativo: e.target.checked })}
                                />
                            </Form.Group>
                        )}
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
                    <Button variant="primary" onClick={handleSave}>
                        {isEditing ? 'Atualizar' : 'Criar Restaurante'}
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showCredentialsModal} onHide={() => setShowCredentialsModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Credenciais - {selectedRestauranteCredentials?.nome}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedRestauranteCredentials ? (
                        <div>
                            <div className="mb-3">
                                <label className="fw-bold">Email (Login):</label>
                                <div className="bg-light p-2 rounded">
                                    {selectedRestauranteCredentials.usuario_admin_email || 'Não disponível'}
                                </div>
                            </div>
                            <div className="mb-3">
                                <label className="fw-bold">Senha Padrão:</label>
                                <div className="bg-light p-2 rounded">
                                    {selectedRestauranteCredentials.usuario_admin_senha || 'Não disponível'}
                                </div>
                            </div>
                            <div className="mb-3">
                                <label className="fw-bold">URL de Acesso:</label>
                                <div className="bg-light p-2 rounded">
                                    {PRODUCTION_URL}
                                </div>
                            </div>
                            {copiedToClipboard && (
                                <Alert variant="success" className="mb-0">
                                    ✅ Copiado para clipboard!
                                </Alert>
                            )}
                        </div>
                    ) : null}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="outline-secondary" onClick={() => setShowCredentialsModal(false)}>
                        Fechar
                    </Button>
                    <Button
                        variant="outline-primary"
                        onClick={handleCopyCredentials}
                    >
                        <FontAwesomeIcon icon={faCopy} /> Copiar Login
                    </Button>
                    <Button
                        variant="success"
                        onClick={handleShareWhatsApp}
                    >
                        <FontAwesomeIcon icon={faWhatsapp} /> Compartilhar
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal 1: Confirmação inicial */}
            <Modal show={showFirstConfirmModal} onHide={handleCancelDelete} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="text-warning">
                        <i className="fas fa-exclamation-triangle me-2"></i>
                        Confirmar Exclusão
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Você está prestes a excluir o restaurante:</p>
                    <p className="text-center fs-5 fw-bold text-danger">
                        {restauranteToDelete?.nome}
                    </p>
                    <p className="text-muted">
                        Esta ação marcará o restaurante como deletado (soft delete).
                    </p>
                    <p className="fw-bold">Deseja continuar?</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCancelDelete}>
                        Cancelar
                    </Button>
                    <Button variant="warning" onClick={handleFirstConfirm}>
                        Sim, continuar
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal 2: Confirmação com digitação do nome */}
            <Modal show={showSecondConfirmModal} onHide={handleCancelDelete} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="text-danger">
                        <i className="fas fa-exclamation-triangle me-2"></i>
                        Confirmação Final
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Para confirmar a exclusão, digite o nome do restaurante abaixo:</p>
                    <p className="text-center fs-6 fw-bold mb-3">
                        {restauranteToDelete?.nome}
                    </p>
                    <Form.Group>
                        <Form.Label>Nome do restaurante:</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Digite exatamente o nome do restaurante"
                            value={confirmationText}
                            onChange={(e) => setConfirmationText(e.target.value)}
                            autoFocus
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCancelDelete}>
                        Cancelar
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleConfirmDelete}
                        disabled={confirmationText.trim() !== restauranteToDelete?.nome}
                    >
                        Excluir Definitivamente
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal: Gerenciar Usuários do Restaurante */}
            <Modal
                show={showUsersModal}
                onHide={() => setShowUsersModal(false)}
                size="xl"
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        Usuários - {selectedRestauranteUsers?.nome}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {loadingUsers ? (
                        <div className="text-center py-4">
                            <Spinner animation="border" />
                        </div>
                    ) : usuarios.length === 0 ? (
                        <p className="text-center text-muted">Nenhum usuário encontrado.</p>
                    ) : (
                        <div className="table-responsive">
                        <Table striped bordered hover size="sm">
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Email</th>
                                    <th>Senha</th>
                                    <th>Role</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usuarios.map((usuario) => (
                                    <tr key={usuario.id}>
                                        <td>{usuario.nome}</td>
                                        <td>{usuario.email}</td>
                                        <td>
                                            <code>{usuario.senha_texto_puro || '(não disponível)'}</code>
                                        </td>
                                        <td>
                                            <Badge bg={usuario.role === 'ADMIN' ? 'primary' : 'secondary'}>
                                                {usuario.role}
                                            </Badge>
                                        </td>
                                        <td>
                                            <div className="d-flex gap-1">
                                                <Button
                                                    variant="outline-primary"
                                                    size="sm"
                                                    onClick={() => {
                                                        setUsuarioAlterarSenha(usuario);
                                                        setShowAlterarSenhaModal(true);
                                                    }}
                                                    title="Alterar senha manualmente"
                                                >
                                                    <FontAwesomeIcon icon={faEdit} />
                                                </Button>
                                                <Button
                                                    variant="outline-warning"
                                                    size="sm"
                                                    onClick={() => handleResetarSenha(usuario)}
                                                    title="Resetar para senha aleatória"
                                                >
                                                    <FontAwesomeIcon icon={faRandom} />
                                                </Button>
                                                <Button
                                                    variant="outline-info"
                                                    size="sm"
                                                    onClick={() => handleCopyUserCredentials(usuario)}
                                                    title="Copiar credenciais"
                                                >
                                                    <FontAwesomeIcon icon={faCopy} />
                                                </Button>
                                                <Button
                                                    variant="outline-success"
                                                    size="sm"
                                                    onClick={() => handleShareUserWhatsApp(usuario)}
                                                    title="Compartilhar WhatsApp"
                                                >
                                                    <FontAwesomeIcon icon={faWhatsapp} />
                                                </Button>
                                                {isSuperAdmin && usuario.role !== 'SUPER_ADMIN' && (
                                                    <Button
                                                        variant="outline-dark"
                                                        size="sm"
                                                        onClick={() => handleImpersonarUsuario(usuario)}
                                                        title="Assumir usuário"
                                                        disabled={impersonatingUserId === usuario.id}
                                                    >
                                                        {impersonatingUserId === usuario.id ? (
                                                            <Spinner animation="border" size="sm" />
                                                        ) : (
                                                            <FontAwesomeIcon icon={faUserSecret} />
                                                        )}
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowUsersModal(false)}>
                        Fechar
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showCopiarModal} onHide={() => setShowCopiarModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Copiar credenciais</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Control
                        as="textarea"
                        rows={8}
                        value={textoCopiar}
                        readOnly
                        onFocus={(event) => event.currentTarget.select()}
                    />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowCopiarModal(false)}>
                        Fechar
                    </Button>
                    <Button variant="primary" onClick={handleCopiarTextoModal}>
                        Copiar texto
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal: Alterar Senha Manual */}
            <Modal show={showAlterarSenhaModal} onHide={() => setShowAlterarSenhaModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Alterar Senha - {usuarioAlterarSenha?.nome}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>Nova Senha (mínimo 6 caracteres):</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Digite a nova senha"
                            value={novaSenhaInput}
                            onChange={(e) => setNovaSenhaInput(e.target.value)}
                            autoFocus
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAlterarSenhaModal(false)}>
                        Cancelar
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleAlterarSenha}
                        disabled={novaSenhaInput.length < 6}
                    >
                        Salvar Nova Senha
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modal: Editar Convite de Restaurante */}
            <Modal show={showEditConviteModal} onHide={() => setShowEditConviteModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Editar Convite</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {conviteEditando && (
                        <>
                            <div className="mb-3">
                                <small className="text-muted">
                                    Usos atuais: {conviteEditando.quantidade_usos} de {conviteEditando.limite_usos}
                                </small>
                            </div>
                            <Form.Group className="mb-3">
                                <Form.Label>Limite de Usos (1-100)</Form.Label>
                                <Form.Control
                                    type="number"
                                    min={conviteEditando.quantidade_usos || 1}
                                    max={100}
                                    value={editLimiteUsos}
                                    onChange={(e) => setEditLimiteUsos(Math.max(conviteEditando.quantidade_usos || 1, Math.min(100, parseInt(e.target.value) || 1)))}
                                />
                                <Form.Text className="text-muted">
                                    Mínimo: {conviteEditando.quantidade_usos || 1} (já utilizados)
                                </Form.Text>
                            </Form.Group>
                            <Form.Group>
                                <Form.Check
                                    type="switch"
                                    id="convite-ativo-switch"
                                    label={editAtivo ? 'Convite ativo' : 'Convite pausado'}
                                    checked={editAtivo}
                                    onChange={(e) => setEditAtivo(e.target.checked)}
                                />
                                <Form.Text className="text-muted">
                                    {editAtivo
                                        ? 'O convite pode ser utilizado para cadastro'
                                        : 'O convite está temporariamente bloqueado'}
                                </Form.Text>
                            </Form.Group>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowEditConviteModal(false)}>
                        Cancelar
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSalvarConvite}
                        disabled={salvandoConvite}
                    >
                        {salvandoConvite ? (
                            <>
                                <Spinner as="span" animation="border" size="sm" className="me-2" />
                                Salvando...
                            </>
                        ) : (
                            'Salvar'
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default GerenciarRestaurantes;
