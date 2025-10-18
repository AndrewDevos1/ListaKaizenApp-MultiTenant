import React, { useState, useEffect } from 'react';
import api from '../../services/api';

interface Area {
    id: number;
    nome: string;
}

const AreaManagement: React.FC = () => {
    const [areas, setAreas] = useState<Area[]>([]);
    const [currentArea, setCurrentArea] = useState<Partial<Area> | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    const fetchAreas = async () => {
        const response = await api.get('/v1/areas');
        setAreas(response.data);
    };

    useEffect(() => {
        fetchAreas();
    }, []);

    const handleEdit = (area: Area) => {
        setCurrentArea(area);
        setIsEditing(true);
    };

    const handleDelete = async (id: number) => {
        await api.delete(`/v1/areas/${id}`);
        fetchAreas();
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentArea?.nome) return;

        if (isEditing) {
            await api.put(`/v1/areas/${currentArea.id}`, currentArea);
        } else {
            await api.post('/v1/areas', currentArea);
        }
        fetchAreas();
        setCurrentArea(null);
        setIsEditing(false);
    };

    return (
        <div>
            <h3>Gerenciar Áreas</h3>
            
            <form onSubmit={handleFormSubmit}>
                <input 
                    type="text" 
                    placeholder="Nome da área" 
                    value={currentArea?.nome || ''} 
                    onChange={e => setCurrentArea({...currentArea, nome: e.target.value})} 
                />
                <button type="submit">{isEditing ? 'Atualizar' : 'Adicionar'}</button>
                {isEditing && <button onClick={() => { setIsEditing(false); setCurrentArea(null); }}>Cancelar</button>}
            </form>

            <table>
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {areas.map(area => (
                        <tr key={area.id}>
                            <td>{area.nome}</td>
                            <td>
                                <button onClick={() => handleEdit(area)}>Editar</button>
                                <button onClick={() => handleDelete(area.id)}>Deletar</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default AreaManagement;
