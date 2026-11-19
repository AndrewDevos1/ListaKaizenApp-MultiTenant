'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Alert, Badge, Button, Form, Table } from 'react-bootstrap';
import api from '@/lib/api';

type Posicao = { id: number; saldo: string; material: { nome: string; categoria: string }; variante?: { tamanho?: string | null; descricao?: string | null } | null };
type Usuario = { id: number; nome: string; role: string; ativo: boolean };
type Entrega = { id: number; status: string; criadoEm: string; funcionarioId: number; itens: { materialNomeSnapshot: string; varianteSnapshot?: string | null; quantidade: string }[] };

const key = () => `epi-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function EntregasEpiAdminPage() {
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [posicoes, setPosicoes] = useState<Posicao[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [destinatario, setDestinatario] = useState('');
  const [linhas, setLinhas] = useState([{ posicaoId: '', quantidade: '1' }]);
  const [observacoes, setObservacoes] = useState('');
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [detalhe, setDetalhe] = useState<Entrega | null>(null);
  const carregar = async () => {
    try {
      const [e, p, u] = await Promise.all([api.get('/v1/admin/entregas-epi'), api.get('/v1/admin/almoxarifado'), api.get('/v1/admin/usuarios', { params: { role: 'COLLABORATOR', ativo: 'true' } })]);
      setEntregas(e.data); setPosicoes(p.data); setUsuarios(Array.isArray(u.data) ? u.data : u.data.usuarios ?? []);
    } catch { setErro('Não foi possível carregar entregas, estoque ou colaboradores.'); }
  };
  useEffect(() => { void carregar(); }, []);
  const abrir = async (id: number) => { try { const { data } = await api.get(`/v1/admin/entregas-epi/${id}`); setDetalhe(data); } catch { setErro('Não foi possível carregar o detalhe.'); } };
  const cancelar = async () => { if (!detalhe) return; try { await api.post(`/v1/admin/entregas-epi/${detalhe.id}/cancelar`, { chaveIdempotencia: `cancelamento-${detalhe.id}` }); await carregar(); await abrir(detalhe.id); } catch { setErro('A entrega não está mais pendente.'); } };
  const criar = async (event: FormEvent) => {
    event.preventDefault(); setErro(''); setOk('');
    try {
      await api.post('/v1/admin/entregas-epi', { funcionarioId: Number(destinatario), chaveIdempotencia: key(), observacoes, itens: linhas.map((l) => ({ posicaoId: Number(l.posicaoId), quantidade: Number(l.quantidade) })) });
      setOk('Entrega criada e notificação enviada.'); setDestinatario(''); setObservacoes(''); setLinhas([{ posicaoId: '', quantidade: '1' }]); await carregar();
    } catch { setErro('Não foi possível criar a entrega. Verifique destinatário, itens e saldo.'); }
  };
  return <main className="p-3"><h1>Entregas EPI</h1><p className="text-muted">Materiais de uso do funcionário; não mistura itens de compras.</p>{erro && <Alert variant="danger">{erro}</Alert>}{ok && <Alert variant="success">{ok}</Alert>}
    <Form onSubmit={criar} className="border rounded p-3 mb-4"><h2 className="h5">Nova entrega</h2><Form.Select required value={destinatario} onChange={(e) => setDestinatario(e.target.value)} aria-label="Destinatário"><option value="">Selecione o destinatário</option>{usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}</Form.Select>
      {linhas.map((linha, i) => <div className="row g-2 mt-2" key={i}><div className="col-md-7"><Form.Select required value={linha.posicaoId} aria-label={`Material ${i + 1}`} onChange={(e) => setLinhas((v) => v.map((x, j) => j === i ? { ...x, posicaoId: e.target.value } : x))}><option value="">Material/variante</option>{posicoes.map((p) => <option key={p.id} value={p.id}>{p.material.nome} {p.variante?.tamanho || p.variante?.descricao || ''} — saldo {p.saldo}</option>)}</Form.Select></div><div className="col-md-3"><Form.Control required type="number" min="0.001" step="0.001" value={linha.quantidade} aria-label={`Quantidade ${i + 1}`} onChange={(e) => setLinhas((v) => v.map((x, j) => j === i ? { ...x, quantidade: e.target.value } : x))} /></div>{linhas.length > 1 && <div className="col-md-2"><Button variant="outline-danger" onClick={() => setLinhas((v) => v.filter((_, j) => j !== i))}>Remover</Button></div>}</div>)}
      <Button variant="outline-secondary" className="mt-2" onClick={() => setLinhas((v) => [...v, { posicaoId: '', quantidade: '1' }])}>Adicionar item</Button><Form.Control className="mt-2" as="textarea" placeholder="Observações (opcional)" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} /><Button className="mt-2" type="submit">Criar entrega</Button>
    </Form><Table responsive hover><thead><tr><th>ID</th><th>Destinatário</th><th>Itens</th><th>Status</th><th>Criada em</th></tr></thead><tbody>{entregas.map((e) => <tr key={e.id}><td>{e.id}</td><td>{usuarios.find((u) => u.id === e.funcionarioId)?.nome ?? e.funcionarioId}</td><td>{e.itens.map((i) => `${i.materialNomeSnapshot} (${i.quantidade})`).join(', ')}</td><td><Badge bg={e.status === 'ACEITO' ? 'success' : e.status === 'RECUSADO' ? 'danger' : 'secondary'}>{e.status}</Badge></td><td>{new Date(e.criadoEm).toLocaleString('pt-BR')}</td><td><Button size="sm" variant="outline-primary" onClick={() => void abrir(e.id)}>Detalhar</Button></td></tr>)}</tbody></Table>{detalhe && <section className="border rounded p-3"><h2 className="h5">Entrega #{detalhe.id}</h2><ul>{detalhe.itens.map((i, n) => <li key={n}>{i.materialNomeSnapshot} — {i.quantidade}</li>)}</ul>{detalhe.status === 'PENDENTE' && <Button variant="outline-danger" onClick={() => void cancelar()}>Cancelar entrega</Button>}</section>}</main>;
}
