import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { StatusSubmissao, StatusPedido, StatusChecklist } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateChecklistDto } from './dto/create-checklist.dto';

@Injectable()
export class ChecklistsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateChecklistDto, restauranteId: number) {
    const { submissaoId } = dto;

    // 1. Verificar que submissao existe, pertence ao restaurante e está APROVADO ou PARCIAL
    const submissao = await this.prisma.submissao.findFirst({
      where: { id: submissaoId, restauranteId },
    });
    if (!submissao) {
      throw new NotFoundException('Submissão não encontrada');
    }
    if (
      submissao.status !== StatusSubmissao.APROVADO &&
      submissao.status !== StatusSubmissao.PARCIAL
    ) {
      throw new BadRequestException(
        'Só é possível criar checklist para submissões com status APROVADO ou PARCIAL',
      );
    }

    // 2. Verificar que não existe checklist para essa submissão
    const existente = await this.prisma.checklist.findUnique({
      where: { submissaoId },
    });
    if (existente) {
      throw new ConflictException('Já existe um checklist para essa submissão');
    }

    // 3. Buscar pedidos APROVADOS com info do item
    const pedidos = await this.prisma.pedido.findMany({
      where: { submissaoId, status: StatusPedido.APROVADO },
      include: { item: { select: { id: true } } },
    });

    if (pedidos.length === 0) {
      throw new BadRequestException(
        'A submissão não possui pedidos aprovados para gerar checklist',
      );
    }

    // 4. Criar Checklist + ChecklistItems em transação
    return this.prisma.$transaction(async (tx) => {
      const checklist = await tx.checklist.create({
        data: {
          submissaoId,
          restauranteId,
          itens: {
            create: pedidos.map((p) => ({
              itemId: p.itemId,
              qtdPedida: p.qtdSolicitada,
            })),
          },
        },
        include: {
          itens: {
            include: {
              item: { select: { id: true, nome: true, unidadeMedida: true } },
            },
          },
        },
      });
      return checklist;
    });
  }

  async findAll(restauranteId: number) {
    return this.prisma.checklist.findMany({
      where: { restauranteId },
      include: {
        submissao: { select: { id: true } },
        _count: { select: { itens: true } },
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async findOne(id: number, restauranteId: number) {
    const checklist = await this.prisma.checklist.findFirst({
      where: { id, restauranteId },
      include: {
        itens: {
          include: {
            item: { select: { id: true, nome: true, unidadeMedida: true } },
          },
        },
      },
    });
    if (!checklist) {
      throw new NotFoundException('Checklist não encontrado');
    }
    return checklist;
  }

  async marcarItem(checklistItemId: number, restauranteId: number) {
    // Verificar posse via checklist.restauranteId
    const checklistItem = await this.prisma.checklistItem.findFirst({
      where: {
        id: checklistItemId,
        checklist: { restauranteId },
      },
    });
    if (!checklistItem) {
      throw new NotFoundException('Item de checklist não encontrado');
    }

    // Toggle: inverter marcado
    return this.prisma.checklistItem.update({
      where: { id: checklistItemId },
      data: { marcado: !checklistItem.marcado },
      include: {
        item: { select: { id: true, nome: true, unidadeMedida: true } },
      },
    });
  }

  async finalizar(id: number, restauranteId: number) {
    const checklist = await this.prisma.checklist.findFirst({
      where: { id, restauranteId },
    });
    if (!checklist) {
      throw new NotFoundException('Checklist não encontrado');
    }
    if (checklist.status === StatusChecklist.FINALIZADO) {
      throw new BadRequestException('Checklist já está finalizado');
    }

    return this.prisma.checklist.update({
      where: { id },
      data: { status: StatusChecklist.FINALIZADO },
    });
  }
}
