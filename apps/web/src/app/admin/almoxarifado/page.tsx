'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Alert, Badge, Button, Form, Nav, Table } from 'react-bootstrap';
import api from '@/lib/api';

type Material = { id: number; nome: string; categoria: string; retornavel: boolean; valorReferencia: string; ativo: boolean; variantes: { id: number; tamanho?: string | null; descricao?: string | null }[] };
type Posicao = { id: number; saldo: string; minimo: string | null; ativo: boolean; material: Material; variante?: { tamanho?: string | null; descricao?: string | null } | null };

export default function AlmoxarifadoPage() {
  const [tab, setTab] = useState('itens');
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [posicoes, setPosicoes] = useState<Posicao[]>([]);
  const [error, setError] = useState('');
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('UNIFORME');
  const [retornavel, setRetornavel] = useState(true);
  const [valorReferencia, setValorReferencia] = useState('');

  const load = async () => { try { const [m, p] = await Promise.all([api.get('/v1/admin/almoxarifado/materiais'), api.get('/v1/admin/almoxarifado')]); setMateriais(m.data); setPosicoes(p.data); } catch { setError('Não foi possível carregar o almoxarifado EPI.'); } };
  useEffect(() => { void load(); }, []);
  const createMaterial = async (event: FormEvent) => { event.preventDefault(); try { await api.post('/v1/admin/almoxarifado/materiais', { nome, categoria, retornavel, valorReferencia: Number(valorReferencia) }); setNome(''); setValorReferencia(''); await load(); } catch { setError('Não foi possível cadastrar o material.'); } };

  return <main className="p-3">
    <h1>Almoxarifado EPI</h1>
    <p className="text-muted">Materiais de uso do funcionário. Não integra compras, ingredientes ou listas.</p>
    {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
    <Nav variant="tabs" activeKey={tab} onSelect={(key) => setTab(key || 'itens')}><Nav.Item><Nav.Link eventKey="itens">Itens</Nav.Link></Nav.Item><Nav.Item><Nav.Link eventKey="estoque">Estoque</Nav.Link></Nav.Item></Nav>
    {tab === 'itens' && <section className="mt-3"><Form onSubmit={createMaterial} className="row g-2" aria-label="Cadastrar material EPI"><div className="col-md-3"><Form.Control required placeholder="Nome do material" value={nome} onChange={e => setNome(e.target.value)} /></div><div className="col-md-2"><Form.Select aria-label="Categoria" value={categoria} onChange={e => setCategoria(e.target.value)}>{['UNIFORME', 'CALCADO', 'EPI', 'FERRAMENTA', 'OUTRO'].map(x => <option key={x}>{x}</option>)}</Form.Select></div><div className="col-md-2"><Form.Control required type="number" min="0" step="0.01" placeholder="Valor referência" value={valorReferencia} onChange={e => setValorReferencia(e.target.value)} /></div><div className="col-md-2"><Form.Check label="Retornável" checked={retornavel} onChange={e => setRetornavel(e.target.checked)} /></div><div className="col-md-2"><Button type="submit">Cadastrar</Button></div></Form><Table responsive hover className="mt-3"><thead><tr><th>Material</th><th>Categoria</th><th>Retornável</th><th>Valor referência</th><th>Variantes</th></tr></thead><tbody>{materiais.map(m => <tr key={m.id}><td>{m.nome}</td><td><Badge bg="secondary">{m.categoria}</Badge></td><td>{m.retornavel ? 'Sim' : 'Não'}</td><td>R$ {m.valorReferencia}</td><td>{m.variantes.map(v => v.tamanho || v.descricao).filter(Boolean).join(', ') || '—'}</td></tr>)}</tbody></Table></section>}
    {tab === 'estoque' && <section className="mt-3"><Table responsive hover><thead><tr><th>Material</th><th>Variante</th><th>Saldo disponível</th><th>Status</th></tr></thead><tbody>{posicoes.map(p => <tr key={p.id}><td>{p.material.nome}</td><td>{p.variante?.tamanho || p.variante?.descricao || '—'}</td><td>{p.saldo}</td><td>{p.ativo ? 'Ativo' : 'Inativo'}</td></tr>)}</tbody></Table></section>}
  </main>;
}
