import React, { useEffect, useState } from 'react';
import { Alert, Badge, Button, Form, Modal, Spinner, Table } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faEdit, faTrash, faUsers } from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  aprovarFornecedor,
  createFornecedorLogin,
  deleteFornecedorCadastrado,
  getFornecedorUsuarios,
  listFornecedoresCadastrados,
  updateFornecedorCadastrado
} from '../../services/supplierApi';

interface Fornecedor {
  id: number;
  nome: string;
  telefone?: string;
  cnpj?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  site?: string;
  aprovado?: boolean;
  usuario_email?: string;
  usuario_senha?: string;
  usuario_id?: number;
}

interface UsuarioFornecedor {
  id: number;
  nome: string;
  email: string;
  senha_texto_puro?: string | null;
  ativo?: boolean;
}

const PRODUCTION_URL = 'https://kaizen-compras.up.railway.app';
const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const aplicarMascaraTelefone = (valor: string): string => {
  const apenasDigitos = valor.replace(/\D/g, '');
  if (apenasDigitos.length === 0) return '';
  if (apenasDigitos.length <= 2) return apenasDigitos;
  if (apenasDigitos.length <= 7) {
    return `(${apenasDigitos.slice(0, 2)}) ${apenasDigitos.slice(2)}`;
  }
  return `(${apenasDigitos.slice(0, 2)}) ${apenasDigitos.slice(2, 7)}-${apenasDigitos.slice(7, 11)}`;
};

const aplicarMascaraCNPJ = (valor: string): string => {
  const apenasDigitos = valor.replace(/\D/g, '');
  if (apenasDigitos.length === 0) return '';
  if (apenasDigitos.length <= 2) return apenasDigitos;
  if (apenasDigitos.length <= 5) {
    return `${apenasDigitos.slice(0, 2)}.${apenasDigitos.slice(2)}`;
  }
  if (apenasDigitos.length <= 8) {
    return `${apenasDigitos.slice(0, 2)}.${apenasDigitos.slice(2, 5)}.${apenasDigitos.slice(5)}`;
  }
  return `${apenasDigitos.slice(0, 2)}.${apenasDigitos.slice(2, 5)}.${apenasDigitos.slice(5, 8)}/${apenasDigitos.slice(8, 12)}-${apenasDigitos.slice(12, 14)}`;
};

const aplicarMascaraCEP = (valor: string): string => {
  const apenasDigitos = valor.replace(/\D/g, '');
  if (apenasDigitos.length === 0) return '';
  if (apenasDigitos.length <= 5) return apenasDigitos;
  return `${apenasDigitos.slice(0, 5)}-${apenasDigitos.slice(5, 8)}`;
};

