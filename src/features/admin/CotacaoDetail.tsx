import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';

interface CotacaoItem {
    id: number;
    quantidade: number;
    preco_unitario: number;
    item: {
        nome: string;
        unidade_medida: string;
    };
}

interface Cotacao {
    id: number;
    data_cotacao: string;
    fornecedor: {
        nome: string;
    };
    itens: CotacaoItem[];
}

const CotacaoDetail: React.FC = () => {
    const { cotacaoId } = useParams<{ cotacaoId: string }>();
    const [cotacao, setCotacao] = useState<Cotacao | null>(null);
    const [error, setError] = useState('');

    const fetchCotacao = async () => {
        if (cotacaoId) {
            try {
                const response = await api.get(`/v1/cotacoes/${cotacaoId}`);
                setCotacao(response.data);
            } catch (err) {
                setError('Não foi possível carregar a cotação.');
            }
        }
    };

    useEffect(() => {
        fetchCotacao();
    }, [cotacaoId]);

    const handlePriceChange = (itemId: number, price: string) => {
        if (!cotacao) return;
        const updatedItens = cotacao.itens.map(item => 
            item.id === itemId ? { ...item, preco_unitario: parseFloat(price) || 0 } : item
        );
        setCotacao({ ...cotacao, itens: updatedItens });
    };

    const handleSavePrices = async () => {
        if (!cotacao) return;
        for (const item of cotacao.itens) {
            try {
                await api.put(`/v1/cotacao-items/${item.id}`, { preco_unitario: item.preco_unitario });
            } catch (err) {
                alert(`Erro ao salvar preço para o item ${item.item.nome}`);
                return;
            }
        }
        alert('Preços salvos com sucesso!');
    };

    const calculateTotal = () => {
        return cotacao?.itens.reduce((acc, item) => acc + (item.quantidade * item.preco_unitario), 0).toFixed(2);
    };

    if (error) return <p style={{ color: 'red' }}>{error}</p>;
    if (!cotacao) return <p>Carregando cotação...</p>;

    return (
        <div>
            <h2>Detalhes da Cotação #{cotacao.id}</h2>
            <p><strong>Fornecedor:</strong> {cotacao.fornecedor.nome}</p>
            <p><strong>Data:</strong> {new Date(cotacao.data_cotacao).toLocaleDateString()}</p>

            <table>
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Quantidade</th>
                        <th>Preço Unitário</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    {cotacao.itens.map(item => (
                        <tr key={item.id}>
                            <td>{item.item.nome}</td>
                            <td>{item.quantidade}</td>
                            <td>
                                <input 
                                    type="number"
                                    value={item.preco_unitario}
                                    onChange={e => handlePriceChange(item.id, e.target.value)}
                                    step="0.01"
                                />
                            </td>
                            <td>{(item.quantidade * item.preco_unitario).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr>
                        <td colSpan={3} style={{ textAlign: 'right' }}><strong>Total:</strong></td>
                        <td><strong>R$ {calculateTotal()}</strong></td>
                    </tr>
                </tfoot>
            </table>
            <button onClick={handleSavePrices}>Salvar Preços</button>
        </div>
    );
};

export default CotacaoDetail;
