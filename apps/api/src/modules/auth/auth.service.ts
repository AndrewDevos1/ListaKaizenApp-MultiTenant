import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
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

    const user = await this.prisma.usuario.create({
      data: {
        nome: dto.nome,
        email: dto.email,
        username: dto.username,
        senha: hashedPassword,
        restauranteId: dto.restauranteId,
      },
    });

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
      restaurante: user.restaurante
        ? { id: user.restaurante.id, nome: user.restaurante.nome }
        : null,
    };
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
