import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Alert, Badge, Spinner, Modal, Form, Card, Row, Col } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCopy, faUserPlus, faKey, faRandom, faPlus, faRightLeft } from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ResponsiveTable from '../../components/ResponsiveTable';

interface User {
    id: number;
    nome: string;
    email: string;
    role: string;
    aprovado: boolean;
    ativo: boolean;
    restaurante_id?: number | null;
    restaurante_nome?: string | null;
    approving?: boolean;
    actionInProgress?: boolean;
}

interface Restaurante {
    id: number;
    nome: string;
    slug: string;
    ativo: boolean;
}

const UserManagement: React.FC = () => {
    const navigate = useNavigate();
    const { user: authUser } = useAuth();
    const isSuperAdmin = authUser?.role === 'SUPER_ADMIN';
    const [users, setUsers] = useState<User[]>([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [restaurantes, setRestaurantes] = useState<Restaurante[]>([]);
    const [restauranteFiltro, setRestauranteFiltro] = useState<string>('all');
    const [loadingRestaurantes, setLoadingRestaurantes] = useState(false);

    // State for the create user modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newUser, setNewUser] = useState({
        nome: '',
        email: '',
        senha: '',
        role: 'COLLABORATOR',
        restaurante_id: ''
    });

    // State for the edit user modal
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const [showAssignModal, setShowAssignModal] = useState(false);
    const [userToAssign, setUserToAssign] = useState<User | null>(null);
    const [novoRestauranteId, setNovoRestauranteId] = useState<string>('');

    // Estados para alterar senha
    const [showAlterarSenhaModal, setShowAlterarSenhaModal] = useState(false);
    const [novaSenhaInput, setNovaSenhaInput] = useState('');

    // Estados para copiar credenciais
    const [showCopiarModal, setShowCopiarModal] = useState(false);
    const [textoCopiar, setTextoCopiar] = useState('');

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const params: Record<string, string> = {};
            if (isSuperAdmin && restauranteFiltro !== 'all') {
                params.restaurante_id = restauranteFiltro;
            }
            const response = await api.get('/admin/users', { params });
            setUsers(response.data);
        } catch (err) {
            setError('Não foi possível carregar os usuários.');
        } finally {
            setIsLoading(false);
        }
    }, [isSuperAdmin, restauranteFiltro]);

    const fetchRestaurantes = useCallback(async () => {
        if (!isSuperAdmin) return;
        setLoadingRestaurantes(true);
        try {
            const response = await api.get('/admin/restaurantes');
            setRestaurantes(response.data.restaurantes || []);
        } catch (err) {
            setError('Não foi possível carregar os restaurantes.');
        } finally {
            setLoadingRestaurantes(false);
        }
    }, [isSuperAdmin]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        fetchRestaurantes();
    }, [fetchRestaurantes]);

    const handleApprove = async (userId: number) => {
        const originalUsers = [...users];
        setUsers(users.map(u => u.id === userId ? { ...u, approving: true } : u));

        try {
            await api.post(`/admin/users/${userId}/approve`);
            setSuccess('Usuário aprovado com sucesso!');
            setError('');
            fetchUsers(); 
        } catch (err) {
            setError('Erro ao aprovar usuário.');
            setSuccess('');
            setUsers(originalUsers);
        }
    };

    const handleCreateUser = async () => {
        if (!newUser.nome || !newUser.email || !newUser.senha) {
            setError('Por favor, preencha todos os campos.');
            return;
        }
        if (isSuperAdmin && !newUser.restaurante_id) {
            setError('Selecione um restaurante.');
            return;
        }
        try {
            const payload = {
                nome: newUser.nome,
                email: newUser.email,
                senha: newUser.senha,
                role: newUser.role,
                restaurante_id: newUser.restaurante_id || undefined
            };

            if (isSuperAdmin && newUser.role === 'ADMIN') {
                await api.post('/admin/users/criar-admin-restaurante', payload);
            } else {
                await api.post('/admin/create_user', payload);
            }
            setSuccess('Usuário criado com sucesso!');
            setShowCreateModal(false);
            setNewUser({ nome: '', email: '', senha: '', role: 'COLLABORATOR', restaurante_id: '' });
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao criar usuário.');
        }
    };

    const handleDelete = async (userId: number) => {
        if (!window.confirm('Tem certeza que deseja deletar este usuário? Esta ação não pode ser desfeita.')) {
            return;
        }
        try {
            await api.delete(`/admin/users/${userId}`);
            setSuccess('Usuário deletado com sucesso!');
            setError('');
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao deletar usuário.');
            setSuccess('');
        }
    };

    const handleDeactivate = async (userId: number) => {
        try {
            await api.post(`/admin/users/${userId}/deactivate`);
            setSuccess('Usuário desativado com sucesso!');
            setError('');
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao desativar usuário.');
            setSuccess('');
        }
    };

    const handleReactivate = async (userId: number) => {
        try {
            await api.post(`/admin/users/${userId}/reactivate`);
            setSuccess('Usuário reativado com sucesso!');
            setError('');
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao reativar usuário.');
            setSuccess('');
        }
    };

    const handleEditClick = (user: User) => {
        setEditingUser(user);
        setShowEditModal(true);
    };

    const handleOpenAssignModal = (user: User) => {
        setUserToAssign(user);
        setNovoRestauranteId(user.restaurante_id ? String(user.restaurante_id) : '');
        setShowAssignModal(true);
    };

    const handleAssignRestaurante = async () => {
        if (!userToAssign || !novoRestauranteId) {
            setError('Selecione um restaurante válido.');
            return;
        }
        try {
            await api.put(`/admin/users/${userToAssign.id}/atribuir-restaurante`, {
                restaurante_id: Number(novoRestauranteId)
            });
            setSuccess('Restaurante atualizado com sucesso!');
            setShowAssignModal(false);
            setUserToAssign(null);
            setNovoRestauranteId('');
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao atribuir restaurante.');
        }
    };

    const handleUpdateUser = async () => {
        if (!editingUser) return;
        try {
            // We don't send the password for update
            const { id, nome, email, role, restaurante_id } = editingUser;
            const payload: Record<string, any> = { nome, email, role };
            if (isSuperAdmin) {
                payload.restaurante_id = restaurante_id;
            }
            await api.put(`/admin/users/${id}`, payload);
            setSuccess('Usuário atualizado com sucesso!');
            setShowEditModal(false);
            setEditingUser(null);
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao atualizar usuário.');
        }
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
                console.warn('[UserManagement] Falha ao copiar via clipboard:', error);
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
            console.warn('[UserManagement] Falha ao copiar via execCommand:', error);
            return false;
        } finally {
            document.body.removeChild(textarea);
        }
    };

    const handleCopiar = async (userId: number) => {
        try {
            const response = await api.get(`/admin/users/${userId}/compartilhar-whatsapp`);
            const texto = response.data.texto as string;

            const copiado = await copiarTexto(texto);
            if (!copiado) {
                abrirModalCopiar(texto);
            }
            setError('');
            setSuccess(copiado ? 'Texto copiado para a área de transferência!' : 'Texto gerado. Copie manualmente.');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao copiar texto');
            setSuccess('');
        }
    };

    const handleCompartilharWhatsApp = async (userId: number) => {
        const popup = window.open('about:blank', '_blank');

        try {
            const response = await api.get(`/admin/users/${userId}/compartilhar-whatsapp`);
            const texto = response.data.texto as string;

            // Copiar para clipboard
            const copiado = await copiarTexto(texto);

            // Abrir WhatsApp Web com encoding que preserva emojis
            const url = new URL('https://wa.me/');
            url.searchParams.set('text', texto);
            if (popup) {
                popup.location.href = url.toString();
            } else {
                window.location.href = url.toString();
            }

            setError('');
            setSuccess(copiado ? 'Texto copiado e WhatsApp aberto!' : 'WhatsApp aberto. Copie o texto manualmente.');
            if (!copiado) {
                abrirModalCopiar(texto);
            }
        } catch (err: any) {
            if (popup) {
                popup.close();
            }
            setError(err.response?.data?.error || 'Erro ao gerar texto para WhatsApp');
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

    const handleAlterarSenha = async () => {
        if (!editingUser || !novaSenhaInput.trim()) {
            setError('Digite uma nova senha.');
            return;
        }

        if (novaSenhaInput.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        try {
            await api.put(`/admin/usuarios/${editingUser.id}/alterar-senha`, {
                nova_senha: novaSenhaInput
            });
            setSuccess('Senha alterada com sucesso!');
            setShowAlterarSenhaModal(false);
            setNovaSenhaInput('');
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao alterar senha.');
        }
    };

    const handleResetarSenha = async () => {
        if (!editingUser) return;

        if (!window.confirm(`Resetar senha de ${editingUser.nome} para senha aleatória?`)) {
            return;
        }

        try {
            const response = await api.post(`/admin/usuarios/${editingUser.id}/resetar-senha`);
            setSuccess(`Senha resetada! Nova senha: ${response.data.nova_senha}`);
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao resetar senha.');
        }
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
                <div>
                    <h2>Gerenciamento de Usuários</h2>
                    {isSuperAdmin && (
                        <div className="d-flex align-items-center gap-2 mt-2">
                            <Form.Label className="mb-0">Filtrar por restaurante:</Form.Label>
                            <Form.Select
                                size="sm"
                                value={restauranteFiltro}
                                onChange={(e) => setRestauranteFiltro(e.target.value)}
                                disabled={loadingRestaurantes}

                            >
                                <option value="all">Todos</option>
                                {restaurantes.map((rest) => (
                                    <option key={rest.id} value={rest.id}>
                                        {rest.nome}
                                    </option>
                                ))}
                            </Form.Select>
                        </div>
                    )}
                </div>
                <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                    <FontAwesomeIcon icon={faPlus} className="me-2" />Criar Novo Usuário
                </Button>
            </div>

            {/* Convite Card */}
            <Row className="mb-4">
                <Col md={6} lg={4}>
                    <Card
                        className="shadow-sm border-0 h-100"
                        style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-5px)';
                            e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                        }}
                        onClick={() => navigate('/admin/convites')}
                    >
                        <Card.Body className="text-center">
                            <div className="mb-3">
                                <FontAwesomeIcon icon={faUserPlus} size="3x" className="text-primary" />
                            </div>
                            <h5 className="card-title">Convidar Usuário</h5>
                            <p className="text-muted mb-0">
                                Gere um link de convite para novos usuários
                            </p>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

            {isLoading ? (
                <div className="text-center p-4">
                    <Spinner animation="border" />
                </div>
            ) : (
                <ResponsiveTable
                    data={users}
                    columns={[
                        { header: '#', accessor: 'id' },
                        { header: 'Nome', accessor: 'nome' },
                        { header: 'Email', accessor: 'email' },
                        { header: 'Perfil', accessor: 'role' },
                        ...(isSuperAdmin ? [{
                            header: 'Restaurante',
                            accessor: (user: User) => user.restaurante_nome || '-'
                        }] : []),
                        {
                            header: 'Aprovação',
                            accessor: (user: User) => (
                                <Badge bg={user.aprovado ? "success" : "warning"}>
                                    {user.aprovado ? 'Aprovado' : 'Pendente'}
                                </Badge>
                            )
                        },
                        {
                            header: 'Status',
                            accessor: (user: User) => (
                                <Badge bg={user.ativo ? "success" : "danger"}>
                                    {user.ativo ? 'Ativo' : 'Inativo'}
                                </Badge>
                            )
                        }
                    ]}
                    keyExtractor={(user) => user.id.toString()}
                    renderActions={(user) => (
                        <>
                            {!user.aprovado && (
                                <Button variant="success" size="sm" onClick={() => handleApprove(user.id)} disabled={user.approving}>
                                    {user.approving ? <Spinner as="span" animation="border" size="sm" /> : 'Aprovar'}
                                </Button>
                            )}
                            {isSuperAdmin && user.role !== 'SUPER_ADMIN' && (
                                <Button
                                    variant="info"
                                    size="sm"
                                    className={!user.aprovado ? "ms-2" : ""}
                                    onClick={() => handleOpenAssignModal(user)}
                                    title="Alterar restaurante"
                                >
                                    <FontAwesomeIcon icon={faRightLeft} className="me-2" />Alterar
                                </Button>
                            )}
                            <Button
                                variant="outline-secondary"
                                size="sm"
                                className={!user.aprovado ? "ms-2" : ""}
                                onClick={() => handleCopiar(user.id)}
                                title="Copiar credenciais"
                            >
                                <FontAwesomeIcon icon={faCopy} className="me-1" />Copiar
                            </Button>
                            <Button
                                variant="success"
                                size="sm"
                                className="ms-2"
                                onClick={() => handleCompartilharWhatsApp(user.id)}
                                title="Compartilhar credenciais via WhatsApp"
                            >
                                <FontAwesomeIcon icon={faWhatsapp} className="me-1" />WhatsApp
                            </Button>
                            <Button variant="warning" size="sm" className="ms-2" onClick={() => handleEditClick(user)}>
                                Editar
                            </Button>
                            {user.ativo ? (
                                <Button variant="secondary" size="sm" className="ms-2" onClick={() => handleDeactivate(user.id)}>
                                    Desativar
                                </Button>
                            ) : (
                                <Button variant="info" size="sm" className="ms-2" onClick={() => handleReactivate(user.id)}>
                                    Reativar
                                </Button>
                            )}
                            <Button variant="danger" size="sm" className="ms-2" onClick={() => handleDelete(user.id)}>
                                Deletar
                            </Button>
                        </>
                    )}
                    emptyMessage="Nenhum usuário encontrado."
                />
            )}

            {/* Create User Modal */}
            <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Criar Novo Usuário</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Nome</Form.Label>
                            <Form.Control type="text" value={newUser.nome} onChange={(e) => setNewUser({...newUser, nome: e.target.value})} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Email</Form.Label>
                            <Form.Control type="email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Senha</Form.Label>
                            <Form.Control type="password" value={newUser.senha} onChange={(e) => setNewUser({...newUser, senha: e.target.value})} />
                        </Form.Group>
                        {isSuperAdmin && (
                            <Form.Group className="mb-3">
                                <Form.Label>Restaurante</Form.Label>
                                <Form.Select
                                    value={newUser.restaurante_id}
                                    onChange={(e) => setNewUser({ ...newUser, restaurante_id: e.target.value })}
                                >
                                    <option value="">Selecione um restaurante</option>
                                    {restaurantes.map(rest => (
                                        <option key={rest.id} value={rest.id}>{rest.nome}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        )}
                        {isSuperAdmin && (
                            <Form.Group className="mb-3">
                                <Form.Label>Perfil</Form.Label>
                                <Form.Select value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value})}>
                                    <option value="COLLABORATOR">Colaborador</option>
                                    <option value="ADMIN">Administrador</option>
                                </Form.Select>
                            </Form.Group>
                        )}
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
                    <Button variant="primary" onClick={handleCreateUser}>Salvar Usuário</Button>
                </Modal.Footer>
            </Modal>

            {/* Edit User Modal */}
            {editingUser && (
                <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
                    <Modal.Header closeButton>
                        <Modal.Title>Editar Usuário</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label>Nome</Form.Label>
                                <Form.Control type="text" value={editingUser.nome} onChange={(e) => {
                                    if (editingUser) setEditingUser({...editingUser, nome: e.target.value})
                                }} />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Email</Form.Label>
                                <Form.Control type="email" value={editingUser.email} onChange={(e) => {
                                    if (editingUser) setEditingUser({...editingUser, email: e.target.value})
                                }} />
                            </Form.Group>
                            {isSuperAdmin && (
                                <>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Restaurante</Form.Label>
                                        <Form.Select
                                            value={editingUser.restaurante_id ?? ''}
                                            onChange={(e) => {
                                                if (editingUser) {
                                                    const value = e.target.value ? Number(e.target.value) : null;
                                                    setEditingUser({ ...editingUser, restaurante_id: value });
                                                }
                                            }}
                                        >
                                            <option value="">Selecione um restaurante</option>
                                            {restaurantes.map(rest => (
                                                <option key={rest.id} value={rest.id}>{rest.nome}</option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Perfil</Form.Label>
                                        <Form.Select value={editingUser.role} onChange={(e) => {
                                            if (editingUser) setEditingUser({...editingUser, role: e.target.value})
                                        }}>
                                            <option value="COLLABORATOR">Colaborador</option>
                                            <option value="ADMIN">Administrador</option>
                                        </Form.Select>
                                    </Form.Group>
                                </>
                            )}
                        </Form>
                    </Modal.Body>
                    <Modal.Footer className="d-flex justify-content-between">
                        <div>
                            <Button
                                variant="outline-warning"
                                size="sm"
                                onClick={() => setShowAlterarSenhaModal(true)}
                                className="me-2"
                            >
                                <FontAwesomeIcon icon={faKey} /> Alterar Senha
                            </Button>
                            <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={handleResetarSenha}
                            >
                                <FontAwesomeIcon icon={faRandom} /> Resetar Senha
                            </Button>
                        </div>
                        <div>
                            <Button variant="secondary" onClick={() => setShowEditModal(false)} className="me-2">
                                Cancelar
                            </Button>
                            <Button variant="primary" onClick={handleUpdateUser}>
                                Salvar Alterações
                            </Button>
                        </div>
                    </Modal.Footer>
                </Modal>
            )}

            {isSuperAdmin && (
                <Modal show={showAssignModal} onHide={() => setShowAssignModal(false)}>
                    <Modal.Header closeButton>
                        <Modal.Title>Alterar Restaurante</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label>Restaurante</Form.Label>
                                <Form.Select
                                    value={novoRestauranteId}
                                    onChange={(e) => setNovoRestauranteId(e.target.value)}
                                >
                                    <option value="">Selecione um restaurante</option>
                                    {restaurantes.map(rest => (
                                        <option key={rest.id} value={rest.id}>{rest.nome}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowAssignModal(false)}>Cancelar</Button>
                        <Button variant="primary" onClick={handleAssignRestaurante}>Salvar</Button>
                    </Modal.Footer>
                </Modal>
            )}

            {/* Modal: Alterar Senha Manual */}
            {editingUser && (
                <Modal show={showAlterarSenhaModal} onHide={() => setShowAlterarSenhaModal(false)} centered>
                    <Modal.Header closeButton>
                        <Modal.Title>Alterar Senha - {editingUser.nome}</Modal.Title>
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
            )}

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
        </div>
    );
};

export default UserManagement;
