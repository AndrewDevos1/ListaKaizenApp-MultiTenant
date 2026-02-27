import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TipoNotificacao } from '@prisma/client';

@Injectable()
export class NotificacoesService {
  constructor(private prisma: PrismaService) {}

  async criar(
    usuarioId: number,
    restauranteId: number,
    tipo: TipoNotificacao,
    mensagem: string,
  ) {
    return this.prisma.notificacao.create({
      data: { usuarioId, restauranteId, tipo, mensagem, lida: false },
    });
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
