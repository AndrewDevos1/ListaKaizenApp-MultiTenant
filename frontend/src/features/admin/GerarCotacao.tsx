import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

interface Fornecedor {
    id: number;
    nome: string;
}

const GerarCotacao: React.FC = () => {
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
    const [selectedFornecedor, setSelectedFornecedor] = useState<string>('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchFornecedores = async () => {
            const response = await api.get('/v1/fornecedores');
            setFornecedores(response.data);
        };
        fetchFornecedores();
    }, []);

    const handleGenerate = async () => {
        if (!selectedFornecedor) {
            setError('Por favor, selecione um fornecedor.');
            return;
        }
        setError('');
        setMessage('');
        try {
            const response = await api.post(`/v1/cotacoes`, { fornecedor_id: selectedFornecedor });
            if (response.status === 201) {
                // Redireciona para a página de detalhes da nova cotação
                navigate(`/admin/cotacoes/${response.data.id}`);
            } else {
                setMessage(response.data.message || 'Nenhuma ação necessária.');
            }
        } catch (err) {
            setError('Erro ao gerar a cotação.');
        }
    };

    return (
        <div>
            <h3>Gerar Nova Cotação</h3>
            <p>Selecione um fornecedor para verificar a necessidade de estoque e gerar uma nova cotação.</p>
            <div>
                <select 
                    value={selectedFornecedor}
                    onChange={e => setSelectedFornecedor(e.target.value)}
                >
                    <option value="" disabled>Selecione um fornecedor</option>
                    {fornecedores.map(f => (
                        <option key={f.id} value={f.id}>{f.nome}</option>
                    ))}
                </select>
                <button onClick={handleGenerate}>Gerar Cotação</button>
            </div>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {message && <p>{message}</p>}
        </div>
    );
};

export default GerarCotacao;
