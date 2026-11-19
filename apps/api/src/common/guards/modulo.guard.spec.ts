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

  it('bloqueia SUPER_ADMIN com restaurante explícito cujo módulo está desabilitado', async () => {
    const { guard, restaurantes } = guardFor('moduloPonto', { moduloPonto: false });
    const request = { user: { role: 'SUPER_ADMIN', restauranteId: 4 }, query: { restauranteId: '9' } };
    await expect(guard.canActivate({ getHandler: () => ({}), getClass: () => ({}), switchToHttp: () => ({ getRequest: () => request }) } as any)).rejects.toBeInstanceOf(ForbiddenException);
    expect(restaurantes.findEnabled).toHaveBeenCalledWith(9);
  });

  it('mantém ADMIN no restaurante próprio', async () => {
    const { guard, restaurantes } = guardFor('moduloPonto');
    await expect(guard.canActivate(context({ role: 'ADMIN', restauranteId: 4 }))).resolves.toBe(true);
    expect(restaurantes.findEnabled).toHaveBeenCalledWith(4);
  });

  it('usa restaurante selecionado pelo CONTADOR', async () => {
    const { guard, restaurantes } = guardFor('moduloPonto');
    const request = { user: { role: 'CONTADOR' }, query: { restauranteId: '9' } };
    await expect(guard.canActivate({
      getHandler: () => ({}), getClass: () => ({}), switchToHttp: () => ({ getRequest: () => request }),
    } as any)).resolves.toBe(true);
    expect(restaurantes.findEnabled).toHaveBeenCalledWith(9);
  });
});
