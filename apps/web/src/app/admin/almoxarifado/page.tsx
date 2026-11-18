'use client';

import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Form, Modal, Table } from 'react-bootstrap';
import api from '@/lib/api';

type Movimentacao = {
  id: number;
  tipo: string;
  quantidade: string;
  saldoAnterior: string;
  saldoNovo: string;
  motivo: string;
  responsavelNome: string;
  criadoEm: string;
};

type Posicao = {
  id: number;
  saldo: string;
  minimo: string | null;
  ativo: boolean;
  item: { nome: string; unidadeMedida: string };
  movimentacoes?: Movimentacao[];
};

const formatDate = (value: string) => new Date(value).toLocaleString('pt-BR');

export default function AlmoxarifadoPage() {
  const [rows, setRows] = useState<Posicao[]>([]);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Posicao | null>(null);
  const [tipo, setTipo] = useState('ENTRADA');
  const [quantidade, setQuantidade] = useState('');
  const [motivo, setMotivo] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);

  const load = async () => {
    try {
      setRows((await api.get('/v1/admin/almoxarifado', { params: { busca: query } })).data);
    } catch {
      setError('Erro ao carregar almoxarifado');
    }
  };

  useEffect(() => {
    void load();
    // A consulta deve acompanhar apenas a busca digitada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const openPosition = async (position: Posicao) => {
    setSelected(position);
    setLoadingHistory(true);
    try {
      const detail = (await api.get(`/v1/admin/almoxarifado/${position.id}`)).data;
      setSelected(detail);
    } catch {
      setError('Não foi possível carregar o histórico de movimentações');
    } finally {
      setLoadingHistory(false);
    }
  };

  const move = async () => {
    if (!selected) return;
    try {
      await api.post(`/v1/admin/almoxarifado/${selected.id}/movimentacoes`, {
        tipo, quantidade: Number(quantidade), motivo, chaveIdempotencia: crypto.randomUUID(),
      });
      setSelected(null);
      setQuantidade('');
      setMotivo('');
      await load();
    } catch {
      setError('Não foi possível registrar a movimentação');
    }
  };

  return <main className="p-3">
    <h1>Almoxarifado</h1>
    {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
    <Form.Control aria-label="Buscar item" placeholder="Buscar item" value={query} onChange={e => setQuery(e.target.value)} />
    <Table responsive hover className="mt-3">
      <thead><tr><th>Item</th><th>Saldo</th><th>Status</th><th /></tr></thead>
      <tbody>{rows.map(r => <tr key={r.id}>
        <td>{r.item.nome}</td><td>{r.saldo} {r.item.unidadeMedida}</td>
        <td>{r.minimo !== null && Number(r.saldo) < Number(r.minimo) ? <Badge bg="warning" text="dark">Abaixo do mínimo</Badge> : <Badge bg="success">OK</Badge>}</td>
        <td><Button size="sm" onClick={() => void openPosition(r)}>Movimentar</Button></td>
      </tr>)}</tbody>
    </Table>
    <Modal size="xl" show={!!selected} onHide={() => setSelected(null)}>
      <Modal.Header closeButton><Modal.Title>Movimentação: {selected?.item.nome}</Modal.Title></Modal.Header>
      <Modal.Body>
        <h2 className="h5">Histórico de movimentações</h2>
        {loadingHistory ? <p>Carregando histórico...</p> : selected?.movimentacoes?.length ? <Table responsive size="sm">
          <thead><tr><th>Tipo</th><th>Quantidade</th><th>Saldo anterior</th><th>Saldo novo</th><th>Motivo</th><th>Responsável</th><th>Data</th></tr></thead>
          <tbody>{selected.movimentacoes.map(m => <tr key={m.id}><td>{m.tipo}</td><td>{m.quantidade}</td><td>{m.saldoAnterior}</td><td>{m.saldoNovo}</td><td>{m.motivo}</td><td>{m.responsavelNome}</td><td>{formatDate(m.criadoEm)}</td></tr>)}</tbody>
        </Table> : <p className="text-muted">Nenhuma movimentação registrada.</p>}
        <hr />
        <h2 className="h5">Nova movimentação</h2>
        <Form.Select aria-label="Tipo de movimentação" value={tipo} onChange={e => setTipo(e.target.value)}><option>ENTRADA</option><option>SAIDA</option><option>AJUSTE</option></Form.Select>
        <Form.Control className="mt-2" type="number" min="0.001" placeholder="Quantidade" value={quantidade} onChange={e => setQuantidade(e.target.value)} />
        <Form.Control className="mt-2" placeholder="Motivo" value={motivo} onChange={e => setMotivo(e.target.value)} />
      </Modal.Body>
      <Modal.Footer><Button onClick={() => void move()} disabled={!quantidade || !motivo}>Salvar</Button></Modal.Footer>
    </Modal>
  </main>;
}
