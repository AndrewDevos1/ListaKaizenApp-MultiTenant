'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Button, Modal, Form, Alert, Spinner, Dropdown } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import styles from './Listas.module.css';
import { FaPlus, FaList, FaTrash, FaUsers, FaEdit, FaSearch, FaTimes } from 'react-icons/fa';

interface ItemPreview {
  id: number;
  quantidadeAtual: number;
  quantidadeMinima: number;
  item: { nome: string; unidadeMedida: string };
}

interface ListaSummary {
  id: number;
  nome: string;
  descricao?: string | null;
  criadoEm: string;
  _count: { colaboradores: number; itensRef: number };
  itensRef: ItemPreview[];
}

interface ListaDeletedSummary {
  id: number;
  nome: string;
  criadoEm: string;
  _count: { itensRef: number };
}

interface Usuario {
  id: number;
  nome: string;
  email: string;
}

const normalizeText = (t: string) =>
  t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export default function ListasPage() {
  const router = useRouter();
  const [listas, setListas] = useState<ListaSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Modal criar
  const [showModalCriar, setShowModalCriar] = useState(false);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');

  // Modal editar
  const [showModalEditar, setShowModalEditar] = useState(false);
  const [listaEditando, setListaEditando] = useState<ListaSummary | null>(null);
  const [nomeEditado, setNomeEditado] = useState('');
  const [descricaoEditada, setDescricaoEditada] = useState('');

  // Modal colaboradores
  const [showModalColabs, setShowModalColabs] = useState(false);
  const [listaColabs, setListaColabs] = useState<ListaSummary | null>(null);
  const [colaboradoresAtuais, setColaboradoresAtuais] = useState<Usuario[]>([]);
  const [todosUsuarios, setTodosUsuarios] = useState<Usuario[]>([]);
  const [loadingColabs, setLoadingColabs] = useState(false);

  // Modal lixeira
  const [showModalLixeira, setShowModalLixeira] = useState(false);
  const [listasDeleted, setListasDeleted] = useState<ListaDeletedSummary[]>([]);
  const [loadingLixeira, setLoadingLixeira] = useState(false);

  const fetchListas = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/v1/listas');
      setListas(data);
    } catch {
      setError('Erro ao carregar listas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListas();
  }, []);

  const listasFiltradas = listas.filter((l) => {
    if (!search) return true;
    const termo = normalizeText(search);
    const nomeMatch = normalizeText(l.nome).includes(termo);
    const itemMatch = l.itensRef.some((r) => normalizeText(r.item.nome).includes(termo));
    return nomeMatch || itemMatch;
  });

  // Criar
  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/v1/listas', { nome, descricao: descricao || undefined });
      setShowModalCriar(false);
      setNome('');
      setDescricao('');
      fetchListas();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao criar lista');
    }
  };

  // Deletar (soft)
  const handleDelete = async (id: number) => {
    if (!confirm('Deseja deletar esta lista?')) return;
    try {
      await api.delete(`/v1/listas/${id}`);
      fetchListas();
    } catch {
      setError('Erro ao deletar lista');
    }
  };

  // Editar
  const abrirEditar = (lista: ListaSummary) => {
    setListaEditando(lista);
    setNomeEditado(lista.nome);
    setDescricaoEditada(lista.descricao || '');
    setShowModalEditar(true);
  };

  const handleEditar = async (e: FormEvent) => {
    e.preventDefault();
    if (!listaEditando) return;
    try {
      await api.put(`/v1/listas/${listaEditando.id}`, {
        nome: nomeEditado,
        descricao: descricaoEditada || undefined,
      });
      setShowModalEditar(false);
      fetchListas();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao editar lista');
    }
  };

  // Colaboradores
  const abrirColabs = async (lista: ListaSummary) => {
    setListaColabs(lista);
    setShowModalColabs(true);
    setLoadingColabs(true);
    try {
      const [listaData, usuariosData] = await Promise.all([
        api.get(`/v1/listas/${lista.id}`),
        api.get('/v1/admin/usuarios'),
      ]);
      setColaboradoresAtuais(listaData.data.colaboradores.map((c: any) => c.usuario));
      setTodosUsuarios(usuariosData.data);
    } catch {
      setError('Erro ao carregar colaboradores');
    } finally {
      setLoadingColabs(false);
    }
  };

  const toggleColaborador = async (usuario: Usuario) => {
    if (!listaColabs) return;
    const isColab = colaboradoresAtuais.some((c) => c.id === usuario.id);
    try {
      if (isColab) {
        await api.delete(`/v1/listas/${listaColabs.id}/colaboradores/${usuario.id}`);
        setColaboradoresAtuais((prev) => prev.filter((c) => c.id !== usuario.id));
      } else {
        await api.post(`/v1/listas/${listaColabs.id}/colaboradores`, { usuarioId: usuario.id });
        setColaboradoresAtuais((prev) => [...prev, usuario]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao atualizar colaborador');
    }
  };

  // Lixeira
  const abrirLixeira = async () => {
    setShowModalLixeira(true);
    setLoadingLixeira(true);
    try {
      const { data } = await api.get('/v1/listas/deletadas');
      setListasDeleted(data);
    } catch {
      setError('Erro ao carregar lixeira');
    } finally {
      setLoadingLixeira(false);
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await api.post(`/v1/listas/${id}/restaurar`);
      setListasDeleted((prev) => prev.filter((l) => l.id !== id));
      fetchListas();
    } catch {
      setError('Erro ao restaurar lista');
    }
  };

  const handlePermanentDelete = async (id: number, nome: string) => {
    if (!confirm(`Deletar permanentemente "${nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/v1/listas/${id}/permanente`);
      setListasDeleted((prev) => prev.filter((l) => l.id !== id));
    } catch {
      setError('Erro ao deletar permanentemente');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <h2 className={styles.pageTitle}>Listas</h2>
          <div className={styles.headerActions}>
            <div className={styles.searchWrapper}>
              <FaSearch className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Buscar lista ou item..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingRight: search ? '2rem' : undefined }}
              />
              {search && (
                <button
                  className={styles.searchClear}
                  onClick={() => setSearch('')}
                  type="button"
                  aria-label="Limpar busca"
                >
                  <FaTimes />
                </button>
              )}
            </div>
            <div className={styles.lixeiraBtn}>
              <Button variant="outline-secondary" size="sm" onClick={abrirLixeira}>
                <FaTrash className="me-1" /> Lixeira
              </Button>
              {/* badge count rendered below after fetching */}
            </div>
            <Button variant="primary" onClick={() => setShowModalCriar(true)}>
              <FaPlus /> Nova Lista
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <div className={styles.listsGrid}>
          <div
            className={`${styles.listCard} ${styles.cardCriar}`}
            onClick={() => setShowModalCriar(true)}
          >
            <div className={styles.criarContent}>
              <div className={styles.criarIcon}>
                <FaPlus />
              </div>
              <p className={styles.criarText}>Criar Nova Lista</p>
            </div>
          </div>

          {listasFiltradas.map((lista) => (
            <div key={lista.id} className={`${styles.listCard} ${styles.cardLista}`}>
              <div className={styles.listHeader}>
                <div className={styles.listIcon}>
                  <FaList />
                </div>
              </div>

              <h3 className={styles.listName}>{lista.nome}</h3>

              {lista.descricao && (
                <p className={styles.descricaoCard}>{lista.descricao}</p>
              )}

              <p className={styles.listDescription}>
                {lista._count.itensRef} itens •{' '}
                {lista._count.colaboradores} colaborador
                {lista._count.colaboradores !== 1 ? 'es' : ''}
              </p>

              {lista.itensRef.length > 0 && (
                <ul className={styles.itemPreviewList}>
                  {lista.itensRef.slice(0, 5).map((ref) => {
                    const baixo = ref.quantidadeAtual < ref.quantidadeMinima;
                    return (
                      <li
                        key={ref.id}
                        className={`${styles.itemPreviewItem} ${baixo ? styles.itemBaixo : ''}`}
                      >
                        <span className={styles.itemPreviewNome}>
                          {ref.item.nome} ({ref.item.unidadeMedida})
                        </span>
                        <span className={styles.itemPreviewQtd}>
                          {ref.quantidadeAtual}/{ref.quantidadeMinima}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className={styles.listMeta}>
                <span className={styles.metaItem}>
                  <strong>{lista._count.itensRef}</strong> itens
                </span>
                <span className={styles.metaItem}>
                  <strong>{lista._count.colaboradores}</strong> colab.
                </span>
              </div>

              <div className={styles.listActions}>
                <Dropdown>
                  <Dropdown.Toggle
                    variant="secondary"
                    size="sm"
                    className={styles.acoesToggle}
                    id={`acoes-${lista.id}`}
                  >
                    Ações
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => router.push(`/admin/listas/${lista.id}`)}>
                      Ver itens
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => abrirColabs(lista)}>
                      <FaUsers className="me-2" />
                      Atribuir colaboradores
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => abrirEditar(lista)}>
                      <FaEdit className="me-2" />
                      Editar
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item
                      className="text-danger"
                      onClick={() => handleDelete(lista.id)}
                    >
                      <FaTrash className="me-2" />
                      Deletar
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </div>
            </div>
          ))}
        </div>

        {listasFiltradas.length === 0 && (
          <div className={styles.emptyState}>
            <FaList className={styles.emptyIcon} />
            <h3 className={styles.emptyTitle}>
              {search ? 'Nenhuma lista encontrada' : 'Nenhuma lista cadastrada'}
            </h3>
            <p className={styles.emptyText}>
              {search
                ? `Sem resultados para "${search}"`
                : 'Clique em "Nova Lista" para criar sua primeira lista'}
            </p>
          </div>
        )}

        {/* Modal Criar */}
        <Modal show={showModalCriar} onHide={() => { setShowModalCriar(false); setNome(''); setDescricao(''); }}>
          <Form onSubmit={handleCreate}>
            <Modal.Header closeButton>
              <Modal.Title>Nova Lista</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form.Group className="mb-3">
                <Form.Label>Nome</Form.Label>
                <Form.Control
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Lista Semanal"
                  required
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Descrição <span className="text-muted">(opcional)</span></Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Lista de itens para reposição semanal"
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => { setShowModalCriar(false); setNome(''); setDescricao(''); }}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                Criar
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* Modal Editar */}
        <Modal show={showModalEditar} onHide={() => setShowModalEditar(false)}>
          <Form onSubmit={handleEditar}>
            <Modal.Header closeButton>
              <Modal.Title>Editar Lista</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form.Group className="mb-3">
                <Form.Label>Nome</Form.Label>
                <Form.Control
                  value={nomeEditado}
                  onChange={(e) => setNomeEditado(e.target.value)}
                  placeholder="Nome da lista"
                  required
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Descrição <span className="text-muted">(opcional)</span></Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={descricaoEditada}
                  onChange={(e) => setDescricaoEditada(e.target.value)}
                  placeholder="Descrição da lista"
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowModalEditar(false)}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                Salvar
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* Modal Colaboradores */}
        <Modal show={showModalColabs} onHide={() => setShowModalColabs(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Colaboradores — {listaColabs?.nome}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {loadingColabs ? (
              <div className="text-center py-3">
                <Spinner animation="border" size="sm" />
              </div>
            ) : todosUsuarios.length === 0 ? (
              <p className="text-muted text-center">Nenhum usuário disponível</p>
            ) : (
              todosUsuarios.map((usuario) => {
                const isColab = colaboradoresAtuais.some((c) => c.id === usuario.id);
                return (
                  <div key={usuario.id} className={styles.colaboradorItem}>
                    <div className={styles.colaboradorInfo}>
                      <span className={styles.colaboradorNome}>{usuario.nome}</span>
                      <span className={styles.colaboradorEmail}>{usuario.email}</span>
                    </div>
                    <Form.Check
                      type="switch"
                      id={`colab-${usuario.id}`}
                      checked={isColab}
                      onChange={() => toggleColaborador(usuario)}
                    />
                  </div>
                );
              })
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModalColabs(false)}>
              Fechar
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Modal Lixeira */}
        <Modal show={showModalLixeira} onHide={() => setShowModalLixeira(false)}>
          <Modal.Header closeButton>
            <Modal.Title>
              Lixeira {listasDeleted.length > 0 && `(${listasDeleted.length})`}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {loadingLixeira ? (
              <div className="text-center py-3">
                <Spinner animation="border" size="sm" />
              </div>
            ) : listasDeleted.length === 0 ? (
              <p className="text-muted text-center py-2">A lixeira está vazia</p>
            ) : (
              listasDeleted.map((lista) => (
                <div key={lista.id} className={styles.lixeiraItem}>
                  <div className={styles.lixeiraItemInfo}>
                    <span className={styles.lixeiraItemNome}>{lista.nome}</span>
                    <span className={styles.lixeiraItemMeta}>
                      {lista._count.itensRef} iten{lista._count.itensRef !== 1 ? 's' : ''} •{' '}
                      {new Date(lista.criadoEm).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className={styles.lixeiraActions}>
                    <Button
                      variant="outline-success"
                      size="sm"
                      onClick={() => handleRestore(lista.id)}
                    >
                      Restaurar
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handlePermanentDelete(lista.id, lista.nome)}
                    >
                      <FaTrash />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModalLixeira(false)}>
              Fechar
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
}
