import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { gzipSync, gunzipSync } from 'zlib';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRestauranteDto } from './dto/create-restaurante.dto';
import { UpdateRestauranteDto } from './dto/update-restaurante.dto';

export interface ResumoRestore {
  sucesso: true;
  restaurante: string;
  usuarios: { criados: number; ignorados: number };
  fornecedores: { criados: number; ignorados: number };
  itens: { criados: number; ignorados: number };
  listas: { criadas: number; ignoradas: number };
  listaItemRefs: { criados: number; ignorados: number };
}

interface DashboardGlobalOptions {
  restauranteId?: number;
  period?: number;
}

interface SerieTemporalRow {
  dia: string;
  total: number | bigint;
}

@Injectable()
export class RestaurantesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRestauranteDto) {
    return this.prisma.restaurante.create({ data: dto });
  }

  async findAll() {
    return this.prisma.restaurante.findMany({
      include: { _count: { select: { usuarios: true } } },
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(id: number) {
    const restaurante = await this.prisma.restaurante.findUnique({
      where: { id },
      include: {
        _count: { select: { usuarios: true, items: true, listas: true } },
      },
    });
    if (!restaurante) {
      throw new NotFoundException('Restaurante não encontrado');
    }
    return restaurante;
  }

  async update(id: number, dto: UpdateRestauranteDto) {
    await this.findOne(id);
    return this.prisma.restaurante.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.restaurante.update({
      where: { id },
      data: { ativo: false },
    });
  }

  async getGlobalStats(options: DashboardGlobalOptions = {}) {
    const period = this.normalizePeriod(options.period);
    const now = new Date();
    const hojeInicio = new Date(now);
    hojeInicio.setHours(0, 0, 0, 0);
    const periodStart = new Date(hojeInicio);
    periodStart.setDate(periodStart.getDate() - (period - 1));

    const restauranteId = options.restauranteId;
    if (restauranteId) {
      await this.findOne(restauranteId);
    }

    const restauranteWhere = restauranteId ? { id: restauranteId } : {};
    const entidadeWhere = restauranteId ? { restauranteId } : {};

    const [restaurantesDisponiveis, restaurantesResumo, totalUsuarios, usuariosPendentesAprovacao, totalListas, totalItens, submissoesHoje, pendingCotacoes, completedCotacoes, totalSubmissoes, totalSubmissoesPendentes, checklistsAbertos, checklistsFinalizados, fornecedoresAtivos, fornecedoresInativos, usuariosAtivos, usuariosInativos, topListasRaw, logsRecentes, submissoesPendentesPorRestaurante, usuariosPendentesPorRestaurante, sugestoesPorStatus, usuariosPorRole] = await Promise.all([
      this.prisma.restaurante.findMany({
        orderBy: { nome: 'asc' },
        select: { id: true, nome: true, ativo: true },
      }),
      this.prisma.restaurante.findMany({
        where: restauranteWhere,
        orderBy: { nome: 'asc' },
        include: {
          _count: {
            select: {
              usuarios: true,
              listas: true,
              items: true,
              submissoes: true,
            },
          },
        },
      }),
      this.prisma.usuario.count({ where: entidadeWhere }),
      this.prisma.usuario.count({ where: { ...entidadeWhere, aprovado: false } }),
      this.prisma.lista.count({ where: { ...entidadeWhere, deletado: false } }),
      this.prisma.item.count({ where: entidadeWhere }),
      this.prisma.submissao.count({
        where: {
          ...entidadeWhere,
          criadoEm: { gte: hojeInicio },
        },
      }),
      this.prisma.cotacao.count({ where: { ...entidadeWhere, status: 'ABERTA' as any } }),
      this.prisma.cotacao.count({ where: { ...entidadeWhere, status: 'FECHADA' as any } }),
      this.prisma.submissao.count({
        where: {
          ...entidadeWhere,
          criadoEm: { gte: periodStart },
        },
      }),
      this.prisma.submissao.count({
        where: {
          ...entidadeWhere,
          status: 'PENDENTE' as any,
        },
      }),
      this.prisma.checklist.count({ where: { ...entidadeWhere, status: 'ABERTO' as any } }),
      this.prisma.checklist.count({ where: { ...entidadeWhere, status: 'FINALIZADO' as any } }),
      this.prisma.fornecedor.count({ where: { ...entidadeWhere, ativo: true } }),
      this.prisma.fornecedor.count({ where: { ...entidadeWhere, ativo: false } }),
      this.prisma.usuario.count({ where: { ...entidadeWhere, ativo: true } }),
      this.prisma.usuario.count({ where: { ...entidadeWhere, ativo: false } }),
      this.prisma.lista.findMany({
        where: {
          ...entidadeWhere,
          deletado: false,
        },
        include: {
          restaurante: { select: { id: true, nome: true } },
          _count: {
            select: {
              itensRef: true,
              submissoes: true,
            },
          },
        },
      }),
      this.prisma.appLog.findMany({
        where: restauranteId ? { restauranteId } : {},
        orderBy: { criadoEm: 'desc' },
        take: 12,
      }),
      this.prisma.submissao.groupBy({
        by: ['restauranteId'],
        where: {
          ...(restauranteId ? { restauranteId } : {}),
          status: 'PENDENTE' as any,
        },
        _count: { _all: true },
      }),
      this.prisma.usuario.groupBy({
        by: ['restauranteId'],
        where: {
          ...(restauranteId ? { restauranteId } : {}),
          aprovado: false,
        },
        _count: { _all: true },
      }),
      this.prisma.sugestaoItem.groupBy({
        by: ['status'],
        where: {
          ...entidadeWhere,
          criadoEm: { gte: periodStart },
        },
        _count: { _all: true },
      }),
      this.prisma.usuario.groupBy({
        by: ['role'],
        where: entidadeWhere,
        _count: { _all: true },
      }),
    ]);

    const filtroRestauranteSql = restauranteId
      ? Prisma.sql`AND "restaurante_id" = ${restauranteId}`
      : Prisma.empty;

    const [submissoesRaw, usuariosRaw] = await Promise.all([
      this.prisma.$queryRaw<SerieTemporalRow[]>(Prisma.sql`
        SELECT to_char(date("criado_em"), 'YYYY-MM-DD') AS dia, count(*)::int AS total
        FROM "submissoes"
        WHERE "criado_em" >= ${periodStart}
        ${filtroRestauranteSql}
        GROUP BY 1
        ORDER BY 1
      `),
      this.prisma.$queryRaw<SerieTemporalRow[]>(Prisma.sql`
        SELECT to_char(date("criado_em"), 'YYYY-MM-DD') AS dia, count(*)::int AS total
        FROM "usuarios"
        WHERE "criado_em" >= ${periodStart}
        ${filtroRestauranteSql}
        GROUP BY 1
        ORDER BY 1
      `),
    ]);

    const restaurantesById = new Map(
      restaurantesDisponiveis.map((restaurante) => [restaurante.id, restaurante.nome]),
    );
    const usuariosIds = [...new Set(logsRecentes.map((log) => log.usuarioId).filter((id): id is number => !!id))];
    const usuariosRecentes = usuariosIds.length === 0
      ? []
      : await this.prisma.usuario.findMany({
          where: { id: { in: usuariosIds } },
          select: { id: true, nome: true },
        });
    const usuariosById = new Map(usuariosRecentes.map((usuario) => [usuario.id, usuario.nome]));

    const submissoesPendentesMap = new Map(
      submissoesPendentesPorRestaurante
        .filter((item) => item.restauranteId !== null)
        .map((item) => [item.restauranteId, item._count._all]),
    );
    const usuariosPendentesMap = new Map(
      usuariosPendentesPorRestaurante
        .filter((item) => item.restauranteId !== null)
        .map((item) => [item.restauranteId, item._count._all]),
    );
    const sugestoesByStatus = new Map(
      sugestoesPorStatus.map((item) => [item.status, item._count._all]),
    );
    const usuariosByRole = new Map(
      usuariosPorRole.map((item) => [item.role, item._count._all]),
    );

    const topListas = [...topListasRaw]
      .sort((a, b) => b._count.submissoes - a._count.submissoes)
      .slice(0, 8)
      .map((lista) => ({
        id: lista.id,
        nome: lista.nome,
        restauranteId: lista.restauranteId,
        restauranteNome: lista.restaurante?.nome ?? 'Sem restaurante',
        itens: lista._count.itensRef,
        submissoes: lista._count.submissoes,
      }));

    const seriesSubmissoes = this.buildTimeSeries(periodStart, now, submissoesRaw);
    const seriesUsuarios = this.buildTimeSeries(periodStart, now, usuariosRaw);

    const restaurantes = restaurantesResumo.map((restaurante) => ({
      id: restaurante.id,
      nome: restaurante.nome,
      ativo: restaurante.ativo,
      usuarios: restaurante._count.usuarios,
      listas: restaurante._count.listas,
      itens: restaurante._count.items,
      submissoes: restaurante._count.submissoes,
      submissoesPendentes: submissoesPendentesMap.get(restaurante.id) ?? 0,
      aprovacoesPendentes: usuariosPendentesMap.get(restaurante.id) ?? 0,
    }));

    const summary = {
      totalRestaurantes: restaurantes.length,
      totalUsuarios,
      pendingApprovals: usuariosPendentesAprovacao,
      totalListas,
      totalItens,
      submissoesHoje,
      pendingCotacoes,
      completedCotacoes,
    };

    return {
      filtros: {
        restauranteId: restauranteId ?? null,
        period,
        generatedAt: now.toISOString(),
      },
      restaurantesDisponiveis,
      summary,
      temporal: {
        submissoesPorDia: seriesSubmissoes,
        usuariosPorDia: seriesUsuarios,
      },
      listas: {
        total: totalListas,
        top: topListas,
      },
      checklists: {
        total: checklistsAbertos + checklistsFinalizados,
        abertos: checklistsAbertos,
        finalizados: checklistsFinalizados,
      },
      users: {
        ativos: usuariosAtivos,
        inativos: usuariosInativos,
        pendingApproval: usuariosPendentesAprovacao,
        porRole: {
          SUPER_ADMIN: usuariosByRole.get('SUPER_ADMIN') ?? 0,
          ADMIN: usuariosByRole.get('ADMIN') ?? 0,
          COLLABORATOR: usuariosByRole.get('COLLABORATOR') ?? 0,
          SUPPLIER: usuariosByRole.get('SUPPLIER') ?? 0,
        },
      },
      suppliers: {
        total: fornecedoresAtivos + fornecedoresInativos,
        ativos: fornecedoresAtivos,
        inativos: fornecedoresInativos,
      },
      suggestions: {
        total:
          (sugestoesByStatus.get('PENDENTE') ?? 0) +
          (sugestoesByStatus.get('APROVADO') ?? 0) +
          (sugestoesByStatus.get('REJEITADO') ?? 0),
        pendentes: sugestoesByStatus.get('PENDENTE') ?? 0,
        aprovadas: sugestoesByStatus.get('APROVADO') ?? 0,
        rejeitadas: sugestoesByStatus.get('REJEITADO') ?? 0,
      },
      recentActivities: logsRecentes.map((log) => ({
        id: log.id,
        criadoEm: log.criadoEm,
        acao: log.acao,
        entidade: log.entidade,
        mensagem: this.buildActivityMessage(log.acao, log.entidade),
        restauranteId: log.restauranteId,
        restauranteNome: log.restauranteId ? restaurantesById.get(log.restauranteId) ?? 'Restaurante' : 'Global',
        usuarioId: log.usuarioId,
        usuarioNome: log.usuarioId ? usuariosById.get(log.usuarioId) ?? 'Usuário' : null,
      })),
      restaurantes,
      // Mantém chaves antigas por compatibilidade com consumidores legados da rota.
      totalRestaurantes: summary.totalRestaurantes,
      totalUsuarios: summary.totalUsuarios,
      totalListas: summary.totalListas,
      totalSubmissoes,
      submissoesPendentes: totalSubmissoesPendentes,
    };
  }

  private normalizePeriod(period?: number): number {
    if (!period || Number.isNaN(period)) return 30;
    if (period < 7) return 7;
    if (period > 365) return 365;
    return Math.trunc(period);
  }

  private buildTimeSeries(start: Date, end: Date, rows: SerieTemporalRow[]) {
    const map = new Map<string, number>(
      rows.map((row) => [row.dia, Number(row.total)]),
    );
    const result: Array<{ dia: string; total: number }> = [];
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);

    while (cursor <= endDate) {
      const dia = cursor.toISOString().slice(0, 10);
      result.push({
        dia,
        total: map.get(dia) ?? 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return result;
  }

  private buildActivityMessage(acao: string, entidade?: string | null) {
    const acaoNormalizada = acao
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/^\w/, (char) => char.toUpperCase());
    if (!entidade) return acaoNormalizada;
    return `${acaoNormalizada} em ${entidade}`;
  }

  async backupRestaurante(id: number): Promise<{ buffer: Buffer; filename: string }> {
    const restaurante = await this.findOne(id);

    const [usuarios, fornecedores, itens, listas] = await Promise.all([
      this.prisma.usuario.findMany({
        where: { restauranteId: id, role: { not: 'SUPER_ADMIN' as any } },
      }),
      this.prisma.fornecedor.findMany({ where: { restauranteId: id } }),
      this.prisma.item.findMany({
        where: { restauranteId: id },
        include: { fornecedor: true },
      }),
      this.prisma.lista.findMany({
        where: { restauranteId: id, deletado: false },
        include: { itensRef: { include: { item: true } } },
      }),
    ]);

    const payload = {
      _meta: {
        version: '1.0',
        formato: 'kaizen-multitenant-v1',
        criadoEm: new Date().toISOString(),
        restauranteNome: restaurante.nome,
      },
      restaurante: {
        nome: restaurante.nome,
        cnpj: restaurante.cnpj,
      },
      usuarios: usuarios.map((u) => ({
        nome: u.nome,
        email: u.email,
        username: u.username,
        role: u.role,
        senha: u.senha,
        aprovado: u.aprovado,
        ativo: u.ativo,
      })),
      fornecedores: fornecedores.map((f) => ({
        nome: f.nome,
        cnpj: f.cnpj,
        telefone: f.telefone,
        email: f.email,
        ativo: f.ativo,
      })),
      itens: itens.map((i) => ({
        nome: i.nome,
        unidadeMedida: i.unidadeMedida,
        fornecedorNome: i.fornecedor?.nome ?? null,
        ativo: i.ativo,
      })),
      listas: listas.map((l) => ({
        nome: l.nome,
        itens: l.itensRef.map((ref) => ({
          itemNome: ref.item.nome,
          quantidadeMinima: ref.quantidadeMinima,
          quantidadeAtual: ref.quantidadeAtual,
          usaThreshold: ref.usaThreshold,
          qtdFardo: ref.qtdFardo,
        })),
      })),
    };

    const buffer = gzipSync(Buffer.from(JSON.stringify(payload)));
    const date = new Date().toISOString().slice(0, 10);
    const safeName = restaurante.nome.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${safeName}_${date}.kaizen`;
    return { buffer, filename };
  }

  async restoreRestaurante(
    buffer: Buffer,
    restauranteId?: number,
  ): Promise<ResumoRestore> {
    let json: string;
    try {
      json = gunzipSync(buffer).toString('utf8');
    } catch {
      throw new BadRequestException('Arquivo corrompido ou não é um arquivo .kaizen válido');
    }

    let payload: any;
    try {
      payload = JSON.parse(json);
    } catch {
      throw new BadRequestException('Arquivo .kaizen com conteúdo JSON inválido');
    }

    if (!payload._meta || payload._meta.version !== '1.0') {
      throw new BadRequestException('Formato de arquivo .kaizen inválido');
    }

    const isNovo = payload._meta.formato === 'kaizen-multitenant-v1';

    // 1. Encontrar ou criar restaurante
    let restaurante: { id: number; nome: string };
    if (restauranteId) {
      const found = await this.prisma.restaurante.findUnique({ where: { id: restauranteId } });
      if (!found) throw new NotFoundException(`Restaurante com id ${restauranteId} não encontrado`);
      restaurante = found;
    } else {
      const nome: string = payload.restaurante?.nome;
      if (!nome) throw new BadRequestException('Nome do restaurante não encontrado no backup');
      const existing = await this.prisma.restaurante.findFirst({ where: { nome } });
      if (existing) {
        restaurante = existing;
      } else {
        restaurante = await this.prisma.restaurante.create({
          data: { nome, cnpj: payload.restaurante?.cnpj ?? undefined },
        });
      }
    }

    const rId = restaurante.id;
    const resumo: ResumoRestore = {
      sucesso: true,
      restaurante: restaurante.nome,
      usuarios: { criados: 0, ignorados: 0 },
      fornecedores: { criados: 0, ignorados: 0 },
      itens: { criados: 0, ignorados: 0 },
      listas: { criadas: 0, ignoradas: 0 },
      listaItemRefs: { criados: 0, ignorados: 0 },
    };

    // 2. Restaurar usuários
    const usuariosData: any[] = payload.usuarios ?? [];
    for (const u of usuariosData) {
      if (!u.email) continue;
      const existing = await this.prisma.usuario.findUnique({ where: { email: u.email } });
      if (existing) {
        resumo.usuarios.ignorados++;
      } else {
        await this.prisma.usuario.create({
          data: {
            nome: u.nome ?? u.email,
            email: u.email,
            username: u.username ?? null,
            senha: isNovo ? u.senha : (u.senha_hash ?? u.senha ?? ''),
            role: (u.role ?? 'COLLABORATOR') as any,
            aprovado: u.aprovado ?? true,
            ativo: u.ativo ?? true,
            restauranteId: rId,
          },
        });
        resumo.usuarios.criados++;
      }
    }

    // 3. Restaurar fornecedores
    const fornecedoresData: any[] = payload.fornecedores ?? [];
    const fornecedorMap = new Map<string, number>(); // nome → id
    for (const f of fornecedoresData) {
      if (!f.nome) continue;
      const existing = await this.prisma.fornecedor.findFirst({
        where: { nome: f.nome, restauranteId: rId },
      });
      if (existing) {
        fornecedorMap.set(f.nome, existing.id);
        resumo.fornecedores.ignorados++;
      } else {
        const created = await this.prisma.fornecedor.create({
          data: {
            nome: f.nome,
            cnpj: f.cnpj ?? null,
            telefone: f.telefone ?? null,
            email: f.email ?? null,
            ativo: f.ativo ?? true,
            restauranteId: rId,
          },
        });
        fornecedorMap.set(f.nome, created.id);
        resumo.fornecedores.criados++;
      }
    }

    // 4. Restaurar itens
    const itemMap = new Map<string, number>(); // nome → id

    if (isNovo) {
      const itensData: any[] = payload.itens ?? [];
      for (const it of itensData) {
        if (!it.nome) continue;
        const existing = await this.prisma.item.findFirst({
          where: { nome: it.nome, restauranteId: rId },
        });
        if (existing) {
          itemMap.set(it.nome, existing.id);
          resumo.itens.ignorados++;
        } else {
          const fornecedorId = it.fornecedorNome ? (fornecedorMap.get(it.fornecedorNome) ?? null) : null;
          const created = await this.prisma.item.create({
            data: {
              nome: it.nome,
              unidadeMedida: it.unidadeMedida ?? 'UN',
              ativo: it.ativo ?? true,
              restauranteId: rId,
              fornecedorId,
            },
          });
          itemMap.set(it.nome, created.id);
          resumo.itens.criados++;
        }
      }
    } else {
      // Legado: merge lista_mae_itens + itens
      const listaMaeItens: any[] = payload.lista_mae_itens ?? [];
      const itensLegado: any[] = payload.itens ?? [];
      const allItens = [
        ...listaMaeItens.map((i: any) => ({
          nome: i.nome,
          unidade: i.unidade ?? i.unidadeMedida ?? 'UN',
          fornecedorNome: null as string | null,
        })),
        ...itensLegado.map((i: any) => ({
          nome: i.nome,
          unidade: i.unidade ?? i.unidadeMedida ?? 'UN',
          fornecedorNome: (i.fornecedor_nome ?? i.fornecedorNome ?? null) as string | null,
        })),
      ];

      const seen = new Set<string>();
      for (const it of allItens) {
        if (!it.nome || seen.has(it.nome)) continue;
        seen.add(it.nome);
        const existing = await this.prisma.item.findFirst({
          where: { nome: it.nome, restauranteId: rId },
        });
        if (existing) {
          itemMap.set(it.nome, existing.id);
          resumo.itens.ignorados++;
        } else {
          const fornecedorId = it.fornecedorNome ? (fornecedorMap.get(it.fornecedorNome) ?? null) : null;
          const created = await this.prisma.item.create({
            data: {
              nome: it.nome,
              unidadeMedida: it.unidade ?? 'UN',
              ativo: true,
              restauranteId: rId,
              fornecedorId,
            },
          });
          itemMap.set(it.nome, created.id);
          resumo.itens.criados++;
        }
      }
    }

    // 5. Restaurar listas e ListaItemRef
    const listasData: any[] = payload.listas ?? [];
    for (const l of listasData) {
      if (!l.nome) continue;
      let lista: { id: number };
      const existing = await this.prisma.lista.findFirst({
        where: { nome: l.nome, restauranteId: rId, deletado: false },
      });
      if (existing) {
        lista = existing;
        resumo.listas.ignoradas++;
      } else {
        lista = await this.prisma.lista.create({
          data: { nome: l.nome, restauranteId: rId },
        });
        resumo.listas.criadas++;
      }

      const itensLista: any[] = l.itens ?? [];
      for (const ref of itensLista) {
        const nomeCampo: string | undefined = isNovo
          ? ref.itemNome
          : (ref.item_nome ?? ref.itemNome);
        if (!nomeCampo) continue;
        const itemId = itemMap.get(nomeCampo);
        if (!itemId) continue;

        const existingRef = await this.prisma.listaItemRef.findUnique({
          where: { listaId_itemId: { listaId: lista.id, itemId } },
        });
        if (existingRef) {
          resumo.listaItemRefs.ignorados++;
        } else {
          await this.prisma.listaItemRef.create({
            data: {
              listaId: lista.id,
              itemId,
              quantidadeMinima: isNovo ? (ref.quantidadeMinima ?? 0) : (ref.quantidade_minima ?? 0),
              quantidadeAtual: isNovo ? (ref.quantidadeAtual ?? 0) : (ref.quantidade_atual ?? 0),
              usaThreshold: isNovo ? (ref.usaThreshold ?? true) : (ref.usa_threshold ?? true),
              qtdFardo: isNovo ? (ref.qtdFardo ?? null) : (ref.qtd_fardo ?? null),
            },
          });
          resumo.listaItemRefs.criados++;
        }
      }
    }

    return resumo;
  }
}
