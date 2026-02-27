import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { StatusSubmissao, StatusPedido } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FilterSubmissoesDto } from './dto/filter-submissoes.dto';
import { UpdatePedidoStatusDto } from './dto/update-pedido-status.dto';
import { MergePreviewDto } from './dto/merge-preview.dto';

@Injectable()
export class SubmissoesService {
  constructor(private prisma: PrismaService) {}

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async findSubmissaoOrFail(id: number, restauranteId: number) {
    const submissao = await this.prisma.submissao.findFirst({
      where: { id, restauranteId },
    });
    if (!submissao) {
      throw new NotFoundException('Submissão não encontrada');
    }
    return submissao;
  }

  private async recalcularStatusSubmissao(submissaoId: number) {
    const pedidos = await this.prisma.pedido.findMany({
      where: { submissaoId },
    });

    const todos = pedidos.length;
    const aprovados = pedidos.filter(
      (p) => p.status === StatusPedido.APROVADO,
    ).length;
    const rejeitados = pedidos.filter(
      (p) => p.status === StatusPedido.REJEITADO,
    ).length;

    let status: StatusSubmissao;
    if (aprovados === todos) {
      status = StatusSubmissao.APROVADO;
    } else if (rejeitados === todos) {
      status = StatusSubmissao.REJEITADO;
    } else if (aprovados + rejeitados === todos) {
      status = StatusSubmissao.PARCIAL;
    } else {
      status = StatusSubmissao.PENDENTE;
    }

    await this.prisma.submissao.update({
      where: { id: submissaoId },
      data: { status },
    });
  }

  // ─── Admin endpoints ───────────────────────────────────────────────────────

