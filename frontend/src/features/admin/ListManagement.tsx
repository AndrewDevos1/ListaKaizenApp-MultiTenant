import React, { useState, useEffect } from 'react';
import { Button, Table, Modal, Form, Spinner, Alert } from 'react-bootstrap';
import Layout from '../../components/Layout';
import { api } from '../../services/api';

interface Lista {
  id: number;
  nome: string;
  colaboradores: { id: number; nome: string }[];
}

interface User {
  id: number;
  nome: string;
  role: string;
}

const ListManagement: React.FC = () => {
  const [listas, setListas] = useState<Lista[]>([]);
  const [colaboradores, setColaboradores] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados para o Modal de Criação
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState('');

  // Estados para o Modal de Atribuição
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedLista, setSelectedLista] = useState<Lista | null>(null);
  const [selectedColaboradores, setSelectedColaboradores] = useState<number[]>([]);

  const fetchListas = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/v1/listas');
      setListas(response.data);
      setError(null);
    } catch (err) {
      setError('Falha ao carregar as listas.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchColaboradores = async () => {
    try {
      const response = await api.get('/api/admin/users');
      // Filtra para pegar apenas colaboradores
      setColaboradores(response.data.filter((user: User) => user.role === 'COLLABORATOR'));
    } catch (err) {
      console.error('Falha ao carregar colaboradores.');
      // Pode-se definir um erro específico para colaboradores se necessário
    }
  };

  useEffect(() => {
    fetchListas();
    fetchColaboradores();
  }, []);

  const handleCreateLista = async () => {
    if (!newListName.trim()) {
        setError("O nome da lista não pode estar em branco.");
        return;
    }
    try {
        await api.post('/api/v1/listas', { nome: newListName });
        setSuccess('Lista criada com sucesso!');
        setShowCreateModal(false);
        setNewListName('');
        fetchListas(); // Recarrega a lista
    } catch (err: any) {
        setError(err.response?.data?.error || 'Erro ao criar a lista.');
    }
  };

  const handleAssignColaboradores = async () => {
    if (!selectedLista) return;

    try {
        await api.post(`/api/v1/listas/${selectedLista.id}/assign`, { colaborador_ids: selectedColaboradores });
        setSuccess('Colaboradores atribuídos com sucesso!');
        setShowAssignModal(false);
        setSelectedLista(null);
        setSelectedColaboradores([]);
        fetchListas(); // Recarrega a lista para mostrar as mudanças
    } catch (err: any) {
        setError(err.response?.data?.error || 'Erro ao atribuir colaboradores.');
    }
  };

  return (
    <Layout>
      <h2>Gestão de Listas de Compras</h2>
      <Button variant="primary" onClick={() => setShowCreateModal(true)} className="mb-3">
        <i className="fas fa-plus me-2"></i>Criar Nova Lista
      </Button>

      {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess(null)} dismissible>{success}</Alert>}

      {isLoading ? (
        <div className="text-center"><Spinner animation="border" /></div>
      ) : (
        <Table striped bordered hover responsive>
          <thead className="table-dark">
            <tr>
              <th>#</th>
              <th>Nome da Lista</th>
              <th>Colaboradores Atribuídos</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {listas.length > 0 ? listas.map(lista => (
              <tr key={lista.id}>
                <td>{lista.id}</td>
                <td>{lista.nome}</td>
                <td>{lista.colaboradores.map(c => c.nome).join(', ') || 'Nenhum'}</td>
                <td>
                  <Button 
                    variant="info"
                    size="sm" 
                    onClick={() => {
                      setSelectedLista(lista);
                      setSelectedColaboradores(lista.colaboradores.map(c => c.id));
                      setShowAssignModal(true);
                    }}
                  >
                    <i className="fas fa-user-plus me-2"></i>Atribuir
                  </Button>
                </td>
              </tr>
            )) : (
                <tr>
                    <td colSpan={4} className="text-center text-muted">Nenhuma lista encontrada.</td>
                </tr>
            )}
          </tbody>
        </Table>
      )}

      {/* Modal de Criação */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Criar Nova Lista</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={(e) => { e.preventDefault(); handleCreateLista(); }}>
            <Form.Group>
              <Form.Label>Nome da Lista</Form.Label>
              <Form.Control 
                type="text" 
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Ex: Lista da Cozinha"
                autoFocus
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleCreateLista}>
            Salvar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Atribuição */}
      {selectedLista && (
        <Modal show={showAssignModal} onHide={() => setShowAssignModal(false)} centered>
            <Modal.Header closeButton>
            <Modal.Title>Atribuir Colaboradores para "{selectedLista?.nome}"</Modal.Title>
            </Modal.Header>
            <Modal.Body>
            <Form>
                <Form.Group>
                <Form.Label>Selecione os colaboradores:</Form.Label>
                {colaboradores.length > 0 ? colaboradores.map(colaborador => (
                    <Form.Check 
                    type="checkbox"
                    key={colaborador.id}
                    id={`colab-${colaborador.id}`}
                    label={colaborador.nome}
                    checked={selectedColaboradores.includes(colaborador.id)}
                    onChange={(e) => {
                        if (e.target.checked) {
                        setSelectedColaboradores([...selectedColaboradores, colaborador.id]);
                        } else {
                        setSelectedColaboradores(selectedColaboradores.filter(id => id !== colaborador.id));
                        }
                    }}
                    />
                )) : <p className="text-muted">Nenhum colaborador encontrado.</p>}
                </Form.Group>
            </Form>
            </Modal.Body>
            <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAssignModal(false)}>
                Cancelar
            </Button>
            <Button variant="primary" onClick={handleAssignColaboradores}>
                Salvar Atribuições
            </Button>
            </Modal.Footer>
        </Modal>
      )}

    </Layout>
  );
};

export default ListManagement;
