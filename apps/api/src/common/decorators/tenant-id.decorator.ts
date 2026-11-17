import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number => {
    const request = ctx.switchToHttp().getRequest();
    const queryId = request.query?.restauranteId;
    const userRestId = request.user?.restauranteId;
    const selected = ['CONTADOR', 'SUPER_ADMIN'].includes(request.user?.role) && queryId
      ? queryId
      : userRestId ?? queryId;
    const restauranteId = Number(selected);
    if (!Number.isInteger(restauranteId) || restauranteId <= 0) {
      throw new BadRequestException('Restaurante inválido');
    }
    return restauranteId;
  },
);
