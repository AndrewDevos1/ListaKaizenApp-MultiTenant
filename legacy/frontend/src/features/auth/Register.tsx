import React, { useState } from 'react';
import api from '../../services/api';

const Register: React.FC = () => {
    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [tokenAdmin, setTokenAdmin] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        try {
            const response = await api.post('/auth/register', {
                nome,
                email,
                senha,
                token_admin: tokenAdmin || undefined  // Envia apenas se preenchido
            });
            setMessage(response.data.message);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao enviar solicitação');
        }
    };

    if (message) {
        return (
            <div>
                <h2>Solicitação Enviada</h2>
                <p>{message}</p>
            </div>
        );
    }

    return (
        <div>
            <h2>Solicitar Cadastro</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Nome:</label>
                    <input 
                        type="text" 
                        value={nome} 
                        onChange={(e) => setNome(e.target.value)} 
                        required 
                    />
                </div>
                <div>
                    <label>Email:</label>
                    <input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                    />
                </div>
                <div>
                    <label>Senha:</label>
                    <input
                        type="password"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Token de Admin (opcional):</label>
                    <input
                        type="password"
                        value={tokenAdmin}
                        onChange={(e) => setTokenAdmin(e.target.value)}
                        placeholder="Deixe vazio se for colaborador"
                    />
                    <small style={{ display: 'block', color: '#666', marginTop: '0.25rem' }}>
                        Se você possui um token de administrador, insira-o aqui para ser aprovado automaticamente como admin.
                    </small>
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <button type="submit">Enviar Solicitação</button>
            </form>
        </div>
    );
};

export default Register;
