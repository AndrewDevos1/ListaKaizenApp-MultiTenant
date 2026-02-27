import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TipoNotificacao } from '@prisma/client';
import { PushService } from '../push/push.service';

const TITULOS_NOTIFICACAO: Record<string, string> = {
  SUBMISSAO_PENDENTE: 'Nova submissão',
  SUBMISSAO_APROVADA: 'Submissão aprovada',
  SUBMISSAO_REJEITADA: 'Submissão rejeitada',
  LISTA_RAPIDA_PENDENTE: 'Lista rápida pendente',
  LISTA_RAPIDA_APROVADA: 'Lista rápida aprovada',
  LISTA_RAPIDA_REJEITADA: 'Lista rápida rejeitada',
  SUGESTAO_APROVADA: 'Sugestão aprovada',
  SUGESTAO_REJEITADA: 'Sugestão rejeitada',
};

@Injectable()
export class NotificacoesService {
  constructor(
    private prisma: PrismaService,
    private push: PushService,
  ) {}

  async criar(
    usuarioId: number,
    restauranteId: number,
    tipo: TipoNotificacao,
    mensagem: string,
  ) {
    const notificacao = await this.prisma.notificacao.create({
      data: { usuarioId, restauranteId, tipo, mensagem, lida: false },
    });

    const titulo = TITULOS_NOTIFICACAO[tipo] ?? 'Kaizen Lists';
    this.push
      .sendToUser(usuarioId, { title: titulo, body: mensagem, url: '/admin/dashboard' })
      .catch(() => {});

    return notificacao;
  }

  async findAll(usuarioId: number, restauranteId: number) {
    return this.prisma.notificacao.findMany({
      where: { usuarioId, restauranteId },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async contarNaoLidas(usuarioId: number, restauranteId: number) {
    const count = await this.prisma.notificacao.count({
      where: { usuarioId, restauranteId, lida: false },
    });
    return { count };
  }

  async marcarLida(id: number, usuarioId: number) {
    const notificacao = await this.prisma.notificacao.findFirst({
      where: { id, usuarioId },
    });
    if (!notificacao) {
      throw new NotFoundException('Notificação não encontrada');
    }
    return this.prisma.notificacao.update({
      where: { id },
      data: { lida: true },
    });
  }

  async marcarTodasLidas(usuarioId: number, restauranteId: number) {
    await this.prisma.notificacao.updateMany({
      where: { usuarioId, restauranteId, lida: false },
      data: { lida: true },
    });
    return { message: 'Todas as notificações foram marcadas como lidas' };
  }
}