const GerenciarFornecedoresCadastrados: React.FC = () => {
  const { login } = useAuth();
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [fornecedorEditando, setFornecedorEditando] = useState<Fornecedor | null>(null);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [selectedCredentials, setSelectedCredentials] = useState<Fornecedor | null>(null);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [selectedFornecedorUsers, setSelectedFornecedorUsers] = useState<Fornecedor | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioFornecedor[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showCreateLoginModal, setShowCreateLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginSenha, setLoginSenha] = useState('');
  const [creatingLogin, setCreatingLogin] = useState(false);
  const [showCopiarModal, setShowCopiarModal] = useState(false);
  const [textoCopiar, setTextoCopiar] = useState('');

  const abrirModalCopiar = (texto: string) => {
    setTextoCopiar(texto);
    setShowCopiarModal(true);
  };

  const copiarTexto = async (texto: string) => {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(texto);
        return true;
      } catch (error) {
        console.warn('[GerenciarFornecedoresCadastrados] Falha ao copiar via clipboard:', error);
      }
    }

    const textarea = document.createElement('textarea');
    textarea.value = texto;
    textarea.style.position = 'fixed';
    textarea.style.top = '-1000px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      return document.execCommand('copy');
    } catch (error) {
      console.warn('[GerenciarFornecedoresCadastrados] Falha ao copiar via execCommand:', error);
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await listFornecedoresCadastrados();
      setFornecedores(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar fornecedores.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleApprove = async (id: number, aprovado: boolean) => {
    try {
      await aprovarFornecedor(id, aprovado);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao atualizar fornecedor.');
    }
  };

  const handleEditFieldChange = (field: keyof Fornecedor, value: string) => {
    let formatted = value;
    if (field === 'telefone') {
      formatted = aplicarMascaraTelefone(value);
    }
    if (field === 'cnpj') {
      formatted = aplicarMascaraCNPJ(value);
    }
    if (field === 'cep') {
      formatted = aplicarMascaraCEP(value);
    }
    setFornecedorEditando((prev) => (prev ? { ...prev, [field]: formatted } : prev));
  };

  const handleShowEdit = (fornecedor: Fornecedor) => {
    setFornecedorEditando(fornecedor);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!fornecedorEditando) return;
    try {
      const payload = {
        nome: fornecedorEditando.nome || '',
        telefone: fornecedorEditando.telefone || '',
        cnpj: fornecedorEditando.cnpj || '',
        endereco: fornecedorEditando.endereco || '',
        cidade: fornecedorEditando.cidade || '',
        estado: fornecedorEditando.estado || '',
        cep: fornecedorEditando.cep || '',
        site: fornecedorEditando.site || ''
      };
      await updateFornecedorCadastrado(fornecedorEditando.id, payload);
      setSuccess('Fornecedor atualizado com sucesso.');
      setShowEditModal(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao atualizar fornecedor.');
    }
  };

  const handleDelete = async (fornecedor: Fornecedor) => {
    const confirmar = window.confirm(`Deseja excluir o fornecedor ${fornecedor.nome}?`);
    if (!confirmar) return;
    try {
      await deleteFornecedorCadastrado(fornecedor.id);
      setSuccess('Fornecedor excluído com sucesso.');
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao excluir fornecedor.');
    }
  };

  const handleShowCredentials = (fornecedor: Fornecedor) => {
    setSelectedCredentials(fornecedor);
    setLoginEmail('');
    setLoginSenha('');
    setShowCredentialsModal(true);
  };

  const handleCopyCredentials = async () => {
    if (!selectedCredentials) return;
    const message =
      `*Credenciais de Acesso - ${selectedCredentials.nome}*\n\n` +
      `📧 Email: ${selectedCredentials.usuario_email || 'N/A'}\n` +
      `🔑 Senha: ${selectedCredentials.usuario_senha || 'N/A'}\n\n` +
      `🌐 Acesso: ${PRODUCTION_URL}\n\n` +
      `Utilize essas credenciais para acessar o sistema Kaizen Lists.`;
    const copiado = await copiarTexto(message);
    setSuccess(copiado ? 'Credenciais copiadas!' : 'Credenciais geradas. Copie manualmente.');
    if (!copiado) {
      abrirModalCopiar(message);
    }
  };

  const handleShareWhatsApp = () => {
    if (!selectedCredentials) return;
    const message =
      `*Credenciais de Acesso - ${selectedCredentials.nome}*\n\n` +
      `📧 Email: ${selectedCredentials.usuario_email || 'N/A'}\n` +
      `🔑 Senha: ${selectedCredentials.usuario_senha || 'N/A'}\n\n` +
      `🌐 Acesso: ${PRODUCTION_URL}\n\n` +
      `Utilize essas credenciais para acessar o sistema Kaizen Lists.`;
    const popup = window.open('about:blank', '_blank');
    copiarTexto(message).then((copiado) => {
      const url = new URL('https://wa.me/');
      url.searchParams.set('text', message);
      if (popup) {
        popup.location.href = url.toString();
      } else {
        window.location.href = url.toString();
      }
      setSuccess(copiado ? 'Texto copiado e WhatsApp aberto!' : 'WhatsApp aberto. Copie o texto manualmente.');
      if (!copiado) {
        abrirModalCopiar(message);
      }
    }).catch(() => {
      if (popup) {
        popup.close();
      }
      setError('Erro ao compartilhar no WhatsApp.');
    });
  };

  const fetchUsuariosFornecedor = async (fornecedor: Fornecedor) => {
    setLoadingUsers(true);
    try {
      const response = await getFornecedorUsuarios(fornecedor.id);
      setUsuarios(response.usuarios || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar usuários.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleShowUsersModal = (fornecedor: Fornecedor) => {
    setSelectedFornecedorUsers(fornecedor);
    setShowUsersModal(true);
    fetchUsuariosFornecedor(fornecedor);
  };

  const handleImpersonarUsuario = async (usuario: UsuarioFornecedor) => {
    try {
      const response = await api.post('/admin/impersonar', { usuario_id: usuario.id });
      const token = response.data?.access_token;
      if (token) {
        login(token);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao iniciar impersonação.');
    }
  };

  const handleCreateLogin = async () => {
    if (!selectedCredentials) return;
    setCreatingLogin(true);
    try {
      await createFornecedorLogin(selectedCredentials.id, { email: loginEmail, senha: loginSenha });
      setSuccess('Login criado com sucesso.');
      setShowCreateLoginModal(false);
      setLoginEmail('');
      setLoginSenha('');
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao criar login.');
    } finally {
      setCreatingLogin(false);
    }
  };

  const handleCopyUserCredentials = async (usuario: UsuarioFornecedor) => {
    const message =
      `Credenciais de Acesso\n\n` +
      `Nome: ${usuario.nome}\n` +
      `Email: ${usuario.email}\n` +
      `Senha: ${usuario.senha_texto_puro || 'N/A'}\n\n` +
      `Acesso: ${PRODUCTION_URL}`;
    const copiado = await copiarTexto(message);
    setSuccess(copiado ? 'Credenciais copiadas!' : 'Credenciais geradas. Copie manualmente.');
    if (!copiado) {
      abrirModalCopiar(message);
    }
  };

  const handleShareUserWhatsApp = async (usuario: UsuarioFornecedor) => {
    const message =
      `*Credenciais de Acesso*\n\n` +
      `👤 Nome: ${usuario.nome}\n` +
      `📧 Email: ${usuario.email}\n` +
      `🔑 Senha: ${usuario.senha_texto_puro || 'N/A'}\n\n` +
      `🌐 Acesso: ${PRODUCTION_URL}`;

    const popup = window.open('about:blank', '_blank');
    try {
      const copiado = await copiarTexto(message);
      const url = new URL('https://wa.me/');
      url.searchParams.set('text', message);
      if (popup) {
        popup.location.href = url.toString();
      } else {
        window.location.href = url.toString();
      }
      setSuccess(copiado ? 'Texto copiado e WhatsApp aberto!' : 'WhatsApp aberto. Copie o texto manualmente.');
      if (!copiado) {
        abrirModalCopiar(message);
      }
    } catch (error) {
      if (popup) {
        popup.close();
      }
      setError('Erro ao compartilhar no WhatsApp.');
    }
  };

  const handleCopiarTextoModal = async () => {
    if (!textoCopiar) return;
    const copiado = await copiarTexto(textoCopiar);
    setSuccess(copiado ? 'Texto copiado para a área de transferência!' : 'Selecione o texto e copie manualmente.');
    if (copiado) {
      setShowCopiarModal(false);
    }
  };

  return (
    <div className="container py-4">
      <h3 className="mb-3">Fornecedores Cadastrados</h3>
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      {loading ? (
        <div className="text-center py-4">
          <Spinner animation="border" />
        </div>
      ) : (
        <Table striped bordered hover responsive>
          <thead className="table-dark">
            <tr>
              <th>Fornecedor</th>
              <th>Telefone</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {fornecedores.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center">Nenhum fornecedor encontrado.</td>
              </tr>
            ) : fornecedores.map((f) => (
              <tr key={f.id}>
                <td>{f.nome}</td>
                <td>{f.telefone || '-'}</td>
                <td>
                  {f.aprovado ? <Badge bg="success">Aprovado</Badge> : <Badge bg="warning">Pendente</Badge>}
                </td>
                <td className="d-flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline-info" onClick={() => handleShowCredentials(f)}>
                    <FontAwesomeIcon icon={faCopy} /> Login
                  </Button>
                  <Button size="sm" variant="outline-success" onClick={() => handleShowUsersModal(f)}>
                    <FontAwesomeIcon icon={faUsers} /> Usuários
                  </Button>
                  <Button size="sm" variant="outline-primary" onClick={() => handleShowEdit(f)}>
                    <FontAwesomeIcon icon={faEdit} /> Editar
                  </Button>
                  <Button size="sm" variant="outline-danger" onClick={() => handleDelete(f)}>
                    <FontAwesomeIcon icon={faTrash} /> Deletar
                  </Button>
                  {!f.aprovado && (
                    <Button size="sm" variant="success" onClick={() => handleApprove(f.id, true)}>
                      Aprovar
                    </Button>
                  )}
                  {f.aprovado && (
                    <Button size="sm" variant="outline-danger" onClick={() => handleApprove(f.id, false)}>
                      Reprovar
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Editar Fornecedor</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Nome</Form.Label>
            <Form.Control
              value={fornecedorEditando?.nome || ''}
              onChange={(e) => setFornecedorEditando((prev) => prev ? { ...prev, nome: e.target.value } : prev)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Telefone</Form.Label>
            <Form.Control
              value={fornecedorEditando?.telefone || ''}
              onChange={(e) => handleEditFieldChange('telefone', e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>CNPJ</Form.Label>
            <Form.Control
              value={fornecedorEditando?.cnpj || ''}
              onChange={(e) => handleEditFieldChange('cnpj', e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Endereço</Form.Label>
            <Form.Control
              value={fornecedorEditando?.endereco || ''}
              onChange={(e) => setFornecedorEditando((prev) => prev ? { ...prev, endereco: e.target.value } : prev)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Cidade</Form.Label>
            <Form.Control
              value={fornecedorEditando?.cidade || ''}
              onChange={(e) => setFornecedorEditando((prev) => prev ? { ...prev, cidade: e.target.value } : prev)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Estado (UF)</Form.Label>
            <Form.Select
              value={fornecedorEditando?.estado || ''}
              onChange={(e) => setFornecedorEditando((prev) => prev ? { ...prev, estado: e.target.value } : prev)}
            >
              <option value="">Selecione</option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>CEP</Form.Label>
            <Form.Control
              value={fornecedorEditando?.cep || ''}
              onChange={(e) => handleEditFieldChange('cep', e.target.value)}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Site</Form.Label>
            <Form.Control
              value={fornecedorEditando?.site || ''}
              onChange={(e) => setFornecedorEditando((prev) => prev ? { ...prev, site: e.target.value } : prev)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleSaveEdit}>Salvar</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showCredentialsModal} onHide={() => setShowCredentialsModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Credenciais - {selectedCredentials?.nome}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-2"><strong>Email:</strong> {selectedCredentials?.usuario_email || 'Não disponível'}</div>
          <div><strong>Senha:</strong> {selectedCredentials?.usuario_senha || 'Não disponível'}</div>
        </Modal.Body>
        <Modal.Footer>
          {!selectedCredentials?.usuario_email && (
            <Button variant="outline-primary" onClick={() => setShowCreateLoginModal(true)}>
              Criar Login
            </Button>
          )}
          <Button variant="outline-secondary" onClick={handleCopyCredentials}>
            <FontAwesomeIcon icon={faCopy} /> Copiar
          </Button>
          <Button variant="outline-success" onClick={handleShareWhatsApp}>
            <FontAwesomeIcon icon={faWhatsapp} /> WhatsApp
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showCreateLoginModal}
        onHide={() => {
          setShowCreateLoginModal(false);
          setLoginEmail('');
          setLoginSenha('');
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Criar Login</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
          </Form.Group>
          <Form.Group>
            <Form.Label>Senha</Form.Label>
            <Form.Control type="password" value={loginSenha} onChange={(e) => setLoginSenha(e.target.value)} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateLoginModal(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleCreateLogin} disabled={creatingLogin}>
            {creatingLogin ? 'Criando...' : 'Criar'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showUsersModal} onHide={() => setShowUsersModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Usuários - {selectedFornecedorUsers?.nome}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingUsers ? (
            <div className="text-center py-4"><Spinner animation="border" /></div>
          ) : usuarios.length === 0 ? (
            <Alert variant="info">Nenhum usuário vinculado.</Alert>
          ) : (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Senha</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario) => (
                  <tr key={usuario.id}>
                    <td>{usuario.nome}</td>
                    <td>{usuario.email}</td>
                    <td><code>{usuario.senha_texto_puro || '(não disponível)'}</code></td>
                    <td>
                      <div className="d-flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline-secondary" onClick={() => handleImpersonarUsuario(usuario)}>
                          Impersonar
                        </Button>
                        <Button size="sm" variant="outline-primary" onClick={() => handleCopyUserCredentials(usuario)}>
                          <FontAwesomeIcon icon={faCopy} />
                        </Button>
                        <Button size="sm" variant="outline-success" onClick={() => handleShareUserWhatsApp(usuario)}>
                          <FontAwesomeIcon icon={faWhatsapp} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Modal.Body>
      </Modal>

      <Modal show={showCopiarModal} onHide={() => setShowCopiarModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Copiar Texto</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Control as="textarea" rows={8} value={textoCopiar} readOnly />
          <div className="small text-muted mt-2">
            Selecione o texto e copie manualmente caso o botão não funcione.
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCopiarModal(false)}>Fechar</Button>
          <Button variant="primary" onClick={handleCopiarTextoModal}>Copiar</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default GerenciarFornecedoresCadastrados;
