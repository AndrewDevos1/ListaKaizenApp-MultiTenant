import { BadRequestException } from '@nestjs/common';

export const MAX_LINHAS = 1000;

export interface LinhaCatalogo {
  linha: number;
  valida: boolean;
  erros: string[];
  codigoFornecedor?: string;
  nome?: string;
  unidadeMedida?: string;
  marca?: string;
  descricao?: string;
  precoAtual?: number;
}

export const normalizar = (v: string) =>
  v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export function decodeConteudo(buf: Buffer): string {
  let txt: string;
  try {
    txt = new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    txt = buf.toString('latin1'); // ponytail: legado também caía para latin-1
  }
  return txt.charCodeAt(0) === 0xfeff ? txt.slice(1) : txt;
}

export function parseDecimalPtBr(raw: string): number | undefined {
  const v = raw.replace(/R\$|\s/g, '');
  if (!v) return undefined;
  let n: string;
  if (v.includes(',')) {
    if (!/^\d{1,3}(\.\d{3})*,\d+$|^\d+,\d+$/.test(v)) throw new Error('preço inválido');
    n = v.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(v)) n = v.replace(/\./g, '');
  else if (/^\d+(\.\d+)?$/.test(v)) n = v;
  else throw new Error('preço inválido');
  const num = Math.round(Number(n) * 100) / 100;
  if (!Number.isFinite(num) || num >= 1e10) throw new Error('preço inválido');
  return num;
}

function splitCsv(input: string, delim: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let val = '';
  let q = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') {
      if (q && input[i + 1] === '"') { val += '"'; i++; } else q = !q;
    } else if (c === delim && !q) { row.push(val.trim()); val = ''; }
    else if ((c === '\n' || c === '\r') && !q) {
      if (c === '\r' && input[i + 1] === '\n') i++;
      row.push(val.trim()); rows.push(row); row = []; val = '';
    } else val += c;
  }
  if (q) throw new BadRequestException('CSV com aspas não fechadas');
  row.push(val.trim()); rows.push(row);
  return rows.filter((r) => r.some(Boolean));
}

const ALIAS: Record<string, string> = {
  codigo: 'codigo', 'codigo fornecedor': 'codigo', cod: 'codigo',
  nome: 'nome', produto: 'nome', item: 'nome',
  unidade: 'unidade', un: 'unidade', 'unidade medida': 'unidade',
  marca: 'marca', descricao: 'descricao', preco: 'preco', 'preco atual': 'preco',
};
const SEM_CABECALHO = ['codigo', 'nome', 'unidade', 'marca', 'descricao', 'preco'];

export function parseCatalogo(conteudo: string, formato: 'csv' | 'texto'): { linhas: LinhaCatalogo[] } {
  const input = conteudo.charCodeAt(0) === 0xfeff ? conteudo.slice(1) : conteudo;
  if (!input.trim()) throw new BadRequestException('Conteúdo vazio');
  const primeira = input.split(/\r?\n/).find((l) => l.trim()) ?? '';
  const delim = formato === 'texto' || primeira.includes(';') ? ';' : ',';
  let rows = splitCsv(input, delim);
  let cols: string[];
  let primeiraLinha = 1;
  const head = rows[0].map((h) => ALIAS[normalizar(h)]);
  if (formato === 'csv' && head.includes('nome') && head.includes('unidade')) {
    cols = head; rows = rows.slice(1); primeiraLinha = 2;
  } else if (formato === 'texto') cols = ['nome', 'unidade'];
  else if (head.includes('nome') || head.includes('unidade')) throw new BadRequestException('Cabeçalho CSV requer colunas nome e unidade');
  else cols = SEM_CABECALHO;
  if (formato === 'texto') rows = rows.filter((r) => normalizar(r[0] ?? '') !== 'produto');
  if (rows.length > MAX_LINHAS) throw new BadRequestException(`Excede o limite de ${MAX_LINHAS} linhas`);
  if (!rows.length) throw new BadRequestException('Conteúdo vazio');

  const linhas = rows.map((r, i): LinhaCatalogo => {
    const get = (k: string) => (cols.indexOf(k) >= 0 ? (r[cols.indexOf(k)] ?? '').trim() : '');
    const erros: string[] = [];
    const nome = get('nome');
    const unidade = formato === 'texto' ? get('unidade') || 'un' : get('unidade');
    if (!nome) erros.push('nome obrigatório');
    else if (nome.length > 200) erros.push('nome excede 200 caracteres');
    if (!unidade) erros.push('unidade obrigatória');
    else if (unidade.length > 20) erros.push('unidade excede 20 caracteres');
    const codigo = get('codigo');
    if (codigo.length > 60) erros.push('código excede 60 caracteres');
    let precoAtual: number | undefined;
    try { precoAtual = parseDecimalPtBr(get('preco')); } catch (e) { erros.push((e as Error).message); }
    return {
      linha: primeiraLinha + i, valida: !erros.length, erros,
      codigoFornecedor: codigo || undefined, nome: nome || undefined,
      unidadeMedida: unidade ? unidade.toLowerCase() : undefined,
      marca: get('marca') || undefined, descricao: get('descricao') || undefined, precoAtual,
    };
  });
  return { linhas };
}
