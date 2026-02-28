import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { gzipSync, gunzipSync } from 'zlib';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRestauranteDto } from './dto/create-restaurante.dto';
import { UpdateRestauranteDto } from './dto/update-restaurante.dto';

interface ResumoRestore {
  sucesso: true;
  restaurante: string;
  usuarios: { criados: number; ignorados: number };
  fornecedores: { criados: number; ignorados: number };
  itens: { criados: number; ignorados: number };
  listas: { criadas: number; ignoradas: number };
  listaItemRefs: { criados: number; ignorados: number };
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

  async getGlobalStats() {
    const [restaurantes, totalUsuarios, totalListas, totalSubmissoes, submissoesPendentes] = await Promise.all([
      this.prisma.restaurante.findMany({
        include: {
          _count: {
            select: { usuarios: true, listas: true, submissoes: true },
          },
        },
      }),
      this.prisma.usuario.count(),
      this.prisma.lista.count(),
      this.prisma.submissao.count(),
      this.prisma.submissao.count({ where: { status: 'PENDENTE' as any } }),
    ]);

    return {
      totalRestaurantes: restaurantes.length,
      totalUsuarios,
      totalListas,
      totalSubmissoes,
      submissoesPendentes,
      restaurantes: restaurantes.map((r) => ({
        id: r.id,
        nome: r.nome,
        ativo: r.ativo,
        usuarios: r._count.usuarios,
        listas: r._count.listas,
        submissoes: r._count.submissoes,
      })),
    };
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
