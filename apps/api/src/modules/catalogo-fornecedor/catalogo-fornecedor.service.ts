import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LinhaCatalogo, normalizar, parseCatalogo } from './catalogo-parser';
import { CreateCatalogoItemDto, UpdateCatalogoItemDto } from './dto/catalogo.dto';

type Acao = 'NOVO' | 'IGNORAR' | 'REVISAO' | 'INVALIDO';
type LinhaPreview = LinhaCatalogo & { acao: Acao; motivo?: string };
type ItemExistente = { id: number; nome: string; unidadeMedida: string; codigoFornecedor: string | null };

const PREVIEW_TTL_MS = 24 * 60 * 60 * 1000;
const dup = (e: any) => e?.code === 'P2002';
const chaveNome = (l: { nome?: string; unidadeMedida?: string }) => `${normalizar(l.nome ?? '')}|${(l.unidadeMedida ?? '').toLowerCase()}`;

@Injectable()
export class CatalogoFornecedorService {
  constructor(private readonly prisma: PrismaService) {}

  private async fornecedor(fornecedorId: number, restauranteId: number) {
    const f = await this.prisma.fornecedor.findFirst({ where: { id: fornecedorId, restauranteId }, select: { id: true } });
    if (!f) throw new NotFoundException('Fornecedor não encontrado');
  }

  private async item(fornecedorId: number, id: number, restauranteId: number) {
    const i = await this.prisma.item.findFirst({ where: { id, fornecedorId, restauranteId } });
    if (!i) throw new NotFoundException('Item não encontrado');
    return i;
  }

  async listar(fornecedorId: number, restauranteId: number, f: { q?: string; ativo?: boolean }) {
    await this.fornecedor(fornecedorId, restauranteId);
    const q = f.q?.trim();
    return this.prisma.item.findMany({
      where: {
        restauranteId, fornecedorId,
        ...(f.ativo === undefined ? {} : { ativo: f.ativo }),
        ...(q ? { OR: ['nome', 'codigoFornecedor', 'marca', 'descricao'].map((k) => ({ [k]: { contains: q, mode: 'insensitive' as const } })) } : {}),
      },
      orderBy: { nome: 'asc' },
    });
  }

  async criar(fornecedorId: number, dto: CreateCatalogoItemDto, restauranteId: number) {
    await this.fornecedor(fornecedorId, restauranteId);
    try {
      return await this.prisma.item.create({
        data: { ...dto, nome: dto.nome.trim(), unidadeMedida: dto.unidadeMedida.trim().toLowerCase(), restauranteId, fornecedorId },
      });
    } catch (e) {
      if (dup(e)) throw new ConflictException('Já existe item com este código para o fornecedor');
      throw e;
    }
  }

  /**
   * Ponto único de alteração do preço atual (contrato #35/#36). Grava o evento de histórico
   * na MESMA transação `db`; preço idêntico não gera evento nem escrita.
   */
  async atualizarPrecoItem(
    db: Prisma.TransactionClient, itemId: number, restauranteId: number, preco: number,
    autor: { id: number; nome: string }, origem: 'CATALOGO' = 'CATALOGO',
  ) {
    const item = await db.item.findFirst({ where: { id: itemId, restauranteId } });
    if (!item) throw new NotFoundException('Item não encontrado');
    const anterior = item.precoAtual === null || item.precoAtual === undefined ? null : new Prisma.Decimal(item.precoAtual as any);
    const novo = new Prisma.Decimal(preco);
    if (anterior && anterior.equals(novo)) return item;
    const atualizado = await db.item.update({ where: { id: itemId }, data: { precoAtual: preco } });
    await db.historicoPrecoItem.create({
      data: {
        itemId, restauranteId, fornecedorId: item.fornecedorId, precoAnterior: item.precoAtual as any, precoNovo: preco,
        autorId: autor.id, autorNome: autor.nome, origem,
      },
    });
    return atualizado;
  }

