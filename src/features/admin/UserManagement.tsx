import React, { useState, useEffect } from 'react';
import api from '../../services/api';

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

    const fetchUsers = async () => {
        try {
            const response = await api.get('/admin/users');
            setUsers(response.data);
        } catch (err) {
            setError('Não foi possível carregar os usuários.');
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleApprove = async (userId: number) => {
        try {
            await api.post(`/admin/users/${userId}/approve`);
            // Atualiza a lista de usuários após aprovação
            fetchUsers(); 
        } catch (err) {
            alert('Erro ao aprovar usuário.');
        }
    };

    return (
        <div>
            <h2>Gerenciamento de Usuários</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <table>
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Ação</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user.id}>
                            <td>{user.nome}</td>
                            <td>{user.email}</td>
                            <td>{user.role}</td>
                            <td>{user.aprovado ? 'Aprovado' : 'Pendente'}</td>
                            <td>
                                {!user.aprovado && (
                                    <button onClick={() => handleApprove(user.id)}>Aprovar</button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default UserManagement;
