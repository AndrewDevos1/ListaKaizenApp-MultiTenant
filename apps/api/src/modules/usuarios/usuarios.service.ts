import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FilterUsuariosDto } from './dto/filter-usuarios.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  private async findUsuarioOrFail(id: number, restauranteId: number) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id, restauranteId },
    });
    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return usuario;
  }

  async findAll(restauranteId: number, filter: FilterUsuariosDto) {
    const where: any = { restauranteId };

    if (filter.role !== undefined) {
      where.role = filter.role;
    }
    if (filter.aprovado !== undefined) {
      where.aprovado = filter.aprovado;
    }

    return this.prisma.usuario.findMany({
      where,
      select: {
        id: true,
        nome: true,
        email: true,
        username: true,
        role: true,
        aprovado: true,
        ativo: true,
        criadoEm: true,
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async aprovar(id: number, restauranteId: number) {
    await this.findUsuarioOrFail(id, restauranteId);

    return this.prisma.usuario.update({
      where: { id },
      data: { aprovado: true },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        aprovado: true,
        ativo: true,
      },
    });
  }

  async desativar(id: number, restauranteId: number) {
    await this.findUsuarioOrFail(id, restauranteId);

    return this.prisma.usuario.update({
      where: { id },
      data: { ativo: false },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        aprovado: true,
        ativo: true,
      },
    });
  }

  async update(id: number, restauranteId: number, dto: UpdateUsuarioDto) {
    await this.findUsuarioOrFail(id, restauranteId);

    const data: any = {};
    if (dto.nome !== undefined) data.nome = dto.nome;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.username !== undefined) data.username = dto.username;
    if (dto.role !== undefined) data.role = dto.role;

    return this.prisma.usuario.update({
      where: { id },
      data,
      select: {
        id: true,
        nome: true,
        email: true,
        username: true,
        role: true,
        aprovado: true,
        ativo: true,
      },
    });
  }

  async updateRole(id: number, restauranteId: number, dto: UpdateRoleDto) {
    await this.findUsuarioOrFail(id, restauranteId);

    return this.prisma.usuario.update({
      where: { id },
      data: { role: dto.role },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        aprovado: true,
        ativo: true,
      },
    });
  }
}
