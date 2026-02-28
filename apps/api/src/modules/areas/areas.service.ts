import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { StatusSubmissao } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { SetColaboradoresDto } from './dto/set-colaboradores.dto';
import { SetListasDto } from './dto/set-listas.dto';
import { AtualizarEstoqueAreaDto } from './dto/atualizar-estoque-area.dto';

@Injectable()
export class AreasService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAreaDto, restauranteId: number) {
    return this.prisma.area.create({
      data: { ...dto, restauranteId },
    });
  }

  async findAll(restauranteId: number) {
    return this.prisma.area.findMany({
      where: { restauranteId },
      include: {
        _count: { select: { colaboradores: true, listas: true } },
      },
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(id: number, restauranteId: number) {
    const area = await this.prisma.area.findFirst({
      where: { id, restauranteId },
    });
    if (!area) {
      throw new NotFoundException('Área não encontrada');
    }
    return area;
  }

  async update(id: number, dto: UpdateAreaDto, restauranteId: number) {
    await this.findOne(id, restauranteId);
    return this.prisma.area.update({ where: { id }, data: dto });
  }

  async remove(id: number, restauranteId: number) {
    await this.findOne(id, restauranteId);
    return this.prisma.area.delete({ where: { id } });
  }

  // ─── Colaboradores ───────────────────────────────────────────────

  async getColaboradores(areaId: number, restauranteId: number) {
    await this.findOne(areaId, restauranteId);
    return this.prisma.areaColaborador.findMany({
      where: { areaId },
      include: { usuario: { select: { id: true, nome: true, email: true } } },
    });
  }

  async setColaboradores(
    areaId: number,
    dto: SetColaboradoresDto,
    restauranteId: number,
  ) {
    await this.findOne(areaId, restauranteId);
    await this.prisma.areaColaborador.deleteMany({ where: { areaId } });
    if (dto.colaboradorIds.length > 0) {
      await this.prisma.areaColaborador.createMany({
        data: dto.colaboradorIds.map((usuarioId) => ({ areaId, usuarioId })),
        skipDuplicates: true,
      });
    }
    return this.getColaboradores(areaId, restauranteId);
  }

  // ─── Listas ──────────────────────────────────────────────────────

  async getListas(areaId: number, restauranteId: number) {
    await this.findOne(areaId, restauranteId);
    return this.prisma.lista.findMany({
      where: { areaId, restauranteId, deletado: false },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    });
  }

  async setListas(
    areaId: number,
    dto: SetListasDto,
    restauranteId: number,
  ) {
    await this.findOne(areaId, restauranteId);
    // Desvincula todas as listas atuais
    await this.prisma.lista.updateMany({
      where: { areaId, restauranteId },
      data: { areaId: null },
    });
    // Vincula as novas
    if (dto.listaIds.length > 0) {
      await this.prisma.lista.updateMany({
        where: { id: { in: dto.listaIds }, restauranteId },
        data: { areaId },
      });
    }
    return this.getListas(areaId, restauranteId);
  }

  // ─── Estoque ─────────────────────────────────────────────────────

  async getEstoque(
    areaId: number,
    restauranteId: number,
    somentePendentes = false,
  ) {
    await this.findOne(areaId, restauranteId);
    return this.prisma.listaItemRef.findMany({
      where: {
        lista: { areaId, restauranteId, deletado: false },
        ...(somentePendentes ? { quantidadeMinima: { gt: 0 } } : {}),
      },
      include: {
        item: { select: { id: true, nome: true, unidadeMedida: true } },
        lista: { select: { id: true, nome: true } },
      },
      orderBy: [{ lista: { nome: 'asc' } }, { item: { nome: 'asc' } }],
    });
  }

  async getStatus(areaId: number, restauranteId: number) {
    await this.findOne(areaId, restauranteId);
    const items = await this.prisma.listaItemRef.findMany({
      where: { lista: { areaId, restauranteId, deletado: false } },
      select: { quantidadeAtual: true, quantidadeMinima: true },
    });
    const hasPendingItems = items.some(
      (i) => i.quantidadeMinima > 0 && i.quantidadeAtual < i.quantidadeMinima,
    );
    return { has_pending_items: hasPendingItems };
  }

  async atualizarEstoqueArea(
    areaId: number,
    restauranteId: number,
    dto: AtualizarEstoqueAreaDto,
  ) {
    await this.findOne(areaId, restauranteId);
    const itemRefIds = dto.itens.map((i) => i.itemRefId);
    // Valida que todos os itemRefs pertencem a listas desta área
    const refsValidas = await this.prisma.listaItemRef.findMany({
      where: {
        id: { in: itemRefIds },
        lista: { areaId, restauranteId },
      },
      select: { id: true },
    });
    if (refsValidas.length !== itemRefIds.length) {
      throw new NotFoundException('Um ou mais itens não pertencem a esta área');
    }
    const atualizados = await Promise.all(
      dto.itens.map((item) =>
        this.prisma.listaItemRef.update({
          where: { id: item.itemRefId },
          data: { quantidadeAtual: item.quantidadeAtual },
          include: {
            item: { select: { id: true, nome: true, unidadeMedida: true } },
            lista: { select: { id: true, nome: true } },
          },
        }),
      ),
    );
    return atualizados;
  }

  // ─── Colaborador ─────────────────────────────────────────────────

  async getMinhasAreas(userId: number, restauranteId: number) {
    return this.prisma.area.findMany({
      where: {
        restauranteId,
        colaboradores: { some: { usuarioId: userId } },
      },
      include: {
        _count: { select: { listas: true } },
      },
      orderBy: { nome: 'asc' },
    });
  }

  async getMinhasAreasStatus(userId: number, restauranteId: number) {
    const areas = await this.getMinhasAreas(userId, restauranteId);
    return Promise.all(
      areas.map(async (area) => {
        const status = await this.getStatus(area.id, restauranteId);
        return { ...area, ...status };
      }),
    );
  }

  async submeterArea(areaId: number, restauranteId: number, userId: number) {
    await this.findOne(areaId, restauranteId);
    const listas = await this.prisma.lista.findMany({
      where: { areaId, restauranteId, deletado: false },
    });

    const resultados: any[] = [];

    for (const lista of listas) {
      const itensRef = await this.prisma.listaItemRef.findMany({
        where: { listaId: lista.id },
      });
      const itensSolicitados = itensRef
        .map((ref) => ({
          itemId: ref.itemId,
          qtdSolicitada: Math.max(0, ref.quantidadeMinima - ref.quantidadeAtual),
        }))
        .filter((i) => i.qtdSolicitada > 0);

      if (itensSolicitados.length === 0) continue;

      const submissao = await this.prisma.submissao.create({
        data: {
          listaId: lista.id,
          usuarioId: userId,
          restauranteId,
          status: StatusSubmissao.PENDENTE,
          pedidos: {
            create: itensSolicitados.map((i) => ({
              itemId: i.itemId,
              qtdSolicitada: i.qtdSolicitada,
            })),
          },
        },
        include: { pedidos: { include: { item: true } } },
      });
      resultados.push(submissao);
    }

    if (resultados.length === 0) {
      throw new UnprocessableEntityException(
        'Nenhum item precisando de reposição nesta área',
      );
    }
    return resultados;
  }
}
