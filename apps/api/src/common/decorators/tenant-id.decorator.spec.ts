import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { TenantId } from './tenant-id.decorator';

class T { m(@TenantId() _id: number) {} }
const factory = Object.values(Reflect.getMetadata(ROUTE_ARGS_METADATA, T, 'm'))[0] as any;
const run = (user: any, query: any = {}) =>
  factory.factory(undefined, { switchToHttp: () => ({ getRequest: () => ({ user, query }) }) } as ExecutionContext);

describe('TenantId', () => {
  it('ADMIN ignora restauranteId da query (isolamento)', () => {
    expect(run({ role: 'ADMIN', restauranteId: 1 }, { restauranteId: '2' })).toBe(1);
  });
  it('SUPER_ADMIN e CONTADOR usam a query', () => {
    expect(run({ role: 'SUPER_ADMIN', restauranteId: 1 }, { restauranteId: '2' })).toBe(2);
    expect(run({ role: 'CONTADOR' }, { restauranteId: '3' })).toBe(3);
  });
  it('SUPER_ADMIN sem restaurante próprio usa query; sem nada falha', () => {
    expect(run({ role: 'SUPER_ADMIN' }, { restauranteId: '4' })).toBe(4);
    expect(() => run({ role: 'SUPER_ADMIN' })).toThrow();
  });
});
