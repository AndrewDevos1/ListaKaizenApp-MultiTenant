import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();

    if (user.role === 'SUPER_ADMIN') {
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
