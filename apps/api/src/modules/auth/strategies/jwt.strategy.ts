import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  restauranteId: number | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'dev-secret-change-me'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.ativo) {
      throw new UnauthorizedException('Usuário não encontrado ou inativo');
    }

    if (!user.aprovado) {
      throw new UnauthorizedException('Usuário aguardando aprovação');
    }

    return {
      id: user.id,
      email: user.email,
      nome: user.nome,
      role: user.role,
      restauranteId: user.restauranteId,
    };
  }
}
