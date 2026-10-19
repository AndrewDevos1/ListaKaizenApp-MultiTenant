import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { user } = request;

    if (user.role === 'SUPER_ADMIN') return true;

    if (user.role === 'CONTADOR') {
      if (request.route?.path?.endsWith('/restaurantes')) return true;
      const restauranteId = Number(request.query?.restauranteId);
      if (!Number.isInteger(restauranteId) || restauranteId <= 0) {
        throw new ForbiddenException('Restaurante inválido');
      }
      const vinculo = await this.prisma.contadorRestaurante.findFirst({
        where: { contadorId: user.id, restauranteId },
        select: { id: true },
      });
      if (!vinculo) throw new ForbiddenException('Restaurante não autorizado');
      return true;
    }

    if (!user.restauranteId) {
      throw new ForbiddenException(
        'Usuário não está vinculado a nenhum restaurante',
      );
    }

    return true;
  }
}
