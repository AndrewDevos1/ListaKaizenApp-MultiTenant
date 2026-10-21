import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MODULO_KEY, RestauranteModulo } from '../decorators/modulo.decorator';
import { RestauranteModulosService } from '../../modules/restaurantes/restaurante-modulos.service';

@Injectable()
export class ModuloGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private restauranteModulos: RestauranteModulosService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const modulo = this.reflector.getAllAndOverride<RestauranteModulo>(MODULO_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!modulo) return true;

    const request = context.switchToHttp().getRequest();
    const { user } = request;
    if (user?.role === 'SUPER_ADMIN') return true;
    const selected = ['CONTADOR'].includes(user?.role)
      ? request.query?.restauranteId
      : user?.restauranteId;
    const restauranteId = Number(selected);
    if (!Number.isInteger(restauranteId) || restauranteId <= 0) {
      throw new ForbiddenException('Usuário não está vinculado a nenhum restaurante');
    }

    const enabled = await this.restauranteModulos.findEnabled(restauranteId);
    if (!enabled[modulo]) {
      throw new ForbiddenException('Módulo não habilitado para este restaurante');
    }
    return true;
  }
}
