'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Alert, Badge, Button, Form, Modal, Spinner, Table } from 'react-bootstrap';
import api from '@/lib/api';

interface CatalogoItem {
  id: number; nome: string; unidadeMedida: string; codigoFornecedor: string | null;
  marca: string | null; descricao: string | null; precoAtual: string | null; ativo: boolean;
}
interface LinhaPreview { linha: number; acao: 'NOVO' | 'IGNORAR' | 'REVISAO' | 'INVALIDO'; nome?: string; unidadeMedida?: string; codigoFornecedor?: string; precoAtual?: number; motivo?: string; erros: string[] }
interface Preview { token: string; resumo: { total: number; novos: number; ignorados: number; revisao: number; invalidos: number }; linhas: LinhaPreview[] }
interface EventoPreco { id: number; precoAnterior: string | null; precoNovo: string; autorNome: string; origem: string; criadoEm: string }
interface HistoricoPage { total: number; pagina: number; tamanho: number; eventos: EventoPreco[] }
const VAZIO = { nome: '', unidadeMedida: '', codigoFornecedor: '', marca: '', descricao: '', precoAtual: '' };
const msg = (e: unknown) => ((e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message ?? 'Erro inesperado').toString();
const brl = (v: string | null) => (v == null ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

export default function CatalogoFornecedorPage() {
  const fornecedorId = useParams().id as string;
  const base = `/v1/admin/fornecedores/${fornecedorId}/itens`;
  const [itens, setItens] = useState<CatalogoItem[]>([]);
  const [q, setQ] = useState('');
  const [ativo, setAtivo] = useState('true');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [edit, setEdit] = useState<{ id?: number; f: typeof VAZIO } | null>(null);
  const [imp, setImp] = useState<{ formato: 'csv' | 'texto'; conteudo: string; preview?: Preview } | null>(null);
  const [busy, setBusy] = useState(false);
  const [hist, setHist] = useState<{ item: CatalogoItem; pagina: number; dados?: HistoricoPage } | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<CatalogoItem[]>(base, { params: { ...(q.trim() ? { q: q.trim() } : {}), ...(ativo ? { ativo } : {}) } });
      setItens(data); setError('');
    } catch (e) { setError(msg(e)); } finally { setLoading(false); }
  }, [base, q, ativo]);
  useEffect(() => { void carregar(); }, [carregar]);

  const salvar = async () => {
    if (!edit) return;
    setBusy(true);
    const { precoAtual, codigoFornecedor, marca, descricao, ...req } = edit.f;
    const body = { ...req, ...(codigoFornecedor ? { codigoFornecedor } : {}), ...(marca ? { marca } : {}), ...(descricao ? { descricao } : {}), ...(precoAtual ? { precoAtual: Number(precoAtual.replace(/\./g, '').replace(',', '.')) } : {}) };
    try {
      if (edit.id) await api.put(`${base}/${edit.id}`, body); else await api.post(base, body);
      setEdit(null); setOk('Item salvo'); await carregar();
    } catch (e) { setError(msg(e)); } finally { setBusy(false); }
  };
  const abrirHistorico = async (item: CatalogoItem, pagina = 1) => {
    setHist({ item, pagina });
    try { const { data } = await api.get<HistoricoPage>(`${base}/${item.id}/historico-precos`, { params: { pagina, tamanho: 10 } }); setHist({ item, pagina, dados: data }); }
    catch (e) { setError(msg(e)); setHist(null); }
  };
  const inativar = async (i: CatalogoItem) => {
    if (!window.confirm(`Inativar "${i.nome}"?`)) return;
    try { await api.delete(`${base}/${i.id}`); setOk('Item inativado'); await carregar(); } catch (e) { setError(msg(e)); }
  };
  const previa = async () => {
    if (!imp) return;
    setBusy(true);
    try { const { data } = await api.post<Preview>(`${base}/importacao/preview`, { formato: imp.formato, conteudo: imp.conteudo }); setImp({ ...imp, preview: data }); setError(''); }
    catch (e) { setError(msg(e)); } finally { setBusy(false); }
  };
  const confirmar = async () => {
    if (!imp?.preview) return;
    setBusy(true);
    try {
      const { data } = await api.post(`${base}/importacao/confirmar`, { token: imp.preview.token });
      setImp(null); setOk(`Importação concluída: ${data.criados} criados, ${data.ignorados} ignorados, ${data.revisao} em revisão, ${data.invalidos} inválidos${data.repetida ? ' (já confirmada antes)' : ''}`);
      await carregar();
    } catch (e) { setError(msg(e)); } finally { setBusy(false); }
  };
  const lerArquivo = async (file?: File) => {
    if (!file || !imp) return;
    const buf = new Uint8Array(await file.arrayBuffer());
    let txt: string;
    try { txt = new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch { txt = new TextDecoder('latin1').decode(buf); }
    setImp({ ...imp, conteudo: txt, preview: undefined });
  };
  const campo = (k: keyof typeof VAZIO, label: string, extra: object = {}) => (
    <Form.Group className="mb-2" controlId={`cat-${k}`}>
      <Form.Label>{label}</Form.Label>
      <Form.Control value={edit!.f[k]} onChange={(e) => setEdit({ ...edit!, f: { ...edit!.f, [k]: e.target.value } })} {...extra} />
    </Form.Group>
  );

  return (
    <div style={{ padding: '1.5rem' }}>
      <Link href={`/admin/fornecedores/${fornecedorId}`}>← Voltar ao fornecedor</Link>
      <h1 className="h3 my-3">Catálogo do fornecedor</h1>
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {ok && <Alert variant="success" dismissible onClose={() => setOk('')}>{ok}</Alert>}
      <div className="d-flex gap-2 flex-wrap mb-3">
        <Form.Control style={{ maxWidth: 260 }} placeholder="Buscar nome, código, marca" aria-label="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
        <Form.Select style={{ maxWidth: 160 }} aria-label="Situação" value={ativo} onChange={(e) => setAtivo(e.target.value)}>
          <option value="true">Ativos</option><option value="false">Inativos</option><option value="">Todos</option>
        </Form.Select>
        <Button onClick={() => setEdit({ f: VAZIO })}>Novo item</Button>
        <Button variant="outline-primary" onClick={() => setImp({ formato: 'csv', conteudo: '' })}>Importar CSV/texto</Button>
      </div>
      {loading ? <Spinner animation="border" /> : (
        <Table responsive hover size="sm">
          <thead><tr><th>Código</th><th>Nome</th><th>Un.</th><th>Marca</th><th>Preço</th><th>Situação</th><th /></tr></thead>
          <tbody>
            {itens.map((i) => (
              <tr key={i.id}>
                <td>{i.codigoFornecedor ?? '—'}</td><td>{i.nome}</td><td>{i.unidadeMedida}</td><td>{i.marca ?? '—'}</td><td>{brl(i.precoAtual)}</td>
                <td><Badge bg={i.ativo ? 'success' : 'secondary'}>{i.ativo ? 'Ativo' : 'Inativo'}</Badge></td>
                <td className="text-nowrap">
                  <Button size="sm" variant="outline-secondary" className="me-1" onClick={() => abrirHistorico(i)}>Histórico</Button>
                  <Button size="sm" variant="outline-secondary" className="me-1" onClick={() => setEdit({ id: i.id, f: { nome: i.nome, unidadeMedida: i.unidadeMedida, codigoFornecedor: i.codigoFornecedor ?? '', marca: i.marca ?? '', descricao: i.descricao ?? '', precoAtual: i.precoAtual ? i.precoAtual.replace('.', ',') : '' } })}>Editar</Button>
                  {i.ativo && <Button size="sm" variant="outline-danger" onClick={() => inativar(i)}>Inativar</Button>}
                </td>
              </tr>
            ))}
            {!itens.length && <tr><td colSpan={7} className="text-center text-muted">Nenhum item</td></tr>}
          </tbody>
        </Table>
      )}

      <Modal show={!!edit} onHide={() => setEdit(null)}>
        <Modal.Header closeButton><Modal.Title>{edit?.id ? 'Editar item' : 'Novo item'}</Modal.Title></Modal.Header>
        <Modal.Body>
          {edit && <>{campo('nome', 'Nome', { required: true })}{campo('unidadeMedida', 'Unidade', { required: true })}{campo('codigoFornecedor', 'Código do fornecedor')}{campo('marca', 'Marca')}{campo('descricao', 'Descrição', { as: 'textarea', rows: 2 })}{campo('precoAtual', 'Preço atual (ex.: 1.234,56)')}</>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEdit(null)}>Cancelar</Button>
          <Button disabled={busy || !edit?.f.nome.trim() || !edit?.f.unidadeMedida.trim()} onClick={salvar}>Salvar</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={!!imp} onHide={() => setImp(null)} size="lg">
        <Modal.Header closeButton><Modal.Title>Importar itens</Modal.Title></Modal.Header>
        <Modal.Body>
          {imp && <>
            <Form.Select className="mb-2" aria-label="Formato" value={imp.formato} onChange={(e) => setImp({ ...imp, formato: e.target.value as 'csv' | 'texto', preview: undefined })}>
              <option value="csv">CSV (codigo;nome;unidade;marca;descricao;preco)</option><option value="texto">Texto (um item por linha)</option>
            </Form.Select>
            <Form.Control className="mb-2" type="file" accept=".csv,.txt,text/csv,text/plain" aria-label="Arquivo" onChange={(e) => lerArquivo((e.target as HTMLInputElement).files?.[0])} />
            <Form.Control as="textarea" rows={6} aria-label="Conteúdo" placeholder="Cole o conteúdo aqui" value={imp.conteudo} onChange={(e) => setImp({ ...imp, conteudo: e.target.value, preview: undefined })} />
            {imp.preview && <div className="mt-3">
              <p><Badge bg="success">{imp.preview.resumo.novos} novos</Badge> <Badge bg="secondary">{imp.preview.resumo.ignorados} ignorados</Badge> <Badge bg="warning" text="dark">{imp.preview.resumo.revisao} em revisão</Badge> <Badge bg="danger">{imp.preview.resumo.invalidos} inválidos</Badge></p>
              <Table size="sm" responsive><thead><tr><th>Linha</th><th>Ação</th><th>Código</th><th>Nome</th><th>Un.</th><th>Obs.</th></tr></thead>
                <tbody>{imp.preview.linhas.map((l) => <tr key={l.linha}><td>{l.linha}</td><td>{l.acao}</td><td>{l.codigoFornecedor ?? ''}</td><td>{l.nome ?? ''}</td><td>{l.unidadeMedida ?? ''}</td><td>{l.motivo ?? l.erros.join('; ')}</td></tr>)}</tbody></Table>
              <small className="text-muted">Somente linhas &quot;NOVO&quot; serão gravadas. Revisão e inválidas não alteram o cadastro.</small>
            </div>}
          </>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setImp(null)}>Cancelar</Button>
          <Button variant="outline-primary" disabled={busy || !imp?.conteudo.trim()} onClick={previa}>Pré-visualizar</Button>
          <Button disabled={busy || !imp?.preview || imp.preview.resumo.novos === 0} onClick={confirmar}>Confirmar importação</Button>
        </Modal.Footer>
      </Modal>
      <Modal show={!!hist} onHide={() => setHist(null)} size="lg">
        <Modal.Header closeButton><Modal.Title>Histórico de preços — {hist?.item.nome}</Modal.Title></Modal.Header>
        <Modal.Body>
          {!hist?.dados ? <Spinner animation="border" size="sm" /> : hist.dados.eventos.length === 0 ? <p className="text-muted mb-0">Nenhuma alteração de preço registrada.</p> : (
            <Table size="sm" responsive>
              <thead><tr><th>Data</th><th>Anterior</th><th>Novo</th><th>Autor</th></tr></thead>
              <tbody>{hist.dados.eventos.map((e) => (
                <tr key={e.id}><td>{new Date(e.criadoEm).toLocaleString('pt-BR')}</td><td>{brl(e.precoAnterior)}</td><td>{brl(e.precoNovo)}</td><td>{e.autorNome}</td></tr>
              ))}</tbody>
            </Table>
          )}
        </Modal.Body>
        <Modal.Footer>
          {hist?.dados && <span className="me-auto small text-muted">{hist.dados.total} evento(s)</span>}
          <Button variant="outline-secondary" size="sm" disabled={!hist || hist.pagina <= 1} onClick={() => hist && abrirHistorico(hist.item, hist.pagina - 1)}>Anterior</Button>
          <Button variant="outline-secondary" size="sm" disabled={!hist?.dados || hist.pagina * hist.dados.tamanho >= hist.dados.total} onClick={() => hist && abrirHistorico(hist.item, hist.pagina + 1)}>Próxima</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
