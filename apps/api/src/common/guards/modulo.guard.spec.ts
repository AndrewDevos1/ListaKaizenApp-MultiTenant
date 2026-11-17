import { ForbiddenException } from '@nestjs/common';
import { ModuloGuard } from './modulo.guard';

describe('ModuloGuard', () => {
  const context = (user: unknown) => ({
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as any;

  const guardFor = (modulo: string | undefined, enabled = { moduloPonto: true }) => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(modulo) } as any;
    const restaurantes = { findEnabled: jest.fn().mockResolvedValue(enabled) } as any;
    return { guard: new ModuloGuard(reflector, restaurantes), restaurantes };
  };

  it('bloqueia usuário de tenant cujo módulo está desabilitado', async () => {
    const { guard } = guardFor('moduloPonto', { moduloPonto: false });
    await expect(guard.canActivate(context({ restauranteId: 4, role: 'ADMIN' })))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('libera SUPER_ADMIN sem consultar módulo de restaurante', async () => {
    const { guard, restaurantes } = guardFor('moduloPonto', { moduloPonto: false });
    await expect(guard.canActivate(context({ role: 'SUPER_ADMIN' }))).resolves.toBe(true);
    expect(restaurantes.findEnabled).not.toHaveBeenCalled();
  });
});