  async atualizar(fornecedorId: number, id: number, dto: UpdateCatalogoItemDto, restauranteId: number, autor: { id: number; nome: string }) {
    await this.fornecedor(fornecedorId, restauranteId);
    await this.item(fornecedorId, id, restauranteId);
    const { precoAtual, ...resto } = dto;
    try {
      if (precoAtual === undefined) return await this.prisma.item.update({ where: { id }, data: resto });
      return await this.prisma.$transaction(async (tx) => {
        if (Object.keys(resto).length) await tx.item.update({ where: { id }, data: resto });
        return this.atualizarPrecoItem(tx, id, restauranteId, precoAtual, autor);
      });
    } catch (e) {
      if (dup(e)) throw new ConflictException('Já existe item com este código para o fornecedor');
      throw e;
    }
  }

  async historicoPrecos(fornecedorId: number, id: number, restauranteId: number, pagina = 1, tamanho = 20) {
    await this.fornecedor(fornecedorId, restauranteId);
    await this.item(fornecedorId, id, restauranteId);
    const take = Math.min(Math.max(tamanho, 1), 100);
    const skip = (Math.max(pagina, 1) - 1) * take;
    const where = { itemId: id, restauranteId };
    const [total, eventos] = await Promise.all([
      this.prisma.historicoPrecoItem.count({ where }),
      this.prisma.historicoPrecoItem.findMany({ where, orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }], skip, take }),
    ]);
    return { total, pagina: Math.max(pagina, 1), tamanho: take, eventos };
  }

  async inativar(fornecedorId: number, id: number, restauranteId: number) {
    await this.fornecedor(fornecedorId, restauranteId);
    await this.item(fornecedorId, id, restauranteId);
    return this.prisma.item.update({ where: { id }, data: { ativo: false } });
  }

  /** Classifica linhas contra o catálogo atual e entre si. Código tem prioridade; senão nome normalizado+unidade. */
  private classificar(linhas: LinhaCatalogo[], existentes: ItemExistente[]): LinhaPreview[] {
    const porCodigo = new Map(existentes.filter((e) => e.codigoFornecedor).map((e) => [e.codigoFornecedor!.toLowerCase(), e]));
    const semCodigo = new Map(existentes.map((e) => [chaveNome(e), e]));
    const grupos = new Map<string, LinhaCatalogo[]>();
    for (const l of linhas.filter((x) => x.valida)) {
      const k = l.codigoFornecedor ? `c:${l.codigoFornecedor.toLowerCase()}` : `n:${chaveNome(l)}`;
      grupos.set(k, [...(grupos.get(k) ?? []), l]);
    }
    const conflitantes = new Set<number>();
    const repetidas = new Set<number>();
    for (const g of grupos.values()) {
      if (g.length < 2) continue;
      const mesmo = g.every((x) => chaveNome(x) === chaveNome(g[0]));
      if (mesmo) g.slice(1).forEach((x) => repetidas.add(x.linha));
      else g.forEach((x) => conflitantes.add(x.linha));
    }
    return linhas.map((l): LinhaPreview => {
      if (!l.valida) return { ...l, acao: 'INVALIDO' };
      if (conflitantes.has(l.linha)) return { ...l, acao: 'REVISAO', motivo: 'Linhas do arquivo com mesmo código e dados diferentes' };
      if (repetidas.has(l.linha)) return { ...l, acao: 'IGNORAR', motivo: 'Repetida no arquivo' };
      if (l.codigoFornecedor) {
        const e = porCodigo.get(l.codigoFornecedor.toLowerCase());
        if (e) return chaveNome(e) === chaveNome(l)
          ? { ...l, acao: 'IGNORAR', motivo: 'Já cadastrado' }
          : { ...l, acao: 'REVISAO', motivo: 'Código já existe com nome/unidade diferentes' };
        const porNome = semCodigo.get(chaveNome(l));
        if (porNome) return { ...l, acao: 'REVISAO', motivo: 'Item de mesmo nome e unidade já existe com outro código' };
        return { ...l, acao: 'NOVO' };
      }
      return semCodigo.has(chaveNome(l)) ? { ...l, acao: 'IGNORAR', motivo: 'Já cadastrado' } : { ...l, acao: 'NOVO' };
    });
  }

  private resumo(linhas: LinhaPreview[]) {
    const c = (a: Acao) => linhas.filter((l) => l.acao === a).length;
    return { total: linhas.length, novos: c('NOVO'), ignorados: c('IGNORAR'), revisao: c('REVISAO'), invalidos: c('INVALIDO') };
  }

  private existentes(fornecedorId: number, restauranteId: number, db: any = this.prisma): Promise<ItemExistente[]> {
    return db.item.findMany({ where: { restauranteId, fornecedorId }, select: { id: true, nome: true, unidadeMedida: true, codigoFornecedor: true } });
  }

  async preview(fornecedorId: number, dto: { formato: 'csv' | 'texto'; conteudo: string }, restauranteId: number, usuarioId: number) {
    await this.fornecedor(fornecedorId, restauranteId);
    const { linhas: brutas } = parseCatalogo(dto.conteudo, dto.formato);
    const linhas = this.classificar(brutas, await this.existentes(fornecedorId, restauranteId));
    const token = randomUUID();
    await this.prisma.catalogoImportacao.create({
      data: {
        token, restauranteId, fornecedorId, criadoPorId: usuarioId, formato: dto.formato,
        linhas: linhas as unknown as Prisma.InputJsonValue, expiraEm: new Date(Date.now() + PREVIEW_TTL_MS),
      },
    });
    return { token, resumo: this.resumo(linhas), linhas };
  }

  async confirmar(fornecedorId: number, token: string, restauranteId: number) {
    await this.fornecedor(fornecedorId, restauranteId);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const p = await tx.catalogoImportacao.findFirst({ where: { token, restauranteId, fornecedorId } });
        if (!p) throw new NotFoundException('Pré-visualização não encontrada');
        if (p.status === 'CONFIRMADA') return { ...(p.resultado as object), repetida: true };
        if (p.expiraEm.getTime() < Date.now()) throw new BadRequestException('Pré-visualização expirada; gere uma nova');
        const claim = await tx.catalogoImportacao.updateMany({
          where: { token, restauranteId, fornecedorId, status: 'PENDENTE' },
          data: { status: 'CONFIRMADA', confirmadoEm: new Date() },
        });
        if (claim.count !== 1) throw new ConflictException('Importação já em andamento');
        // Revalida só as linhas NOVO contra o estado atual; REVISAO/INVALIDO nunca viram gravação.
        const salvas = p.linhas as unknown as LinhaPreview[];
        const existentes = await this.existentes(fornecedorId, restauranteId, tx);
        const novas = this.classificar(salvas.filter((l) => l.acao === 'NOVO').map(({ acao: _a, motivo: _m, ...l }) => l), existentes);
        const linhas = [...novas, ...salvas.filter((l) => l.acao !== 'NOVO')];
        const invalidos = salvas.filter((l) => l.acao === 'INVALIDO').length;
        let criados = 0;
        for (const l of novas) {
          if (l.acao !== 'NOVO') continue;
          await tx.item.create({
            data: {
              nome: l.nome!, unidadeMedida: l.unidadeMedida!, codigoFornecedor: l.codigoFornecedor,
              marca: l.marca, descricao: l.descricao, precoAtual: l.precoAtual, restauranteId, fornecedorId,
            },
          });
          criados++;
        }
        const r = this.resumo(linhas);
        const resultado = { criados, ignorados: r.ignorados, revisao: r.revisao, invalidos };
        await tx.catalogoImportacao.update({ where: { token }, data: { resultado } });
        return { ...resultado, repetida: false };
      });
    } catch (e) {
      if (dup(e)) throw new ConflictException('Conflito com item existente; nada foi gravado. Gere nova pré-visualização');
      throw e;
    }
  }
}
