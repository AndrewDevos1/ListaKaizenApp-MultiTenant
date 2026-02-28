import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { StatusSubmissao } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateListaDto } from './dto/create-lista.dto';
import { UpdateListaDto } from './dto/update-lista.dto';
import { AtualizarEstoqueDto } from './dto/atualizar-estoque.dto';
import { UpdateItemRefDto } from './dto/update-item-ref.dto';

@Injectable()
export class ListasService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateListaDto, restauranteId: number) {
    const { colaboradorIds, ...rest } = dto;
    const lista = await this.prisma.lista.create({
      data: { ...rest, restauranteId },
    });
    if (colaboradorIds && colaboradorIds.length > 0) {
      await this.prisma.listaColaborador.createMany({
        data: colaboradorIds.map((uid) => ({ listaId: lista.id, usuarioId: uid })),
        skipDuplicates: true,
      });
    }
    return lista;
  }

  async findAll(restauranteId: number) {
    return this.prisma.lista.findMany({
      where: { restauranteId, deletado: false },
      include: {
        area: { select: { id: true, nome: true } },
        _count: { select: { colaboradores: true, itensRef: true } },
        itensRef: {
          orderBy: { id: 'asc' },
          include: { item: { select: { nome: true, unidadeMedida: true } } },
        },
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async findAllDeleted(restauranteId: number) {
    return this.prisma.lista.findMany({
      where: { restauranteId, deletado: true },
      include: { _count: { select: { itensRef: true } } },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async restore(id: number, restauranteId: number) {
    const lista = await this.prisma.lista.findFirst({
      where: { id, restauranteId, deletado: true },
    });
    if (!lista) throw new NotFoundException('Lista não encontrada na lixeira');
    return this.prisma.lista.update({ where: { id }, data: { deletado: false } });
  }

  async permanentDelete(id: number, restauranteId: number) {
    const lista = await this.prisma.lista.findFirst({
      where: { id, restauranteId, deletado: true },
    });
    if (!lista) throw new NotFoundException('Lista não encontrada na lixeira');
    return this.prisma.lista.delete({ where: { id } });
  }

  async findOne(id: number, restauranteId: number) {
    const lista = await this.prisma.lista.findFirst({
      where: { id, restauranteId, deletado: false },
      include: {
        colaboradores: {
          include: { usuario: { select: { id: true, nome: true, email: true } } },
        },
        itensRef: {
          include: { item: true },
        },
      },
    });
    if (!lista) {
      throw new NotFoundException('Lista não encontrada');
    }
    return lista;
  }

  async update(id: number, dto: UpdateListaDto, restauranteId: number) {
    await this.findOne(id, restauranteId);
    const { colaboradorIds, ...data } = dto;
    return this.prisma.lista.update({ where: { id }, data });
  }

  async remove(id: number, restauranteId: number) {
    await this.findOne(id, restauranteId);
    return this.prisma.lista.update({
      where: { id },
      data: { deletado: true },
    });
  }

  // Colaboradores
  async addColaborador(listaId: number, usuarioId: number, restauranteId: number) {
    await this.findOne(listaId, restauranteId);

    const existing = await this.prisma.listaColaborador.findUnique({
      where: { listaId_usuarioId: { listaId, usuarioId } },
    });
    if (existing) {
      throw new ConflictException('Colaborador já vinculado a esta lista');
    }

    return this.prisma.listaColaborador.create({
      data: { listaId, usuarioId },
      include: { usuario: { select: { id: true, nome: true, email: true } } },
    });
  }

  async removeColaborador(listaId: number, usuarioId: number, restauranteId: number) {
    await this.findOne(listaId, restauranteId);

    const record = await this.prisma.listaColaborador.findUnique({
      where: { listaId_usuarioId: { listaId, usuarioId } },
    });
    if (!record) {
      throw new NotFoundException('Colaborador não vinculado a esta lista');
    }

    return this.prisma.listaColaborador.delete({
      where: { id: record.id },
    });
  }

  // Item refs
  async addItemRef(
    listaId: number,
    itemId: number,
    quantidadeMinima: number,
    restauranteId: number,
  ) {
    await this.findOne(listaId, restauranteId);

    const existing = await this.prisma.listaItemRef.findUnique({
      where: { listaId_itemId: { listaId, itemId } },
    });
    if (existing) {
      throw new ConflictException('Item já está nesta lista');
    }

    return this.prisma.listaItemRef.create({
      data: { listaId, itemId, quantidadeMinima },
      include: { item: true },
    });
  }

  async removeItemRef(listaId: number, itemId: number, restauranteId: number) {
    await this.findOne(listaId, restauranteId);

    const record = await this.prisma.listaItemRef.findUnique({
      where: { listaId_itemId: { listaId, itemId } },
    });
    if (!record) {
      throw new NotFoundException('Item não está nesta lista');
    }

    return this.prisma.listaItemRef.delete({
      where: { id: record.id },
    });
  }

  async getListaItens(listaId: number, restauranteId: number) {
    await this.findOne(listaId, restauranteId);

    return this.prisma.listaItemRef.findMany({
      where: { listaId },
      include: { item: true },
      orderBy: { item: { nome: 'asc' } },
    });
  }

  // Collaborator: minhas listas
  async getMinhasListas(userId: number) {
    return this.prisma.lista.findMany({
      where: {
        deletado: false,
        colaboradores: { some: { usuarioId: userId } },
      },
      include: {
        _count: { select: { itensRef: true } },
      },
      orderBy: { nome: 'asc' },
    });
  }

  // Tarefa 1.1 — Atualizar estoque (colaborador)
  async atualizarEstoque(
    listaId: number,
    restauranteId: number,
    dto: AtualizarEstoqueDto,
  ) {
    // Verifica que a lista pertence ao restaurante do usuário
    await this.findOne(listaId, restauranteId);

    // Verifica que cada itemRefId pertence à lista informada (isolamento multi-tenant)
    const itemRefIds = dto.itens.map((i) => i.itemRefId);
    const refsValidas = await this.prisma.listaItemRef.findMany({
      where: { id: { in: itemRefIds }, listaId },
      select: { id: true },
    });

    if (refsValidas.length !== itemRefIds.length) {
      throw new NotFoundException(
        'Um ou mais itens não pertencem à lista informada',
      );
    }

    const atualizados = await Promise.all(
      dto.itens.map((item) =>
        this.prisma.listaItemRef.update({
          where: { id: item.itemRefId },
          data: { quantidadeAtual: item.quantidadeAtual },
          include: { item: true },
        }),
      ),
    );

    return atualizados;
  }

  // Tarefa 2.4 — Atualizar configuração de item ref (usaThreshold, qtdFardo, quantidadeMinima)
  async updateItemRef(
    listaId: number,
    itemRefId: number,
    dto: UpdateItemRefDto,
    restauranteId: number,
  ) {
    // Verificar que a lista pertence ao restaurante
    await this.findOne(listaId, restauranteId);

    // Verificar que o itemRef pertence à lista
    const itemRef = await this.prisma.listaItemRef.findFirst({
      where: { id: itemRefId, listaId },
    });
    if (!itemRef) {
      throw new NotFoundException('Item não encontrado nesta lista');
    }

    return this.prisma.listaItemRef.update({
      where: { id: itemRefId },
      data: dto,
      include: { item: { select: { id: true, nome: true, unidadeMedida: true } } },
    });
  }

  // Assign todos os colaboradores de uma vez (substitui os atuais)
  async assign(listaId: number, colaboradorIds: number[], restauranteId: number) {
    await this.findOne(listaId, restauranteId);
    await this.prisma.listaColaborador.deleteMany({ where: { listaId } });
    if (colaboradorIds.length > 0) {
      await this.prisma.listaColaborador.createMany({
        data: colaboradorIds.map((uid) => ({ listaId, usuarioId: uid })),
        skipDuplicates: true,
      });
    }
    return { ok: true };
  }

  // Deletar permanentemente em lote (da lixeira)
  async permanentDeleteBatch(ids: number[], restauranteId: number) {
    const valid = await this.prisma.lista.findMany({
      where: { id: { in: ids }, restauranteId, deletado: true },
      select: { id: true },
    });
    const validIds = valid.map((l) => l.id);
    await this.prisma.lista.deleteMany({ where: { id: { in: validIds } } });
    return { deletados: validIds.length };
  }

  // Exportar itens como CSV
  async exportCsv(listaId: number, restauranteId: number) {
    await this.findOne(listaId, restauranteId);
    const itens = await this.prisma.listaItemRef.findMany({
      where: { listaId },
      include: { item: { select: { nome: true, unidadeMedida: true } } },
      orderBy: { item: { nome: 'asc' } },
    });
    const header = 'nome,unidade,quantidade_minima';
    const rows = itens.map(
      (i) => `"${i.item.nome}","${i.item.unidadeMedida}",${i.quantidadeMinima}`,
    );
    return { csv: [header, ...rows].join('\n') };
  }

  // Importar itens de CSV
  async importFromCsv(listaId: number, texto: string, restauranteId: number) {
    await this.findOne(listaId, restauranteId);
    const lines = texto.split('\n').map((l) => l.trim()).filter(Boolean);
    const dataLines = lines[0]?.toLowerCase().startsWith('nome') ? lines.slice(1) : lines;

    let adicionados = 0;
    let ignorados = 0;

    for (const line of dataLines) {
      const cols = (line.match(/(?:"([^"]*)")|([^,]+)/g) ?? []).map((c) =>
        c.replace(/^"|"$/g, '').trim(),
      );
      const nome = cols[0];
      if (!nome) continue;
      const quantidadeMinima = parseFloat(cols[2] || '0') || 0;

      const item = await this.prisma.item.findFirst({
        where: { nome: { equals: nome, mode: 'insensitive' }, restauranteId },
      });
      if (!item) { ignorados++; continue; }

      const existing = await this.prisma.listaItemRef.findUnique({
        where: { listaId_itemId: { listaId, itemId: item.id } },
      });
      if (existing) { ignorados++; continue; }

      await this.prisma.listaItemRef.create({
        data: { listaId, itemId: item.id, quantidadeMinima },
      });
      adicionados++;
    }
    return { adicionados, ignorados };
  }

  // Tarefa 1.3 — Submeter lista (colaborador)
  async submeterLista(
    listaId: number,
    restauranteId: number,
    usuarioId: number,
  ) {
    // Busca todos os itensRef da lista
    await this.findOne(listaId, restauranteId);

    const itensRef = await this.prisma.listaItemRef.findMany({
      where: { listaId },
      include: { item: true },
    });

    // Calcula qtdSolicitada para cada item
    const itensSolicitados = itensRef
      .map((ref) => ({
        itemId: ref.itemId,
        qtdSolicitada: Math.max(0, ref.quantidadeMinima - ref.quantidadeAtual),
      }))
      .filter((i) => i.qtdSolicitada > 0);

    // Se nenhum item precisar de reposição, retorna 422
    if (itensSolicitados.length === 0) {
      throw new UnprocessableEntityException(
        'Todos os itens estão acima do mínimo',
      );
    }

    // Cria a Submissao com os Pedidos em uma transação
    const submissao = await this.prisma.submissao.create({
      data: {
        listaId,
        usuarioId,
        restauranteId,
        status: StatusSubmissao.PENDENTE,
        pedidos: {
          create: itensSolicitados.map((i) => ({
            itemId: i.itemId,
            qtdSolicitada: i.qtdSolicitada,
          })),
        },
      },
      include: {
        pedidos: {
          include: { item: true },
        },
      },
    });

    return submissao;
  }
}
