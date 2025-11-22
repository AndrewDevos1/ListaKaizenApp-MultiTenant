import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Alert, Badge, Spinner, Modal, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';

interface User {
    id: number;
    nome: string;
    email: string;
    role: string;
    aprovado: boolean;
    ativo: boolean;
    approving?: boolean;
    actionInProgress?: boolean;
}

const UserManagement: React.FC = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // State for the create user modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newUser, setNewUser] = useState({ nome: '', email: '', senha: '', role: 'COLLABORATOR' });

    // State for the edit user modal
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const fetchUsers = async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await api.get('/admin/users');
            setUsers(response.data);
        } catch (err) {
            setError('Não foi possível carregar os usuários.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

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
        try {
            await api.post('/admin/create_user', newUser);
            setSuccess('Usuário criado com sucesso!');
            setShowCreateModal(false);
            setNewUser({ nome: '', email: '', senha: '', role: 'COLLABORATOR' });
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

    const handleUpdateUser = async () => {
        if (!editingUser) return;
        try {
            // We don't send the password for update
            const { id, nome, email, role } = editingUser;
            await api.put(`/admin/users/${id}`, { nome, email, role });
            setSuccess('Usuário atualizado com sucesso!');
            setShowEditModal(false);
            setEditingUser(null);
            fetchUsers();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao atualizar usuário.');
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

            <div className="d-flex justify-content-between align-items-center mb-3">
                <h2>Gerenciamento de Usuários</h2>
                <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                    <i className="fas fa-plus me-2"></i>Criar Novo Usuário
                </Button>
            </div>

            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}
            
            <Table striped bordered hover responsive>
                <thead className="table-dark">
                    <tr>
                        <th>#</th>
                        <th>Nome</th>
                        <th>Email</th>
                        <th>Perfil</th>
                        <th>Aprovação</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {isLoading ? (
                        <tr>
                            <td colSpan={7} className="text-center"><Spinner animation="border" /></td>
                        </tr>
                    ) : users.map((user: any) => (
                        <tr key={user.id}>
                            <td>{user.id}</td>
                            <td>{user.nome}</td>
                            <td>{user.email}</td>
                            <td>{user.role}</td>
                            <td>
                                <Badge bg={user.aprovado ? "success" : "warning"}>
                                    {user.aprovado ? 'Aprovado' : 'Pendente'}
                                </Badge>
                            </td>
                            <td>
                                <Badge bg={user.ativo ? "success" : "danger"}>
                                    {user.ativo ? 'Ativo' : 'Inativo'}
                                </Badge>
                            </td>
                            <td>
                                {!user.aprovado && (
                                    <Button variant="success" size="sm" onClick={() => handleApprove(user.id)} disabled={user.approving}>
                                        {user.approving ? <Spinner as="span" animation="border" size="sm" /> : 'Aprovar'}
                                    </Button>
                                )}
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
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

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
                        <Form.Group className="mb-3">
                            <Form.Label>Perfil</Form.Label>
                            <Form.Select value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value})}>
                                <option value="COLLABORATOR">Colaborador</option>
                                <option value="ADMIN">Administrador</option>
                            </Form.Select>
                        </Form.Group>
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
                            <Form.Group className="mb-3">
                                <Form.Label>Perfil</Form.Label>
                                <Form.Select value={editingUser.role} onChange={(e) => {
                                    if (editingUser) setEditingUser({...editingUser, role: e.target.value})
                                }}>
                                    <option value="COLLABORATOR">Colaborador</option>
                                    <option value="ADMIN">Administrador</option>
                                </Form.Select>
                            </Form.Group>
                        </Form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancelar</Button>
                        <Button variant="primary" onClick={handleUpdateUser}>Salvar Alterações</Button>
                    </Modal.Footer>
                </Modal>
            )}
        </div>
    );
};

export default UserManagement;
