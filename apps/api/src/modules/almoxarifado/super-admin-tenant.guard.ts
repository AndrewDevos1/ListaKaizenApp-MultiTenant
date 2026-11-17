import { BadRequestException, CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

// Local ao almoxarifado: SUPER_ADMIN deve informar restauranteId (TenantId global fica intacto).
@Injectable()
export class SuperAdminTenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (req.user?.role === 'SUPER_ADMIN' && !req.query?.restauranteId) {
      throw new BadRequestException('SUPER_ADMIN deve informar restauranteId');
    }
    return true;
  }
}
