import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  StatusSubmissao,
  StatusPedido,
  TipoNotificacao,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FilterSubmissoesDto } from './dto/filter-submissoes.dto';
import { UpdatePedidoStatusDto } from './dto/update-pedido-status.dto';
import { ConfirmarRecebimentoDto } from './dto/confirmar-recebimento.dto';
import { NotificacoesService } from '../notificacoes/notificacoes.service';

@Injectable()
export class SubmissoesService {
  constructor(
    private prisma: PrismaService,
    private notificacoesService: NotificacoesService,
  ) {}

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

  private async findSubmissaoColaboradorOrFail(
    id: number,
    usuarioId: number,
    restauranteId: number,
  ) {
    const submissao = await this.prisma.submissao.findFirst({
      where: { id, usuarioId, restauranteId },
    });
    if (!submissao) {
      throw new NotFoundException('Submissão não encontrada');
    }
    return submissao;
  }

  private async validarContextoRecebimento(submissaoId: number, restauranteId: number) {
    const submissao = await this.findSubmissaoOrFail(submissaoId, restauranteId);

    if (
      submissao.status !== StatusSubmissao.APROVADO &&
      submissao.status !== StatusSubmissao.PARCIAL
    ) {
      throw new BadRequestException(
        'Só é possível confirmar recebimento em submissões APROVADO ou PARCIAL',
      );
    }

    const pedidosAprovados = await this.prisma.pedido.findMany({
      where: { submissaoId, status: StatusPedido.APROVADO },
      select: { id: true },
    });
    if (pedidosAprovados.length === 0) {
      throw new BadRequestException('Não há pedidos aprovados para confirmar recebimento');
    }

    return { submissao, pedidosAprovados: pedidosAprovados.map((p) => p.id) };
  }

  private validarItensConfirmados(
    itensConfirmados: number[],
    pedidosAprovados: number[],
  ) {
    const unicos = Array.from(new Set(itensConfirmados.map((id) => Number(id))));
    const aprovados = new Set(pedidosAprovados);

    for (const pedidoId of unicos) {
      if (!aprovados.has(pedidoId)) {
        throw new BadRequestException(
          `Pedido ${pedidoId} não é elegível para recebimento (somente APROVADO).`,
        );
      }
    }

    return unicos;
  }

  private async getRecebimentoBySubmissaoId(submissaoId: number, restauranteId: number) {
    return this.prisma.recebimento.findFirst({
      where: { submissaoId, restauranteId },
      include: {
        confirmadoPor: { select: { id: true, nome: true, email: true } },
        confirmadoAdmin: { select: { id: true, nome: true, email: true } },
        itens: {
          include: {
            pedido: {
              include: {
                item: { select: { id: true, nome: true, unidadeMedida: true } },
              },
            },
          },
          orderBy: { pedidoId: 'asc' },
        },
      },
    });
  }

