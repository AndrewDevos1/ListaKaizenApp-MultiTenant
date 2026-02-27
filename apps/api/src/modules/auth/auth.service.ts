import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { ConvitesService } from '../convites/convites.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private convitesService: ConvitesService,
  ) {}

  async register(dto: RegisterDto) {
    // Se há token de convite, valida antes de criar o usuário
    let convite: Awaited<ReturnType<ConvitesService['validar']>> | null = null;
    if (dto.conviteToken) {
      convite = await this.convitesService.validar(dto.conviteToken);
    }

    const existing = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email já cadastrado');
    }

    if (dto.username) {
      const existingUsername = await this.prisma.usuario.findUnique({
        where: { username: dto.username },
      });
      if (existingUsername) {
        throw new ConflictException('Username já em uso');
      }
    }

    const hashedPassword = await bcrypt.hash(dto.senha, 10);

    // Se tem convite, pega restauranteId e role do convite
    const restauranteId = convite?.restauranteId ?? dto.restauranteId ?? null;
    const role = convite?.role ?? undefined;

    const user = await this.prisma.usuario.create({
      data: {
        nome: dto.nome,
        email: dto.email,
        username: dto.username,
        senha: hashedPassword,
        restauranteId,
        ...(role ? { role } : {}),
      },
    });

    // Marca o convite como usado
    if (convite && dto.conviteToken) {
      await this.convitesService.usar(dto.conviteToken, user.id);
    }

    return {
      message: 'Registro realizado com sucesso. Aguarde aprovação do administrador.',
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.ativo) {
      throw new UnauthorizedException('Usuário desativado');
    }

    if (!user.aprovado) {
      throw new UnauthorizedException('Usuário aguardando aprovação do administrador');
    }

    const passwordValid = await bcrypt.compare(dto.senha, user.senha);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      restauranteId: user.restauranteId,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        restauranteId: user.restauranteId,
        avatarUrl: user.avatarUrl ?? null,
      },
    };
  }

  async getProfile(userId: number) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
      include: { restaurante: true },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    return {
      id: user.id,
      nome: user.nome,
      email: user.email,
      username: user.username,
      role: user.role,
      aprovado: user.aprovado,
      avatarUrl: user.avatarUrl ?? null,
      restaurante: user.restaurante
        ? { id: user.restaurante.id, nome: user.restaurante.nome }
        : null,
    };
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.prisma.usuario.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuário não encontrado');

    // Check email uniqueness if changed
    if (dto.email !== user.email) {
      const existing = await this.prisma.usuario.findUnique({ where: { email: dto.email } });
      if (existing) throw new ConflictException('Email já cadastrado');
    }

    // Check username uniqueness if changed
    if (dto.username && dto.username !== user.username) {
      const existing = await this.prisma.usuario.findUnique({ where: { username: dto.username } });
      if (existing) throw new ConflictException('Username já em uso');
    }

    const updated = await this.prisma.usuario.update({
      where: { id: userId },
      data: { nome: dto.nome, email: dto.email, username: dto.username ?? null },
    });

    return {
      message: 'Perfil atualizado com sucesso',
      user: { id: updated.id, nome: updated.nome, email: updated.email, username: updated.username },
    };
  }

  async updateAvatar(usuarioId: number, avatarBase64: string): Promise<void> {
    // Limit size: base64 of 200x200 JPEG ~= 15-30KB, reject if > 200KB
    if (avatarBase64.length > 200000) {
      throw new BadRequestException('Imagem muito grande. Máximo 200KB após compressão.');
    }
    await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { avatarUrl: avatarBase64 },
    });
  }

  async removeAvatar(usuarioId: number): Promise<void> {
    await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { avatarUrl: null },
    });
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    const passwordValid = await bcrypt.compare(dto.senhaAtual, user.senha);
    if (!passwordValid) {
      throw new BadRequestException('Senha atual incorreta');
    }

    const hashedPassword = await bcrypt.hash(dto.novaSenha, 10);

    await this.prisma.usuario.update({
      where: { id: userId },
      data: { senha: hashedPassword },
    });

    return { message: 'Senha alterada com sucesso' };
  }
}
