import React, { useCallback, useEffect, useState } from 'react';
import { Form, InputGroup, Badge, Alert, Spinner, Table } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faCheckCircle, faStore, faBuilding } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';

interface ItemUnificado {
  id: string;
  nome: string;
  unidade: string;
  origem: 'lista_global' | 'fornecedor';
  origem_display: string;
  fornecedor_id: number | null;
  fornecedor_nome: string | null;
  ja_na_lista_global: boolean;
  item_fornecedor_id: number | null;
}

interface Props {
  selectedItems: Map<string, string>;
  onToggleItem: (item: ItemUnificado, quantidadeMinima: string | null) => void;
}

export default function SeletorItensUnificado({ selectedItems, onToggleItem }: Props) {
  const [itens, setItens] = useState<ItemUnificado[]>([]);
  const [itensFiltrados, setItensFiltrados] = useState<ItemUnificado[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroOrigem, setFiltroOrigem] = useState<'all' | 'lista_global' | 'fornecedor'>('all');

  const fetchItens = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/v1/itens/buscar');
      setItens(response.data.itens);
      setItensFiltrados(response.data.itens);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao buscar itens.');
    } finally {
      setLoading(false);
    }
  }, []);

  const aplicarFiltros = useCallback(() => {
    let resultado = itens;

    if (searchTerm) {
      const termo = searchTerm.toLowerCase();
      resultado = resultado.filter((item) =>
        item.nome.toLowerCase().includes(termo)
      );
    }

    if (filtroOrigem !== 'all') {
      resultado = resultado.filter((item) => item.origem === filtroOrigem);
    }

    setItensFiltrados(resultado);
  }, [itens, searchTerm, filtroOrigem]);

  useEffect(() => {
    fetchItens();
  }, [fetchItens]);

  useEffect(() => {
    aplicarFiltros();
  }, [aplicarFiltros]);

  const handleQuantidadeChange = (itemId: string, quantidade: string | null) => {
    const item = itens.find((i) => i.id === itemId);
    if (item) {
      onToggleItem(item, quantidade);
    }
  };

  const getOrigemBadge = (item: ItemUnificado) => {
    if (item.origem === 'lista_global') {
      return (
        <Badge bg="success">
          <FontAwesomeIcon icon={faBuilding} className="me-1" />
          {item.origem_display}
        </Badge>
      );
    }

    return (
      <>
        <Badge bg="primary">
          <FontAwesomeIcon icon={faStore} className="me-1" />
          {item.origem_display}
        </Badge>
        {item.ja_na_lista_global && (
          <Badge bg="success" className="ms-1">
            <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
            Já na lista global
          </Badge>
        )}
      </>
    );
  };

  return (
    <div>
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="mb-3">
        <InputGroup className="mb-2">
          <InputGroup.Text>
            <FontAwesomeIcon icon={faSearch} />
          </InputGroup.Text>
          <Form.Control
            type="text"
            placeholder="Buscar por nome do item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>

        <Form.Select
          value={filtroOrigem}
          onChange={(e) => setFiltroOrigem(e.target.value as 'all' | 'lista_global' | 'fornecedor')}
        >
          <option value="all">Todas as Origens</option>
          <option value="lista_global">Somente Lista Global</option>
          <option value="fornecedor">Somente Fornecedores</option>
        </Form.Select>
      </div>

      {loading ? (
        <div className="text-center py-4">
          <Spinner animation="border" />
          <p className="mt-2">Carregando itens...</p>
        </div>
      ) : itensFiltrados.length === 0 ? (
        <Alert variant="info">
          Nenhum item encontrado. {searchTerm && 'Tente ajustar os filtros.'}
        </Alert>
      ) : (
        <div
          style={{
            maxHeight: '400px',
            overflowY: 'auto',
            border: '1px solid #dee2e6',
            borderRadius: '4px'
          }}
        >
          <Table hover className="mb-0">
            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1 }}>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>Item</th>
                <th>Unidade</th>
                <th>Origem</th>
                <th style={{ width: '120px' }}>Qtd. Mín.</th>
              </tr>
            </thead>
            <tbody>
              {itensFiltrados.map((item) => {
                const isSelected = selectedItems.has(item.id);
                const quantidade = selectedItems.get(item.id) ?? '1';

                return (
                  <tr key={item.id} style={{ backgroundColor: isSelected ? '#e7f3ff' : 'transparent' }}>
                    <td>
                      <Form.Check
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleQuantidadeChange(item.id, '1');
                          } else {
                            handleQuantidadeChange(item.id, null);
                          }
                        }}
                      />
                    </td>
                    <td>
                      <strong>{item.nome}</strong>
                    </td>
                    <td>{item.unidade}</td>
                    <td>{getOrigemBadge(item)}</td>
                    <td>
                      {isSelected && (
                        <Form.Control
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={quantidade}
                          onChange={(e) => handleQuantidadeChange(item.id, e.target.value)}
                          size="sm"
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}

      <div className="mt-2 text-muted">
        <small>
          Mostrando {itensFiltrados.length} de {itens.length} itens |{' '}
          {selectedItems.size} selecionados
        </small>
      </div>
    </div>
  );
}