  private async notificarRecebimentoConfirmado(
    submissaoId: number,
    restauranteId: number,
    autorNome: string,
  ) {
    const submissao = await this.prisma.submissao.findFirst({
      where: { id: submissaoId, restauranteId },
      include: {
        lista: { select: { nome: true } },
      },
    });
    if (!submissao) {
      return;
    }

    const mensagem = `Recebimento confirmado por ${autorNome} na submissão #${submissao.id} (${submissao.lista.nome}).`;
    const admins = await this.prisma.usuario.findMany({
      where: {
        restauranteId,
        ativo: true,
        role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
      },
      select: { id: true },
    });

    const destinos = new Set<number>([
      submissao.usuarioId,
      ...admins.map((admin) => admin.id),
    ]);

    await Promise.allSettled(
      Array.from(destinos).map((usuarioId) =>
        this.notificacoesService.criar(
          usuarioId,
          restauranteId,
          TipoNotificacao.RECEBIMENTO_CONFIRMADO,
          mensagem,
        ),
      ),
    );
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
        recebimento: {
          select: {
            id: true,
            confirmadoEm: true,
            confirmadoAdminEm: true,
          },
        },
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
        recebimento: {
          include: {
            confirmadoPor: { select: { id: true, nome: true, email: true } },
            confirmadoAdmin: { select: { id: true, nome: true, email: true } },
            itens: {
              include: {
                pedido: {
                  include: {
                    item: true,
                  },
                },
              },
              orderBy: { pedidoId: 'asc' },
            },
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

    // Regras de transição:
    // - PENDENTE -> APROVADO | REJEITADO
    // - APROVADO | REJEITADO -> PENDENTE (desfazer)
    if (dto.status === StatusPedido.PENDENTE) {
      if (pedido.status === StatusPedido.PENDENTE) {
        throw new BadRequestException('Pedido já está em PENDENTE');
      }
    } else if (pedido.status !== StatusPedido.PENDENTE) {
      throw new BadRequestException(
        `Apenas pedidos PENDENTE podem ser aprovados/rejeitados. Status atual: ${pedido.status}`,
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

  async getRecebimentoAdmin(id: number, restauranteId: number) {
    await this.findSubmissaoOrFail(id, restauranteId);
    const recebimento = await this.getRecebimentoBySubmissaoId(id, restauranteId);
    if (!recebimento) {
      throw new NotFoundException('Recebimento não encontrado');
    }
    return recebimento;
  }

  async getRecebimentoColaborador(
    id: number,
    usuarioId: number,
    restauranteId: number,
  ) {
    await this.findSubmissaoColaboradorOrFail(id, usuarioId, restauranteId);
    const recebimento = await this.getRecebimentoBySubmissaoId(id, restauranteId);
    if (!recebimento) {
      throw new NotFoundException('Recebimento não encontrado');
    }
    return recebimento;
  }

  async confirmarRecebimentoColaborador(
    submissaoId: number,
    usuarioId: number,
    restauranteId: number,
    dto: ConfirmarRecebimentoDto,
  ) {
    await this.findSubmissaoColaboradorOrFail(submissaoId, usuarioId, restauranteId);
    const { pedidosAprovados } = await this.validarContextoRecebimento(
      submissaoId,
      restauranteId,
    );
    const itensConfirmados = this.validarItensConfirmados(
      dto.itensConfirmados ?? [],
      pedidosAprovados,
    );

    const recebimentoExistente = await this.getRecebimentoBySubmissaoId(
      submissaoId,
      restauranteId,
    );
    if (recebimentoExistente?.confirmadoPorId) {
      throw new BadRequestException('Recebimento já confirmado pelo colaborador');
    }

    const agora = new Date();
    const itensConfirmadosSet = new Set(itensConfirmados);

    if (!recebimentoExistente) {
      await this.prisma.recebimento.create({
        data: {
          submissaoId,
          restauranteId,
          confirmadoPorId: usuarioId,
          confirmadoEm: agora,
          observacoes: dto.observacoes?.trim() || null,
          itens: {
            createMany: {
              data: pedidosAprovados.map((pedidoId) => ({
                pedidoId,
                confirmado: itensConfirmadosSet.has(pedidoId),
              })),
            },
          },
        },
      });
    } else {
      await this.prisma.recebimento.update({
        where: { id: recebimentoExistente.id },
        data: {
          confirmadoPorId: usuarioId,
          confirmadoEm: agora,
          observacoes: dto.observacoes?.trim() || recebimentoExistente.observacoes,
        },
      });

      if (recebimentoExistente.itens.length === 0) {
        await this.prisma.recebimentoItem.createMany({
          data: pedidosAprovados.map((pedidoId) => ({
            recebimentoId: recebimentoExistente.id,
            pedidoId,
            confirmado: itensConfirmadosSet.has(pedidoId),
          })),
          skipDuplicates: true,
        });
      } else if (!recebimentoExistente.confirmadoAdminId) {
        await Promise.all(
          pedidosAprovados.map((pedidoId) =>
            this.prisma.recebimentoItem.updateMany({
              where: { recebimentoId: recebimentoExistente.id, pedidoId },
              data: { confirmado: itensConfirmadosSet.has(pedidoId) },
            }),
          ),
        );
      }
    }

    const colaborador = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { nome: true },
    });
    await this.notificarRecebimentoConfirmado(
      submissaoId,
      restauranteId,
      colaborador?.nome ?? 'colaborador',
    );

    return this.getRecebimentoColaborador(submissaoId, usuarioId, restauranteId);
  }

  async confirmarRecebimentoAdmin(
    submissaoId: number,
    restauranteId: number,
    adminId: number,
    dto: ConfirmarRecebimentoDto,
  ) {
    await this.findSubmissaoOrFail(submissaoId, restauranteId);
    const { pedidosAprovados } = await this.validarContextoRecebimento(
      submissaoId,
      restauranteId,
    );
    const itensConfirmados = this.validarItensConfirmados(
      dto.itensConfirmados ?? [],
      pedidosAprovados,
    );

    const admin = await this.prisma.usuario.findFirst({
      where: {
        id: adminId,
        restauranteId,
        role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
      },
      select: { id: true, nome: true },
    });
    if (!admin) {
      throw new NotFoundException('Administrador não encontrado');
    }

    const recebimentoExistente = await this.getRecebimentoBySubmissaoId(
      submissaoId,
      restauranteId,
    );
    if (recebimentoExistente?.confirmadoAdminId) {
      throw new BadRequestException('Recebimento já confirmado administrativamente');
    }

    const agora = new Date();
    const itensConfirmadosSet = new Set(itensConfirmados);

    if (!recebimentoExistente) {
      await this.prisma.recebimento.create({
        data: {
          submissaoId,
          restauranteId,
          confirmadoAdminId: admin.id,
          confirmadoAdminEm: agora,
          observacoes: dto.observacoes?.trim() || null,
          itens: {
            createMany: {
              data: pedidosAprovados.map((pedidoId) => ({
                pedidoId,
                confirmado: itensConfirmadosSet.has(pedidoId),
              })),
            },
          },
        },
      });
    } else {
      await this.prisma.recebimento.update({
        where: { id: recebimentoExistente.id },
        data: {
          confirmadoAdminId: admin.id,
          confirmadoAdminEm: agora,
          observacoes: dto.observacoes?.trim() || recebimentoExistente.observacoes,
        },
      });

      if (recebimentoExistente.itens.length === 0) {
        await this.prisma.recebimentoItem.createMany({
          data: pedidosAprovados.map((pedidoId) => ({
            recebimentoId: recebimentoExistente.id,
            pedidoId,
            confirmado: itensConfirmadosSet.has(pedidoId),
          })),
          skipDuplicates: true,
        });
      } else if (!recebimentoExistente.confirmadoPorId) {
        await Promise.all(
          pedidosAprovados.map((pedidoId) =>
            this.prisma.recebimentoItem.updateMany({
              where: { recebimentoId: recebimentoExistente.id, pedidoId },
              data: { confirmado: itensConfirmadosSet.has(pedidoId) },
            }),
          ),
        );
      }
    }

    await this.notificarRecebimentoConfirmado(submissaoId, restauranteId, admin.nome);

    return this.getRecebimentoAdmin(submissaoId, restauranteId);
  }

  async desfazerRecebimentoAdmin(submissaoId: number, restauranteId: number) {
    await this.findSubmissaoOrFail(submissaoId, restauranteId);
    const recebimento = await this.getRecebimentoBySubmissaoId(
      submissaoId,
      restauranteId,
    );
    if (!recebimento) {
      throw new NotFoundException('Recebimento não encontrado');
    }

    await this.prisma.$transaction([
      this.prisma.recebimentoItem.deleteMany({
        where: { recebimentoId: recebimento.id },
      }),
      this.prisma.recebimento.delete({
        where: { id: recebimento.id },
      }),
    ]);

    return { message: 'Recebimento desfeito com sucesso' };
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
        recebimento: {
          select: {
            id: true,
            confirmadoEm: true,
            confirmadoAdminEm: true,
          },
        },
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
        recebimento: {
          include: {
            confirmadoPor: { select: { id: true, nome: true, email: true } },
            confirmadoAdmin: { select: { id: true, nome: true, email: true } },
            itens: {
              include: {
                pedido: {
                  include: {
                    item: true,
                  },
                },
              },
              orderBy: { pedidoId: 'asc' },
            },
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
