import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface Fornecedor {
    id: number;
    nome: string;
    contato: string;
    meio_envio: string;
}

const FornecedorManagement: React.FC = () => {
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
    const [currentFornecedor, setCurrentFornecedor] = useState<Partial<Fornecedor> | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    const fetchFornecedores = async () => {
        const response = await api.get('/v1/fornecedores');
        setFornecedores(response.data);
    };

    useEffect(() => {
        fetchFornecedores();
    }, []);

    const handleEdit = (fornecedor: Fornecedor) => {
        setCurrentFornecedor(fornecedor);
        setIsEditing(true);
    };

    const handleDelete = async (id: number) => {
        await api.delete(`/v1/fornecedores/${id}`);
        fetchFornecedores();
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentFornecedor?.nome) return;

        if (isEditing) {
            await api.put(`/v1/fornecedores/${currentFornecedor.id}`, currentFornecedor);
        } else {
            await api.post('/v1/fornecedores', currentFornecedor);
        }
        fetchFornecedores();
        setCurrentFornecedor(null);
        setIsEditing(false);
    };

    return (
        <div>
            <h3>Gerenciar Fornecedores</h3>
            
            <form onSubmit={handleFormSubmit}>
                <input 
                    type="text" 
                    placeholder="Nome do fornecedor" 
                    value={currentFornecedor?.nome || ''} 
                    onChange={e => setCurrentFornecedor({...currentFornecedor, nome: e.target.value})} 
                />
                <input 
                    type="text" 
                    placeholder="Contato" 
                    value={currentFornecedor?.contato || ''} 
                    onChange={e => setCurrentFornecedor({...currentFornecedor, contato: e.target.value})} 
                />
                <input 
                    type="text" 
                    placeholder="Meio de Envio" 
                    value={currentFornecedor?.meio_envio || ''} 
                    onChange={e => setCurrentFornecedor({...currentFornecedor, meio_envio: e.target.value})} 
                />
                <button type="submit">{isEditing ? 'Atualizar' : 'Adicionar'}</button>
                {isEditing && <button onClick={() => { setIsEditing(false); setCurrentFornecedor(null); }}>Cancelar</button>}
            </form>

            <table>
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Contato</th>
                        <th>Meio de Envio</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {fornecedores.map(f => (
                        <tr key={f.id}>
                            <td>{f.nome}</td>
                            <td>{f.contato}</td>
                            <td>{f.meio_envio}</td>
                            <td>
                                <button onClick={() => handleEdit(f)}>Editar</button>
                                <button onClick={() => handleDelete(f.id)}>Deletar</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default FornecedorManagement;
