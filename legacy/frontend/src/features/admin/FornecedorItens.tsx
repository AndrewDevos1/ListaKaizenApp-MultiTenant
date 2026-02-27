import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Button, Form, Table, Alert, Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEdit, faTrash, faFileUpload, faFileLines } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';

interface Item {
  id: number;
  nome: string;
  unidade_medida: string;
  fornecedor_id: number;
}

interface Props {
  fornecedorId: number;
  fornecedorNome: string;
  show: boolean;
  onHide: () => void;
  canManage?: boolean;
}

const UNIDADES_MEDIDA = [
  'kg',
  'g',
  'L',
  'mL',
  'unidade',
  'caixa',
  'pacote',
  'fardo',
  'saco'
];

export default function FornecedorItens({
  fornecedorId,
  fornecedorNome,
  show,
  onHide,
  canManage = true
}: Props) {
  const [itens, setItens] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState({ nome: '', unidade_medida: 'kg' });
  const [importLoading, setImportLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showTextModal, setShowTextModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importTextLoading, setImportTextLoading] = useState(false);

  const fetchItens = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/v1/fornecedores/${fornecedorId}/itens`);
      setItens(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao buscar itens.');
    } finally {
      setLoading(false);
    }
  }, [fornecedorId]);

  useEffect(() => {
    if (show) {
      fetchItens();
    }
  }, [show, fetchItens]);

  const handleOpenItemModal = (item?: Item) => {
    if (!canManage) return;
    if (item) {
      setEditingItem(item);
      setFormData({ nome: item.nome, unidade_medida: item.unidade_medida });
    } else {
      setEditingItem(null);
      setFormData({ nome: '', unidade_medida: 'kg' });
    }
    setShowItemModal(true);
  };

  const handleCloseItemModal = () => {
    setShowItemModal(false);
    setEditingItem(null);
    setFormData({ nome: '', unidade_medida: 'kg' });
    setError(null);
  };

  const handleSubmitItem = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError(null);

      if (editingItem) {
        await api.put(`/v1/fornecedores/itens/${editingItem.id}`,
          formData
        );
        setSuccess('Item atualizado com sucesso!');
      } else {
        await api.post(`/v1/fornecedores/${fornecedorId}/itens`, formData);
        setSuccess('Item criado com sucesso!');
      }

      handleCloseItemModal();
      fetchItens();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao salvar item.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!window.confirm('Tem certeza que deseja deletar este item?')) return;

    try {
      setLoading(true);
      setError(null);
      await api.delete(`/v1/fornecedores/itens/${itemId}`);
      setSuccess('Item deletado com sucesso!');
      fetchItens();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao deletar item.');
    } finally {
      setLoading(false);
    }
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Por favor, selecione um arquivo CSV.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const reader = new FileReader();
    setImportLoading(true);
    setError(null);

    reader.onload = async (e) => {
      try {
        const csvContent = (e.target?.result || '') as string;
        const response = await api.post(
          `/v1/fornecedores/${fornecedorId}/itens/import-csv`,
          csvContent,
          {
            headers: { 'Content-Type': 'text/csv' }
          }
        );
        const data = response.data;
        setSuccess(
          `Importação concluída: ${data.itens_criados} itens criados, ` +
          `${data.itens_atualizados} atualizados, ` +
          `${data.codigos_criados} códigos criados, ` +
          `${data.codigos_atualizados} códigos atualizados.`
        );
        fetchItens();
        setTimeout(() => setSuccess(null), 4000);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Erro ao importar CSV.');
      } finally {
        setImportLoading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.readAsText(file);
  };

  const handleOpenTextModal = () => {
    if (!canManage) return;
    setImportText('');
    setError(null);
    setShowTextModal(true);
  };

  const handleCloseTextModal = () => {
    setShowTextModal(false);
    setImportText('');
  };

  const handleImportText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) {
      setError('Informe ao menos um item para importar.');
      return;
    }

    try {
      setImportTextLoading(true);
      setError(null);
      const response = await api.post(
        `/v1/fornecedores/${fornecedorId}/itens/import-text`,
        { texto: importText }
      );
      const data = response.data;
      setSuccess(
        `Importação concluída: ${data.itens_criados} itens criados, ` +
        `${data.itens_ignorados} ignorados.`
      );
      fetchItens();
      handleCloseTextModal();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao importar texto.');
    } finally {
      setImportTextLoading(false);
    }
  };

  return (
    <>
      <Modal show={show} onHide={onHide} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Catálogo de Itens - {fornecedorNome}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="mb-0">Total: {itens.length} itens</h6>
            {canManage && (
              <div className="d-flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importLoading}
                >
                  {importLoading ? (
                    <Spinner animation="border" size="sm" className="me-2" />
                  ) : (
                    <FontAwesomeIcon icon={faFileUpload} className="me-2" />
                  )}
                  Importar CSV
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={handleOpenTextModal}
                  disabled={importTextLoading}
                >
                  {importTextLoading ? (
                    <Spinner animation="border" size="sm" className="me-2" />
                  ) : (
                    <FontAwesomeIcon icon={faFileLines} className="me-2" />
                  )}
                  Importar Texto
                </Button>
                <Button variant="primary" size="sm" onClick={() => handleOpenItemModal()}>
                  <FontAwesomeIcon icon={faPlus} className="me-2" />
                  Adicionar Item
                </Button>
              </div>
            )}
          </div>
          {canManage && (
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportCSV}
              accept=".csv"
              style={{ display: 'none' }}
            />
          )}

          {loading && itens.length === 0 ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
            </div>
          ) : itens.length === 0 ? (
            <Alert variant="info">
              Nenhum item cadastrado ainda.
            </Alert>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Unidade</th>
                    {canManage && <th style={{ width: '120px' }}>Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => (
                    <tr key={item.id}>
                      <td>{item.nome}</td>
                      <td>{item.unidade_medida}</td>
                      {canManage && (
                        <td>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-2"
                            onClick={() => handleOpenItemModal(item)}
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Fechar
          </Button>
        </Modal.Footer>
      </Modal>

      {canManage && (
        <Modal show={showItemModal} onHide={handleCloseItemModal}>
          <Modal.Header closeButton>
            <Modal.Title>{editingItem ? 'Editar Item' : 'Adicionar Item'}</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleSubmitItem}>
            <Modal.Body>
              {error && (
                <Alert variant="danger" dismissible onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}

              <Form.Group className="mb-3">
                <Form.Label>Nome do Item *</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ex: Arroz Branco 5kg"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Unidade de Medida *</Form.Label>
                <Form.Select
                  value={formData.unidade_medida}
                  onChange={(e) => setFormData({ ...formData, unidade_medida: e.target.value })}
                  required
                >
                  {UNIDADES_MEDIDA.map((unidade) => (
                    <option key={unidade} value={unidade}>
                      {unidade}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleCloseItemModal}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" disabled={loading}>
                {loading ? <Spinner animation="border" size="sm" /> : (editingItem ? 'Salvar' : 'Criar')}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      )}

      {canManage && (
        <Modal show={showTextModal} onHide={handleCloseTextModal}>
          <Modal.Header closeButton>
            <Modal.Title>Importar Itens por Texto</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleImportText}>
            <Modal.Body>
              {error && (
                <Alert variant="danger" dismissible onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}
              <Alert variant="info">
                Cole uma lista com um item por linha. A linha \"Produto\" sera ignorada.
              </Alert>
              <Form.Group>
                <Form.Label>Itens</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={10}
                  placeholder="Produto\nITEM 1\nITEM 2"
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  required
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleCloseTextModal}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" disabled={importTextLoading}>
                {importTextLoading ? <Spinner animation="border" size="sm" /> : 'Importar'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      )}
    </>
  );
}
