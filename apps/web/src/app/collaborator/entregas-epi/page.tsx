'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Form, Table } from 'react-bootstrap';
import api from '@/lib/api';

type Item = { materialNomeSnapshot: string; varianteSnapshot?: string | null; quantidade: string };
type Entrega = { id: number; status: string; statusFisico: string; statusAceite: string; entregueFisicamenteEm?: string | null; criadoEm: string; aceitoEm?: string | null; recusadoEm?: string | null; justificativaRecusa?: string | null; observacoes?: string | null; itens: Item[] };

export default function MinhasEntregasEpiPage() {
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [selecionada, setSelecionada] = useState<Entrega | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [erro, setErro] = useState('');
  const carregar = async () => { try { const { data } = await api.get('/v1/collaborator/entregas-epi'); setEntregas(data); } catch { setErro('Não foi possível carregar suas entregas.'); } };
  useEffect(() => { void carregar(); }, []);
  const abrir = async (id: number) => { try { const { data } = await api.get(`/v1/collaborator/entregas-epi/${id}`); setSelecionada(data); } catch { setErro('Entrega não encontrada.'); } };
  const decidir = async (status: 'aceitar' | 'recusar') => { if (!selecionada) return; try { await api.post(`/v1/collaborator/entregas-epi/${selecionada.id}/${status}`, status === 'recusar' ? { justificativa, chaveIdempotencia: `recusa-${selecionada.id}-${Date.now()}` } : { chaveIdempotencia: `aceite-${selecionada.id}` }); setJustificativa(''); await carregar(); await abrir(selecionada.id); } catch { setErro(status === 'recusar' ? 'Informe uma justificativa para recusar.' : 'Não foi possível aceitar a entrega.'); } };
  return <main className="p-3"><h1>Minhas entregas EPI</h1><p className="text-muted">Confira os materiais recebidos. Aceite somente o que recebeu.</p>{erro && <Alert variant="danger" dismissible onClose={() => setErro('')}>{erro}</Alert>}<Table responsive hover><thead><tr><th>Entrega</th><th>Itens</th><th>Entrega física</th><th>Aceite eletrônico</th><th>Data</th><th /></tr></thead><tbody>{entregas.map((e) => <tr key={e.id}><td>#{e.id}</td><td>{e.itens.map((i) => `${i.materialNomeSnapshot} (${i.quantidade})`).join(', ')}</td><td>{e.statusFisico === 'ENTREGUE' ? `Entregue em ${new Date(e.entregueFisicamenteEm!).toLocaleString('pt-BR')}` : e.statusFisico}</td><td><Badge bg={e.statusAceite === 'ACEITO' ? 'success' : e.statusAceite === 'RECUSADO' ? 'danger' : 'warning'}>{e.statusAceite === 'ACEITO' && e.aceitoEm ? `Aceito em ${new Date(e.aceitoEm).toLocaleString('pt-BR')}` : e.statusAceite === 'PENDENTE' ? 'Aceite pendente' : 'Recusado'}</Badge></td><td>{new Date(e.criadoEm).toLocaleString('pt-BR')}</td><td><Button size="sm" variant="outline-primary" onClick={() => void abrir(e.id)}>Detalhar</Button></td></tr>)}</tbody></Table>{selecionada && <Card className="mt-4"><Card.Header>Entrega #{selecionada.id}</Card.Header><Card.Body><ul>{selecionada.itens.map((i, n) => <li key={n}>{i.materialNomeSnapshot} — {i.quantidade}{i.varianteSnapshot ? ` — ${i.varianteSnapshot}` : ''}</li>)}</ul>{selecionada.observacoes && <p>Observações: {selecionada.observacoes}</p>}{selecionada.justificativaRecusa && <p>Justificativa: {selecionada.justificativaRecusa}</p>}{selecionada.statusAceite === 'PENDENTE' && selecionada.status !== 'CANCELADO' && <div className="d-flex gap-2"><Button onClick={() => void decidir('aceitar')}>Aceitar entrega</Button><Form.Control placeholder="Justificativa da recusa" value={justificativa} onChange={(e) => setJustificativa(e.target.value)} /><Button variant="outline-danger" onClick={() => void decidir('recusar')} disabled={!justificativa.trim()}>Recusar</Button></div>}<Link className="btn btn-link" href="/collaborator/entregas-epi">Atualizar</Link></Card.Body></Card>}</main>;
}
