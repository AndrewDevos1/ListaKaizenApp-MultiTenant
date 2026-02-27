import React, { useEffect, useState } from 'react';
import { Alert, Badge, Button, Form, Modal, Table } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faEdit, faLink, faPause, faPlay, faTrash } from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import {
  createConviteFornecedor,
  deleteConviteFornecedor,
  listConvitesFornecedor,
  updateConviteFornecedor
} from '../../services/supplierApi';
import { formatarDataHoraBrasilia } from '../../utils/dateFormatter';

interface ConviteFornecedor {
  id: number;
  token: string;
  criado_em?: string;
  expira_em?: string;
  usado?: boolean;
  usado_em?: string;
  usado_por_nome?: string;
  usado_por_email?: string;
  fornecedor_nome?: string;
  limite_usos?: number;
  quantidade_usos?: number;
  usos_restantes?: number;
  ativo?: boolean;
  link?: string;
}

const GerenciarConvitesFornecedor: React.FC = () => {
  const [convites, setConvites] = useState<ConviteFornecedor[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [gerandoConvite, setGerandoConvite] = useState(false);
  const [limiteUsos, setLimiteUsos] = useState(1);
  const [linkConvite, setLinkConvite] = useState('');
  const [conviteCopiado, setConviteCopiado] = useState(false);
  const [loadingConvites, setLoadingConvites] = useState(false);
  const [conviteEditando, setConviteEditando] = useState<ConviteFornecedor | null>(null);
  const [editLimiteUsos, setEditLimiteUsos] = useState(1);
  const [editAtivo, setEditAtivo] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [salvandoConvite, setSalvandoConvite] = useState(false);
  const [excluindoConviteId, setExcluindoConviteId] = useState<number | null>(null);

  const fetchConvites = async () => {
    setLoadingConvites(true);
    try {
      const response = await listConvitesFornecedor();
      const convitesData = Array.isArray(response) ? response : response.convites;
      setConvites(convitesData || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar convites de fornecedor.');
    } finally {
      setLoadingConvites(false);
    }
  };

  useEffect(() => {
    fetchConvites();
  }, []);

  const buildConviteFornecedorLink = (token: string) =>
    `${window.location.origin}/supplier/register-convite?token=${token}`;

  const gerarLinkConvite = (convite: ConviteFornecedor) => {
    if (convite.token) {
      return buildConviteFornecedorLink(convite.token);
    }
    return convite.link || '';
  };

  const handleGerarConvite = async () => {
    setError('');
    setSuccess('');
    setConviteCopiado(false);
    setLinkConvite('');
    setGerandoConvite(true);
    try {
      const response = await createConviteFornecedor({ limite_usos: limiteUsos });
      const token = response?.token;
      const link = token ? buildConviteFornecedorLink(token) : response?.link;
      setLinkConvite(link || '');
      const usosTexto = limiteUsos === 1 ? '1 uso' : `${limiteUsos} usos`;
      setSuccess(`Convite de fornecedor gerado com sucesso (${usosTexto}).`);
      setLimiteUsos(1);
      fetchConvites();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao gerar convite de fornecedor.');
    } finally {
      setGerandoConvite(false);
    }
  };

  const handleCopiarConvite = async (convite?: ConviteFornecedor) => {
    const link = convite ? gerarLinkConvite(convite) : linkConvite;
    if (!link) {
      setError('Link de convite indisponível.');
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      setConviteCopiado(true);
      setTimeout(() => setConviteCopiado(false), 3000);
    } catch (err) {
      setError('Não foi possível copiar o link do convite.');
    }
  };

  const handleWhatsAppConvite = (convite?: ConviteFornecedor) => {
    const link = convite ? gerarLinkConvite(convite) : linkConvite;
    if (!link) return;
    const texto = `Olá! Você foi convidado(a) a cadastrar seu fornecedor no Kaizen Lists.\n\n` +
      `Clique no link abaixo para concluir o cadastro:\n${link}`;
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  };

  const handleExcluirConvite = async (convite: ConviteFornecedor) => {
    const confirmar = window.confirm('Deseja excluir este convite de fornecedor?');
    if (!confirmar) {
      return;
    }
    setExcluindoConviteId(convite.id);
    setError('');
    try {
      await deleteConviteFornecedor(convite.id);
      setConvites((prev) => prev.filter((item) => item.id !== convite.id));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao excluir convite de fornecedor.');
    } finally {
      setExcluindoConviteId(null);
    }
  };

  const handleEditarConvite = (convite: ConviteFornecedor) => {
    setConviteEditando(convite);
    setEditLimiteUsos(convite.limite_usos || 1);
    setEditAtivo(Boolean(convite.ativo));
    setShowEditModal(true);
  };

  const handleSalvarConvite = async () => {
    if (!conviteEditando) return;
    setSalvandoConvite(true);
    setError('');
    try {
      const response = await updateConviteFornecedor(conviteEditando.id, {
        limite_usos: editLimiteUsos,
        ativo: editAtivo
      });
      setSuccess(response.data?.message || response.message || 'Convite atualizado com sucesso!');
      setShowEditModal(false);
      fetchConvites();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao atualizar convite.');
    } finally {
      setSalvandoConvite(false);
    }
  };

  const handleToggleAtivoConvite = async (convite: ConviteFornecedor) => {
    setError('');
    try {
      await updateConviteFornecedor(convite.id, { ativo: !convite.ativo });
      setSuccess(convite.ativo ? 'Convite pausado.' : 'Convite ativado.');
      fetchConvites();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao alterar status do convite.');
    }
  };

  return (
    <div className="container py-4">
      <h3 className="mb-3">Convites de Fornecedor</h3>
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <div className="mb-4 p-3 border rounded">
        <div className="d-flex flex-wrap gap-3 align-items-end">
          <div>
            <Form.Label>Limite de usos</Form.Label>
            <Form.Control
              type="number"
              min={1}
              max={100}
              value={limiteUsos}
              onChange={(e) => setLimiteUsos(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
            />
          </div>
          <Button onClick={handleGerarConvite} disabled={gerandoConvite}>
            <FontAwesomeIcon icon={faLink} className="me-2" />
            {gerandoConvite ? 'Gerando...' : 'Gerar Convite'}
          </Button>
          {linkConvite && (
            <>
              <Button
                variant={conviteCopiado ? 'success' : 'outline-secondary'}
                onClick={() => handleCopiarConvite()}
              >
                <FontAwesomeIcon icon={faCopy} />
              </Button>
              <Button variant="outline-success" onClick={() => handleWhatsAppConvite()}>
                <FontAwesomeIcon icon={faWhatsapp} />
              </Button>
            </>
          )}
        </div>
        {linkConvite && (
          <div className="mt-3">
            <Form.Label>Link do convite gerado</Form.Label>
            <Form.Control value={linkConvite} readOnly />
          </div>
        )}
      </div>

      <div className="mb-2">
        {loadingConvites ? 'Carregando convites...' : null}
      </div>
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Fornecedor</th>
            <th>Criado em</th>
            <th>Expira em</th>
            <th>Usos</th>
            <th>Status</th>
            <th>Usado por</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {convites.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center">Nenhum convite gerado ainda</td>
            </tr>
          ) : convites.map((convite) => {
            const esgotado = (convite.quantidade_usos || 0) >= (convite.limite_usos || 1);
            const pausado = convite.ativo === false;
            return (
              <tr key={convite.id} className={pausado ? 'table-warning' : ''}>
                <td>{convite.fornecedor_nome || '-'}</td>
                <td>{convite.criado_em ? formatarDataHoraBrasilia(convite.criado_em) : '-'}</td>
                <td>{convite.expira_em ? formatarDataHoraBrasilia(convite.expira_em) : '-'}</td>
                <td>
                  <Badge bg={esgotado ? 'secondary' : 'info'}>
                    {convite.quantidade_usos || 0}/{convite.limite_usos || 1}
                  </Badge>
                </td>
                <td>
                  {pausado ? (
                    <Badge bg="warning">Pausado</Badge>
                  ) : esgotado ? (
                    <Badge bg="secondary">Esgotado</Badge>
                  ) : (
                    <Badge bg="success">Ativo</Badge>
                  )}
                </td>
                <td>
                  {convite.usado_por_nome ? (
                    <div>
                      <strong>{convite.usado_por_nome}</strong>
                      <div className="small text-muted">{convite.usado_por_email}</div>
                    </div>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="d-flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline-secondary" onClick={() => handleCopiarConvite(convite)}>
                    <FontAwesomeIcon icon={faCopy} />
                  </Button>
                  <Button size="sm" variant="outline-success" onClick={() => handleWhatsAppConvite(convite)}>
                    <FontAwesomeIcon icon={faWhatsapp} />
                  </Button>
                  <Button size="sm" variant="outline-primary" onClick={() => handleEditarConvite(convite)}>
                    <FontAwesomeIcon icon={faEdit} />
                  </Button>
                  <Button
                    size="sm"
                    variant={convite.ativo ? 'outline-warning' : 'outline-success'}
                    onClick={() => handleToggleAtivoConvite(convite)}
                  >
                    <FontAwesomeIcon icon={convite.ativo ? faPause : faPlay} />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-danger"
                    disabled={excluindoConviteId === convite.id}
                    onClick={() => handleExcluirConvite(convite)}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Editar Convite</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Limite de usos</Form.Label>
            <Form.Control
              type="number"
              min={conviteEditando?.quantidade_usos || 1}
              max={100}
              value={editLimiteUsos}
              onChange={(e) => setEditLimiteUsos(Math.max(conviteEditando?.quantidade_usos || 1, Math.min(100, parseInt(e.target.value) || 1)))}
            />
          </Form.Group>
          <Form.Check
            type="switch"
            id="convite-fornecedor-ativo"
            label={editAtivo ? 'Convite ativo' : 'Convite pausado'}
            checked={editAtivo}
            onChange={(e) => setEditAtivo(e.target.checked)}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleSalvarConvite} disabled={salvandoConvite}>
            {salvandoConvite ? 'Salvando...' : 'Salvar'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default GerenciarConvitesFornecedor;
