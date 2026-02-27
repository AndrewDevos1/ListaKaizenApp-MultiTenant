import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateConviteDto } from './dto/create-convite.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class ConvitesService {
  constructor(private prisma: PrismaService) {}

  async gerarConvite(restauranteId: number, dto: CreateConviteDto) {
    const token = crypto.randomUUID();
    const expiresInDays = dto.expiresInDays ?? 7;
    const role = dto.role ?? UserRole.COLLABORATOR;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const convite = await this.prisma.conviteToken.create({
      data: {
        token,
        email: dto.email,
        restauranteId,
        role,
        usado: false,
        expiresAt,
      },
    });

    return {
      token: convite.token,
      expiresAt: convite.expiresAt,
      conviteUrl: `/convite?token=${convite.token}`,
    };
  }

  async findAll(restauranteId: number) {
    return this.prisma.conviteToken.findMany({
      where: { restauranteId },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async validar(token: string) {
    const convite = await this.prisma.conviteToken.findUnique({
      where: { token },
    });

    if (!convite) {
      throw new NotFoundException('Convite não encontrado');
    }

    if (convite.usado) {
      throw new BadRequestException('Este convite já foi utilizado');
    }

    if (convite.expiresAt < new Date()) {
      throw new BadRequestException('Este convite expirou');
    }

    return convite;
  }

  async usar(token: string, usuarioId: number) {
    const convite = await this.validar(token);
    return this.prisma.conviteToken.update({
      where: { id: convite.id },
      data: { usado: true },
    });
  }

  async revogar(id: number, restauranteId: number) {
    const convite = await this.prisma.conviteToken.findFirst({
      where: { id, restauranteId },
    });

    if (!convite) {
      throw new NotFoundException('Convite não encontrado');
    }

    return this.prisma.conviteToken.update({
      where: { id },
      data: { usado: true },
    });
  }
}
