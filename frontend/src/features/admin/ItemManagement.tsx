import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface Item {
    id: number;
    nome: string;
    unidade_medida: string;
    fornecedor_id: number;
}

interface Fornecedor {
    id: number;
    nome: string;
}

const ItemManagement: React.FC = () => {
    const [items, setItems] = useState<Item[]>([]);
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
    const [currentItem, setCurrentItem] = useState<Partial<Item> | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    const fetchItems = async () => {
        const response = await api.get('/v1/items');
        setItems(response.data);
    };

    const fetchFornecedores = async () => {
        const response = await api.get('/v1/fornecedores');
        setFornecedores(response.data);
    };

    useEffect(() => {
        fetchItems();
        fetchFornecedores();
    }, []);

    const handleEdit = (item: Item) => {
        setCurrentItem(item);
        setIsEditing(true);
    };

    const handleDelete = async (id: number) => {
        await api.delete(`/v1/items/${id}`);
        fetchItems();
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentItem?.nome || !currentItem?.unidade_medida || !currentItem?.fornecedor_id) return;

        if (isEditing) {
            await api.put(`/v1/items/${currentItem.id}`, currentItem);
        } else {
            await api.post('/v1/items', currentItem);
        }
        fetchItems();
        setCurrentItem(null);
        setIsEditing(false);
    };

    return (
        <div>
            <h3>Gerenciar Itens</h3>
            
            <form onSubmit={handleFormSubmit}>
                <input 
                    type="text" 
                    placeholder="Nome do item" 
                    value={currentItem?.nome || ''} 
                    onChange={e => setCurrentItem({...currentItem, nome: e.target.value})} 
                />
                <input 
                    type="text" 
                    placeholder="Unidade de Medida" 
                    value={currentItem?.unidade_medida || ''} 
                    onChange={e => setCurrentItem({...currentItem, unidade_medida: e.target.value})} 
                />
                <select
                    value={currentItem?.fornecedor_id || ''}
                    onChange={e => setCurrentItem({...currentItem, fornecedor_id: parseInt(e.target.value, 10)})}
                    required
                >
                    <option value="" disabled>Selecione um fornecedor</option>
                    {fornecedores.map(f => (
                        <option key={f.id} value={f.id}>{f.nome}</option>
                    ))}
                </select>
                <button type="submit">{isEditing ? 'Atualizar' : 'Adicionar'}</button>
                {isEditing && <button onClick={() => { setIsEditing(false); setCurrentItem(null); }}>Cancelar</button>}
            </form>

            <table>
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Unidade</th>
                        <th>Fornecedor</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map(item => (
                        <tr key={item.id}>
                            <td>{item.nome}</td>
                            <td>{item.unidade_medida}</td>
                            <td>{fornecedores.find(f => f.id === item.fornecedor_id)?.nome || 'N/A'}</td>
                            <td>
                                <button onClick={() => handleEdit(item)}>Editar</button>
                                <button onClick={() => handleDelete(item.id)}>Deletar</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ItemManagement;
