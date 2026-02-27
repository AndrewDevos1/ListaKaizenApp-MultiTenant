import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StatusPOPExecucao } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePOPTemplateDto } from './dto/create-pop-template.dto';
import { UpdatePOPTemplateDto } from './dto/update-pop-template.dto';
import { AddPassoDto } from './dto/add-passo.dto';
import { IniciarExecucaoDto } from './dto/iniciar-execucao.dto';
import { MarcarPassoDto } from './dto/marcar-passo.dto';

@Injectable()
export class POPService {
  constructor(private prisma: PrismaService) {}

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async findTemplateOrFail(id: number, restauranteId: number) {
    const template = await this.prisma.pOPTemplate.findFirst({
      where: { id, restauranteId },
    });
    if (!template) {
      throw new NotFoundException('Template POP não encontrado');
    }
    return template;
  }

  private async findExecucaoOrFail(id: number, restauranteId: number) {
    const execucao = await this.prisma.pOPExecucao.findFirst({
      where: { id, restauranteId },
    });
    if (!execucao) {
      throw new NotFoundException('Execução POP não encontrada');
    }
    return execucao;
  }

  // ─── Templates — Admin ────────────────────────────────────────────────────

  async createTemplate(restauranteId: number, dto: CreatePOPTemplateDto) {
    return this.prisma.$transaction(async (tx) => {
      return tx.pOPTemplate.create({
        data: {
          restauranteId,
          nome: dto.nome,
          tipo: dto.tipo,
          descricao: dto.descricao,
          passos: {
            create: dto.passos.map((passo) => ({
              descricao: passo.descricao,
              ordem: passo.ordem,
            })),
          },
        },
        include: {
          passos: { orderBy: { ordem: 'asc' } },
        },
      });
    });
  }