  async findAllAdmin(restauranteId: number, filter: FilterSubmissoesDto) {
    const where: any = { restauranteId };

    if (filter.status !== undefined) {
      where.status = filter.status;
    }
    if (filter.arquivada !== undefined) {
      where.arquivada = filter.arquivada;
    }

    return this.prisma.submissao.findMany({
      where,
      include: {
        lista: { select: { id: true, nome: true } },
        usuario: { select: { id: true, nome: true, email: true } },
        _count: { select: { pedidos: true } },
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async findOneAdmin(id: number, restauranteId: number) {
    const submissao = await this.prisma.submissao.findFirst({
      where: { id, restauranteId },
      include: {
        lista: { select: { id: true, nome: true } },
        usuario: { select: { id: true, nome: true, email: true } },
        pedidos: {
          include: {
            item: true,
          },
        },
      },
    });
    if (!submissao) {
      throw new NotFoundException('Submissão não encontrada');
    }
    return submissao;
  }

  async aprovarSubmissao(id: number, restauranteId: number) {
    await this.findSubmissaoOrFail(id, restauranteId);

    await this.prisma.pedido.updateMany({
      where: { submissaoId: id, status: StatusPedido.PENDENTE },
      data: { status: StatusPedido.APROVADO },
    });

    await this.recalcularStatusSubmissao(id);

    return this.findOneAdmin(id, restauranteId);
  }

  async rejeitarSubmissao(id: number, restauranteId: number) {
    await this.findSubmissaoOrFail(id, restauranteId);

    await this.prisma.pedido.updateMany({
      where: { submissaoId: id, status: StatusPedido.PENDENTE },
      data: { status: StatusPedido.REJEITADO },
    });

    await this.recalcularStatusSubmissao(id);

    return this.findOneAdmin(id, restauranteId);
  }

  async updatePedidoStatus(
    pedidoId: number,
    restauranteId: number,
    dto: UpdatePedidoStatusDto,
  ) {
    // Verifica que o pedido pertence a uma submissao do restaurante
    const pedido = await this.prisma.pedido.findFirst({
      where: {
        id: pedidoId,
        submissao: { restauranteId },
      },
    });
    if (!pedido) {
      throw new NotFoundException('Pedido não encontrado');
    }

    // Apenas pedidos PENDENTE podem ter o status alterado individualmente
    if (pedido.status !== StatusPedido.PENDENTE) {
      throw new BadRequestException(
        `Apenas pedidos PENDENTE podem ser alterados. Status atual: ${pedido.status}`,
      );
    }

    const pedidoAtualizado = await this.prisma.pedido.update({
      where: { id: pedidoId },
      data: { status: dto.status },
      include: { item: true },
    });

    await this.recalcularStatusSubmissao(pedido.submissaoId);

    return pedidoAtualizado;
  }

  async reverterSubmissao(id: number, restauranteId: number) {
    await this.findSubmissaoOrFail(id, restauranteId);

    await this.prisma.pedido.updateMany({
      where: { submissaoId: id },
      data: { status: StatusPedido.PENDENTE },
    });

    await this.prisma.submissao.update({
      where: { id },
      data: { status: StatusSubmissao.PENDENTE },
    });

    return this.findOneAdmin(id, restauranteId);
  }

  async arquivarSubmissao(id: number, restauranteId: number) {
    await this.findSubmissaoOrFail(id, restauranteId);

    await this.prisma.submissao.update({
      where: { id },
      data: { arquivada: true, status: StatusSubmissao.ARQUIVADO },
    });

    return this.findOneAdmin(id, restauranteId);
  }

  // ─── Merge endpoints ───────────────────────────────────────────────────────

  async mergePreview(submissaoIds: number[], restauranteId: number) {
    const submissoes = await this.prisma.submissao.findMany({
      where: { id: { in: submissaoIds }, restauranteId },
      include: {
        usuario: { select: { id: true, nome: true } },
        pedidos: {
          where: { status: StatusPedido.APROVADO },
          include: {
            item: { select: { id: true, nome: true, unidadeMedida: true } },
          },
        },
      },
    });

    // Agrupar por item.nome
    const grupos = new Map<
      string,
      {
        itemNome: string;
        unidade: string;
        qtdTotal: number;
        breakdown: { submissaoId: number; colaboradorNome: string; qtd: number }[];
      }
    >();

    for (const submissao of submissoes) {
      for (const pedido of submissao.pedidos) {
        const chave = pedido.item.nome;
        if (!grupos.has(chave)) {
          grupos.set(chave, {
            itemNome: pedido.item.nome,
            unidade: pedido.item.unidadeMedida,
            qtdTotal: 0,
            breakdown: [],
          });
        }
        const grupo = grupos.get(chave)!;
        grupo.qtdTotal += pedido.qtdSolicitada;
        grupo.breakdown.push({
          submissaoId: submissao.id,
          colaboradorNome: submissao.usuario.nome,
          qtd: pedido.qtdSolicitada,
        });
      }
    }

    return Array.from(grupos.values()).sort((a, b) =>
      a.itemNome.localeCompare(b.itemNome, 'pt-BR'),
    );
  }

  async mergeWhatsApp(
    submissaoIds: number[],
    restauranteId: number,
    titulo?: string,
  ) {
    const grupos = await this.mergePreview(submissaoIds, restauranteId);
    const data = new Date().toLocaleDateString('pt-BR');

    let texto = `*Pedido — ${data}*\n`;
    if (titulo) texto += `${titulo}\n`;
    texto += '\n';

    for (const g of grupos) {
      texto += `• *${g.itemNome}*: ${g.qtdTotal} ${g.unidade}\n`;
      if (g.breakdown.length > 1) {
        texto += `  _(${g.breakdown.map((b) => `${b.colaboradorNome}: ${b.qtd}`).join(', ')})_\n`;
      }
    }

    return { texto };
  }

  // ─── Colaborador endpoints ─────────────────────────────────────────────────

  async findAllColaborador(usuarioId: number, restauranteId: number) {
    return this.prisma.submissao.findMany({
      where: { usuarioId, restauranteId },
      include: {
        lista: { select: { id: true, nome: true } },
        _count: { select: { pedidos: true } },
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async findOneColaborador(
    id: number,
    usuarioId: number,
    restauranteId: number,
  ) {
    const submissao = await this.prisma.submissao.findFirst({
      where: { id, usuarioId, restauranteId },
      include: {
        lista: { select: { id: true, nome: true } },
        pedidos: {
          include: {
            item: true,
          },
        },
      },
    });
    if (!submissao) {
      throw new NotFoundException('Submissão não encontrada');
    }
    return submissao;
  }
}
