import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const { user } = request;

    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    if (!user.restauranteId) {
      throw new ForbiddenException(
        'Usuário não está vinculado a nenhum restaurante',
      );
    }

    const requestedTenant = request.query?.restauranteId ?? request.body?.restauranteId;
    if (requestedTenant !== undefined && Number(requestedTenant) !== user.restauranteId) {
      throw new ForbiddenException('Acesso ao tenant não autorizado');
    }

    return true;
  }
}