  async findAllTemplates(restauranteId: number) {
    return this.prisma.pOPTemplate.findMany({
      where: { restauranteId, ativo: true },
      include: {
        passos: { orderBy: { ordem: 'asc' } },
        _count: { select: { execucoes: true } },
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async findOneTemplate(id: number, restauranteId: number) {
    const template = await this.prisma.pOPTemplate.findFirst({
      where: { id, restauranteId },
      include: {
        passos: { orderBy: { ordem: 'asc' } },
        _count: { select: { execucoes: true } },
      },
    });
    if (!template) {
      throw new NotFoundException('Template POP não encontrado');
    }
    return template;
  }

  async updateTemplate(
    id: number,
    restauranteId: number,
    dto: UpdatePOPTemplateDto,
  ) {
    await this.findTemplateOrFail(id, restauranteId);

    return this.prisma.pOPTemplate.update({
      where: { id },
      data: {
        ...(dto.nome !== undefined ? { nome: dto.nome } : {}),
        ...(dto.tipo !== undefined ? { tipo: dto.tipo } : {}),
        ...(dto.descricao !== undefined ? { descricao: dto.descricao } : {}),
      },
      include: {
        passos: { orderBy: { ordem: 'asc' } },
      },
    });
  }

  async addPasso(templateId: number, restauranteId: number, dto: AddPassoDto) {
    await this.findTemplateOrFail(templateId, restauranteId);

    return this.prisma.pOPPasso.create({
      data: {
        templateId,
        descricao: dto.descricao,
        ordem: dto.ordem,
      },
    });
  }

  async deletePasso(passoId: number, restauranteId: number) {
    const passo = await this.prisma.pOPPasso.findFirst({
      where: {
        id: passoId,
        template: { restauranteId },
      },
    });
    if (!passo) {
      throw new NotFoundException('Passo não encontrado');
    }

    return this.prisma.pOPPasso.delete({
      where: { id: passoId },
    });
  }

  // ─── Execuções — Admin ────────────────────────────────────────────────────

  async findAllExecucoesAdmin(restauranteId: number) {
    return this.prisma.pOPExecucao.findMany({
      where: { restauranteId },
      include: {
        template: { select: { id: true, nome: true, tipo: true } },
        usuario: { select: { id: true, nome: true, email: true } },
        _count: { select: { itens: true } },
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  // ─── Execuções — Colaborador ──────────────────────────────────────────────

  async iniciarExecucao(
    usuarioId: number,
    restauranteId: number,
    dto: IniciarExecucaoDto,
  ) {
    // Verifica que o template existe e pertence ao restaurante
    const template = await this.prisma.pOPTemplate.findFirst({
      where: { id: dto.templateId, restauranteId, ativo: true },
      include: { passos: true },
    });
    if (!template) {
      throw new NotFoundException('Template POP não encontrado ou inativo');
    }

    return this.prisma.$transaction(async (tx) => {
      const execucao = await tx.pOPExecucao.create({
        data: {
          templateId: dto.templateId,
          usuarioId,
          restauranteId,
          status: StatusPOPExecucao.EM_ANDAMENTO,
          itens: {
            create: template.passos.map((passo) => ({
              passoId: passo.id,
              marcado: false,
            })),
          },
        },
        include: {
          template: { select: { id: true, nome: true, tipo: true } },
          itens: {
            include: { passo: true },
            orderBy: { passo: { ordem: 'asc' } },
          },
        },
      });

      return execucao;
    });
  }

  async findAllExecucoesColaborador(usuarioId: number, restauranteId: number) {
    return this.prisma.pOPExecucao.findMany({
      where: { usuarioId, restauranteId },
      include: {
        template: { select: { id: true, nome: true, tipo: true } },
        _count: { select: { itens: true } },
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async findOneExecucao(id: number, restauranteId: number) {
    const execucao = await this.prisma.pOPExecucao.findFirst({
      where: { id, restauranteId },
      include: {
        template: { select: { id: true, nome: true, tipo: true } },
        usuario: { select: { id: true, nome: true, email: true } },
        itens: {
          include: { passo: true },
          orderBy: { passo: { ordem: 'asc' } },
        },
      },
    });
    if (!execucao) {
      throw new NotFoundException('Execução POP não encontrada');
    }
    return execucao;
  }

  async marcarPasso(
    execucaoId: number,
    passoId: number,
    restauranteId: number,
    dto: MarcarPassoDto,
  ) {
    const execucao = await this.findExecucaoOrFail(execucaoId, restauranteId);

    if (execucao.status !== StatusPOPExecucao.EM_ANDAMENTO) {
      throw new BadRequestException(
        'Só é possível marcar passos em execuções EM_ANDAMENTO',
      );
    }

    return this.prisma.pOPExecucaoItem.update({
      where: { execucaoId_passoId: { execucaoId, passoId } },
      data: {
        marcado: dto.marcado,
        observacao: dto.observacao,
      },
      include: { passo: true },
    });
  }

  async concluirExecucao(
    id: number,
    usuarioId: number,
    restauranteId: number,
  ) {
    const execucao = await this.findExecucaoOrFail(id, restauranteId);

    if (execucao.usuarioId !== usuarioId) {
      throw new ForbiddenException('Você não é o dono desta execução');
    }

    if (execucao.status !== StatusPOPExecucao.EM_ANDAMENTO) {
      throw new BadRequestException(
        'Apenas execuções EM_ANDAMENTO podem ser concluídas',
      );
    }

    return this.prisma.pOPExecucao.update({
      where: { id },
      data: { status: StatusPOPExecucao.CONCLUIDO },
      include: {
        template: { select: { id: true, nome: true, tipo: true } },
        itens: {
          include: { passo: true },
          orderBy: { passo: { ordem: 'asc' } },
        },
      },
    });
  }

  async cancelarExecucao(
    id: number,
    usuarioId: number,
    restauranteId: number,
  ) {
    const execucao = await this.findExecucaoOrFail(id, restauranteId);

    if (execucao.usuarioId !== usuarioId) {
      throw new ForbiddenException('Você não é o dono desta execução');
    }

    if (execucao.status !== StatusPOPExecucao.EM_ANDAMENTO) {
      throw new BadRequestException(
        'Apenas execuções EM_ANDAMENTO podem ser canceladas',
      );
    }

    return this.prisma.pOPExecucao.update({
      where: { id },
      data: { status: StatusPOPExecucao.CANCELADO },
      include: {
        template: { select: { id: true, nome: true, tipo: true } },
      },
    });
  }
}
