import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { StatusPedido, StatusCotacao } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCotacaoDto } from './dto/create-cotacao.dto';
import { UpdateCotacaoItemDto } from './dto/update-cotacao-item.dto';

@Injectable()
export class CotacoesService {
  constructor(private prisma: PrismaService) {}

  async create(restauranteId: number, dto: CreateCotacaoDto) {
    const { titulo, submissaoIds } = dto;

    // Se submissaoIds fornecido: buscar pedidos APROVADOS e agrupar por item
    let cotacaoItensData: {
      itemId: number;
      fornecedorId?: number | null;
      qtdSolicitada: number;
    }[] = [];

    if (submissaoIds && submissaoIds.length > 0) {
      const pedidos = await this.prisma.pedido.findMany({
        where: {
          submissao: { id: { in: submissaoIds }, restauranteId },
          status: StatusPedido.APROVADO,
        },
        include: {
          item: { select: { id: true, fornecedorId: true } },
        },
      });

      // Agrupar por itemId: somar qtds, manter fornecedorId do item
      const agrupado = new Map<
        number,
        { itemId: number; fornecedorId: number | null; qtdSolicitada: number }
      >();

      for (const pedido of pedidos) {
        const itemId = pedido.itemId;
        if (!agrupado.has(itemId)) {
          agrupado.set(itemId, {
            itemId,
            fornecedorId: pedido.item.fornecedorId,
            qtdSolicitada: 0,
          });
        }
        agrupado.get(itemId)!.qtdSolicitada += pedido.qtdSolicitada;
      }

      cotacaoItensData = Array.from(agrupado.values());
    }

    return this.prisma.$transaction(async (tx) => {
      const cotacao = await tx.cotacao.create({
        data: {
          titulo,
          restauranteId,
          itens: {
            create: cotacaoItensData.map((ci) => ({
              itemId: ci.itemId,
              fornecedorId: ci.fornecedorId ?? undefined,
              qtdSolicitada: ci.qtdSolicitada,
            })),
          },
        },
        include: {
          itens: {
            include: {
              item: { select: { id: true, nome: true, unidadeMedida: true } },
              fornecedor: { select: { id: true, nome: true } },
            },
          },
        },
      });
      return cotacao;
    });
  }

  async findAll(restauranteId: number) {
    return this.prisma.cotacao.findMany({
      where: { restauranteId },
      include: {
        _count: { select: { itens: true } },
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async findOne(id: number, restauranteId: number) {
    const cotacao = await this.prisma.cotacao.findFirst({
      where: { id, restauranteId },
      include: {
        itens: {
          include: {
            item: { select: { id: true, nome: true, unidadeMedida: true } },
            fornecedor: { select: { id: true, nome: true } },
          },
        },
      },
    });
    if (!cotacao) {
      throw new NotFoundException('Cotação não encontrada');
    }
    return cotacao;
  }

  async updateCotacaoItem(
    cotacaoItemId: number,
    dto: UpdateCotacaoItemDto,
    restauranteId: number,
  ) {
    // Verificar que o item pertence a uma cotação do restaurante
    const cotacaoItem = await this.prisma.cotacaoItem.findFirst({
      where: {
        id: cotacaoItemId,
        cotacao: { restauranteId },
      },
    });
    if (!cotacaoItem) {
      throw new NotFoundException('Item de cotação não encontrado');
    }

    return this.prisma.cotacaoItem.update({
      where: { id: cotacaoItemId },
      data: { precoUnitario: dto.precoUnitario },
      include: {
        item: { select: { id: true, nome: true, unidadeMedida: true } },
        fornecedor: { select: { id: true, nome: true } },
      },
    });
  }

  async fechar(id: number, restauranteId: number) {
    const cotacao = await this.prisma.cotacao.findFirst({
      where: { id, restauranteId },
    });
    if (!cotacao) {
      throw new NotFoundException('Cotação não encontrada');
    }
    if (cotacao.status === StatusCotacao.FECHADA) {
      throw new BadRequestException('Cotação já está fechada');
    }

    return this.prisma.cotacao.update({
      where: { id },
      data: { status: StatusCotacao.FECHADA },
    });
  }
}
