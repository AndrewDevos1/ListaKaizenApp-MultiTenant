import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';

interface EstoqueItem {
    id: number;
    item_id: number;
    area_id: number;
    quantidade_atual: number;
    quantidade_minima: number;
    item: { // Supondo que a API retorne o item aninhado
        id: number;
        nome: string;
        unidade_medida: string;
    };
}

const EstoqueLista: React.FC = () => {
    const { areaId } = useParams<{ areaId: string }>();
    const [estoque, setEstoque] = useState<EstoqueItem[]>([]);
    const [error, setError] = useState('');

    useEffect(() => {
        if (areaId) {
            const fetchEstoque = async () => {
                try {
                    const response = await api.get(`/v1/areas/${areaId}/estoque`);
                    // A API precisa retornar os itens relacionados
                    // Vamos assumir que o backend faz isso
                    setEstoque(response.data);
                } catch (err) {
                    setError('Não foi possível carregar os itens de estoque.');
                }
            };
            fetchEstoque();
        }
    }, [areaId]);

    const handleQuantityChange = (estoqueId: number, novaQuantidade: string) => {
        const updatedEstoque = estoque.map(item => 
            item.id === estoqueId ? { ...item, quantidade_atual: parseFloat(novaQuantidade) || 0 } : item
        );
        setEstoque(updatedEstoque);
    };

    const handleSaveDraft = async () => {
        // Salva as quantidades atuais como rascunho
        for (const item of estoque) {
            try {
                await api.put(`/v1/estoque/${item.id}`, { quantidade_atual: item.quantidade_atual });
            } catch (err) {
                console.error(`Erro ao atualizar item ${item.id}`, err);
                alert(`Falha ao salvar o rascunho para o item: ${item.item.nome}`);
                return;
            }
        }
        alert('Rascunho salvo com sucesso!');
    };

    const handleSubmit = async () => {
        // Primeiro, salva as alterações mais recentes
        await handleSaveDraft();
        // Em seguida, aciona a criação dos pedidos no backend
        try {
            const response = await api.post('/v1/pedidos/submit');
            alert(response.data.message);
        } catch (err) {
            alert('Erro ao submeter a lista.');
        }
    };

    return (
        <div>
            <h2>Preenchimento de Estoque (Área: {areaId})</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <form onSubmit={(e) => { e.preventDefault(); }}>
                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Qtd. Mínima</th>
                            <th>Qtd. Atual</th>
                        </tr>
                    </thead>
                    <tbody>
                        {estoque.length > 0 ? estoque.map(item => (
                            <tr key={item.id}>
                                <td>{item.item?.nome || 'Nome não encontrado'} ({item.item?.unidade_medida})</td>
                                <td>{item.quantidade_minima}</td>
                                <td>
                                    <input 
                                        type="number" 
                                        value={item.quantidade_atual}
                                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                        step="0.01"
                                    />
                                </td>
                            </tr>
                        )) : <tr><td colSpan={3}>Nenhum item de estoque para esta área.</td></tr>}
                    </tbody>
                </table>
                <button type="button" onClick={handleSaveDraft}>Salvar Rascunho</button>
                <button type="button" onClick={handleSubmit}>Submeter Lista</button>
            </form>
        </div>
    );
};

export default EstoqueLista;
