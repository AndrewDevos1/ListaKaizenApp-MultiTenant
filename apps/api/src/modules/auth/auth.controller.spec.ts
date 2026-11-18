import { Reflector } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';

describe('AuthController session timeout contract', () => {
  it('declares role and tenant guards for timeout mutation', () => {
    const controller = new AuthController({} as any);
    const handler = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(controller), 'updateSessionTimeout')?.value;
    const guards = Reflect.getMetadata('__guards__', handler) as unknown[];
    const roles = Reflect.getMetadata(ROLES_KEY, handler);

    expect(guards).toHaveLength(3);
    expect(roles).toEqual(expect.arrayContaining(['COLLABORATOR', 'ADMIN', 'SUPER_ADMIN']));
  });
});
