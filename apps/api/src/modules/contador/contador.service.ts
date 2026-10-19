import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ContadorPermissao, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EspelhoService } from '../ponto/espelho.service';

@Injectable()
export class ContadorService {
  constructor(private readonly prisma: PrismaService, private readonly espelho?: EspelhoService) {}

  async restaurantes(contadorId: number) {
    return this.prisma.contadorRestaurante.findMany({
      where: { contadorId },
      select: { restaurante: { select: { id: true, nome: true } }, permissoes: true },
      orderBy: { restaurante: { nome: 'asc' } },
    });
  }

  async funcionarios(contadorId: number, restauranteId: number) {
    await this.requireAnyPermission(contadorId, restauranteId);
    const rows = await this.prisma.contadorFuncionario.findMany({
      where: { contadorId, restauranteId },
      select: { funcionario: { select: { id: true, nome: true, email: true, ativo: true } } },
      orderBy: { funcionario: { nome: 'asc' } },
    });
    return rows.map(({ funcionario }) => funcionario);
  }

  async ponto(contadorId: number, restauranteId: number, funcionarioId: number, inicio?: Date, fim?: Date) {
    await this.requireFuncionario(contadorId, restauranteId, funcionarioId, ContadorPermissao.PONTO);
    return this.prisma.registroPonto.findMany({
      where: { usuarioId: funcionarioId, restauranteId, ...(inicio || fim ? { dataOperacional: { ...(inicio ? { gte: inicio } : {}), ...(fim ? { lte: fim } : {}) } } : {}) },
      orderBy: [{ registradoEm: 'desc' }, { id: 'desc' }],
    });
  }

  async espelhoMensal(contadorId: number, restauranteId: number, funcionarioId: number, competencia: string) {
    await this.requireFuncionario(contadorId, restauranteId, funcionarioId, ContadorPermissao.PONTO);
    if (!this.espelho) throw new ForbiddenException('Espelho mensal indisponível');
    return this.espelho.consultar(restauranteId, funcionarioId, competencia);
  }

  async documentos(contadorId: number, restauranteId: number, funcionarioId: number) {
    await this.requireFuncionario(contadorId, restauranteId, funcionarioId, ContadorPermissao.DOCUMENTOS);
    return this.prisma.atestado.findMany({
      where: { usuarioId: funcionarioId, restauranteId },
      select: { id: true, inicio: true, fim: true, horaInicio: true, horaFim: true, motivo: true, situacao: true, criadoEm: true },
      orderBy: { inicio: 'desc' },
    });
  }

  async configurarVinculo(adminId: number, restauranteId: number, contadorId: number, funcionarioId: number, permissoes: ContadorPermissao[]) {
    const admin = await this.prisma.usuario.findFirst({ where: { id: adminId, restauranteId, role: { in: ['ADMIN', 'SUPER_ADMIN'] } } });
    if (!admin) throw new ForbiddenException('Administrador fora do restaurante');
    const contador = await this.prisma.usuario.findFirst({ where: { id: contadorId, role: 'CONTADOR', ativo: true } });
    const funcionario = await this.prisma.usuario.findFirst({ where: { id: funcionarioId, restauranteId, role: 'COLLABORATOR', ativo: true } });
    if (!contador || !funcionario) throw new NotFoundException('Usuário não encontrado no escopo permitido');
    const acesso = await this.prisma.contadorRestaurante.upsert({ where: { contadorId_restauranteId: { contadorId, restauranteId } }, create: { contadorId, restauranteId, permissoes }, update: { permissoes } });
    return this.prisma.contadorFuncionario.upsert({ where: { contadorId_restauranteId_funcionarioId: { contadorId, restauranteId, funcionarioId } }, create: { contadorId, restauranteId, funcionarioId }, update: {}, include: { contador: { select: { id: true, nome: true } }, funcionario: { select: { id: true, nome: true } } } });
  }

  private async requireFuncionario(contadorId: number, restauranteId: number, funcionarioId: number, permissao: ContadorPermissao) {
    const vínculo = await this.prisma.contadorFuncionario.findFirst({ where: { contadorId, restauranteId, funcionarioId, contador: { contadoresRestaurantes: { some: { restauranteId, permissoes: { has: permissao } } } } } });
    if (!vínculo) throw new ForbiddenException('Funcionário não autorizado para este contador');
    return vínculo;
  }

  private async requireAnyPermission(contadorId: number, restauranteId: number) {
    const acesso = await this.prisma.contadorRestaurante.findFirst({
      where: { contadorId, restauranteId, permissoes: { isEmpty: false } },
    });
    if (!acesso) throw new ForbiddenException('Contador sem permissão neste restaurante');
    return acesso;
  }

  private async requirePermission(contadorId: number, restauranteId: number, permissao: ContadorPermissao) {
    const acesso = await this.prisma.contadorRestaurante.findFirst({ where: { contadorId, restauranteId, permissoes: { has: permissao } } });
    if (!acesso) throw new ForbiddenException('Contador sem permissão neste restaurante');
    return acesso;
  }
}
