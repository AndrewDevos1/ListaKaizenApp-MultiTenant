import React, { useState, useEffect } from 'react';
import { Table, Button, Alert, Badge, Spinner } from 'react-bootstrap';
import api from '../../services/api';
import Layout from '../../components/Layout';

interface User {
    id: number;
    nome: string;
    email: string;
    role: string;
    aprovado: boolean;
}

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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
        // Adicionando feedback de carregamento para a ação individual
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
            setUsers(originalUsers); // Reverte em caso de erro
        }
    };

    return (
        <Layout title="Gerenciamento de Usuários">
            {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}
            
            <Table striped bordered hover responsive>
                <thead className="table-dark">
                    <tr>
                        <th>#</th>
                        <th>Nome</th>
                        <th>Email</th>
                        <th>Perfil</th>
                        <th>Status</th>
                        <th>Ação</th>
                    </tr>
                </thead>
                <tbody>
                    {isLoading ? (
                        <tr>
                            <td colSpan={6} className="text-center"><Spinner animation="border" /></td>
                        </tr>
                    ) : users.map((user: any) => ( // Usando any para a propriedade temporária 'approving'
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
                                {!user.aprovado && (
                                    <Button variant="success" size="sm" onClick={() => handleApprove(user.id)} disabled={user.approving}>
                                        {user.approving ? <Spinner as="span" animation="border" size="sm" /> : 'Aprovar'}
                                    </Button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </Layout>
    );
};

export default UserManagement;
