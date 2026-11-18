import { TenantGuard } from './tenant.guard';

describe('TenantGuard', () => {
  const context = (user: unknown, query = {}, body = {}) => ({
    switchToHttp: () => ({ getRequest: () => ({ user, query, body }) }),
  }) as any;

  it('rejects a requested tenant different from the authenticated tenant', () => {
    expect(() => new TenantGuard().canActivate(context({ role: 'ADMIN', restauranteId: 10 }, { restauranteId: '20' })))
      .toThrow('Acesso ao tenant não autorizado');
  });

  it('allows the authenticated tenant', () => {
    expect(new TenantGuard().canActivate(context({ role: 'ADMIN', restauranteId: 10 }, { restauranteId: '10' }))).toBe(true);
  });
});
