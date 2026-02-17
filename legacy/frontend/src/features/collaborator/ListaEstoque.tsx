/**
 * Lista Estoque - Página para o colaborador gerenciar quantidade atual dos itens
 * Permite apenas a edição de quantidade_atual
 * Mostra o pedido solicitado (quantidade_minima - quantidade_atual) ao lado
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Table, Button, Form, Spinner, Alert, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSave, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import styles from './ListaEstoque.module.css';

interface Item {
    id?: number;
    nome: string;
    unidade: string;
}

interface EstoqueItem {
    id: number;
    item_id: number;
    quantidade_atual: number;
    quantidade_minima: number;
    item?: Item;
    nome?: string;
    unidade?: string;
    changed?: boolean;
}

const ListaEstoque: React.FC = () => {
    const { listaId } = useParams<{ listaId: string }>();
    const navigate = useNavigate();
    const [itens, setItens] = useState<EstoqueItem[]>([]);
    const [originalItens, setOriginalItens] = useState<EstoqueItem[]>([]);
    const [listaNome, setListaNome] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (listaId) {
            fetchEstoque();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [listaId]);

    const fetchEstoque = async () => {
        try {
            setLoading(true);
            setError('');

            // Buscar dados da lista e itens
            const [listaRes, estoqueRes] = await Promise.all([
                api.get(`/collaborator/listas/${listaId}`),
                api.get(`/collaborator/listas/${listaId}/estoque`)
            ]);

            setListaNome(listaRes.data.nome);

            // Processar itens para adicionar propriedade 'changed'
            const itensComStatus = estoqueRes.data.map((item: EstoqueItem) => ({
                ...item,
                nome: item.item?.nome || item.nome,
                unidade: item.item?.unidade || item.unidade,
                changed: false
            }));

            setItens(itensComStatus);
            setOriginalItens(JSON.parse(JSON.stringify(itensComStatus)));
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao carregar itens da lista');
            console.error('Erro:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleQuantityChange = (estoqueId: number, novaQuantidade: string) => {
        const updatedItens = itens.map(item => {
            if (item.id === estoqueId) {
                const originalItem = originalItens.find(oi => oi.id === estoqueId);
                const isChanged = originalItem && originalItem.quantidade_atual !== parseFloat(novaQuantidade);
                return {
                    ...item,
                    quantidade_atual: parseFloat(novaQuantidade) || 0,
                    changed: isChanged
                };
            }
            return item;
        });
        setItens(updatedItens);
    };

    const handleSave = async () => {
        const changedItems = itens.filter(item => item.changed);

        if (changedItems.length === 0) {
            setError('Nenhuma alteração para salvar');
            return;
        }

        try {
            setSaving(true);
            setError('');

            // Fazer requisição para atualizar quantidade_atual de cada item
            await Promise.all(
                changedItems.map(item =>
                    api.put(`/collaborator/estoque/${item.id}`, {
                        quantidade_atual: item.quantidade_atual
                    })
                )
            );

            setSuccess(`${changedItems.length} item(ns) atualizado(s) com sucesso!`);

            // Atualizar originalItens para resetar o estado de 'changed'
            const updatedItensComStatus = itens.map(item => ({
                ...item,
                changed: false
            }));
            setItens(updatedItensComStatus);
            setOriginalItens(JSON.parse(JSON.stringify(updatedItensComStatus)));

            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao salvar alterações');
            console.error('Erro:', err);
        } finally {
            setSaving(false);
        }
    };

    const calculatePedido = (qtdMin: number, qtdAtual: number) => {
        return Math.max(0, qtdMin - qtdAtual);
    };

    const hasChanges = itens.some(item => item.changed);

    if (loading) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Carregando...</span>
                </Spinner>
            </Container>
        );
    }

    return (
        <Container fluid className={styles.container}>
            <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => navigate('/collaborator')}
                className="mb-3"
            >
                <FontAwesomeIcon icon={faArrowLeft} /> Voltar
            </Button>

            <div className={styles.header}>
                <h2>{listaNome}</h2>
                <p>Atualize a quantidade atual dos itens. O pedido será calculado automaticamente.</p>
            </div>

            {error && (
                <Alert variant="danger" onClose={() => setError('')} dismissible>
                    <FontAwesomeIcon icon={faExclamationTriangle} /> {error}
                </Alert>
            )}

            {success && (
                <Alert variant="success" onClose={() => setSuccess('')} dismissible>
                    ✓ {success}
                </Alert>
            )}

            <Card className="mb-3">
                <Table striped bordered hover responsive className={styles.table}>
                    <thead className="table-light">
                        <tr>
                            <th>Item</th>
                            <th className="text-center" style={{ width: '80px' }}>Unidade</th>
                            <th className="text-center" style={{ width: '120px' }}>Qtd Atual</th>
                            <th className="text-center" style={{ width: '100px' }}>Qtd Mín</th>
                            <th className="text-center" style={{ width: '100px' }}>📦 Pedido</th>
                        </tr>
                    </thead>
                    <tbody>
                        {itens.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center text-muted py-4">
                                    Nenhum item na lista
                                </td>
                            </tr>
                        ) : (
                            itens.map((item) => {
                                const pedido = calculatePedido(item.quantidade_minima, item.quantidade_atual);
                                const isLow = item.quantidade_atual < item.quantidade_minima;

                                return (
                                    <tr key={item.id} className={isLow ? styles.warningRow : ''}>
                                        <td className={styles.itemName}>
                                            {item.nome}
                                            {item.changed && <span className={styles.changedBadge}>✎ Alterado</span>}
                                        </td>
                                        <td className="text-center">{item.unidade}</td>
                                        <td className="text-center">
                                            <Form.Control
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                size="sm"
                                                value={item.quantidade_atual}
                                                onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                                className={item.changed ? styles.inputChanged : ''}
                                            />
                                        </td>
                                        <td className="text-center">
                                            <span className={styles.minValue}>{item.quantidade_minima}</span>
                                        </td>
                                        <td className="text-center">
                                            <span className={pedido > 0 ? styles.pedidoAlert : styles.pedidoOk}>
                                                {pedido > 0 ? `⚠️ ${pedido}` : '✓ 0'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </Table>
            </Card>

            {itens.length > 0 && (
                <div className={styles.actions}>
                    <Button
                        variant="outline-secondary"
                        onClick={() => {
                            setItens(JSON.parse(JSON.stringify(originalItens)));
                        }}
                        disabled={!hasChanges || saving}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSave}
                        disabled={!hasChanges || saving}
                    >
                        <FontAwesomeIcon icon={faSave} /> {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                </div>
            )}
        </Container>
    );
};

export default ListaEstoque;
