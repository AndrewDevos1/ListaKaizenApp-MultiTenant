import { JwtService } from '@nestjs/jwt';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({ compare: jest.fn().mockResolvedValue(true) }));

describe('AuthService session timeout', () => {
  it('keeps session_token nullable in the additive migration', () => {
    const migration = readFileSync(join(process.cwd(), 'prisma/migrations/20261016000000_add_session_timeout/migration.sql'), 'utf8');
    expect(migration).toContain('ALTER TABLE "usuarios" ADD COLUMN "session_token" TEXT;');
    expect(migration).not.toMatch(/DROP\s+COLUMN\s+"session_token"/i);
  });
  const user = {
    id: 7,
    nome: 'User',
    email: 'user@example.com',
    username: null,
    senha: 'hash',
    role: 'COLLABORATOR',
    aprovado: true,
    ativo: true,
    restauranteId: 11,
    avatarUrl: null,
  } as any;

  const createService = (sign = jest.fn(() => 'token')) => {
    const prisma = { usuario: { findUnique: jest.fn().mockResolvedValue(user), update: jest.fn() } } as any;
    const jwt = { sign } as unknown as JwtService;
    return { service: new AuthService(prisma, jwt, {} as any), sign };
  };

  beforeEach(() => {
    delete process.env.SESSION_TIMEOUT_MINUTES;
  });

  it.each([
    ['default', undefined, '30m'],
    ['lower bound', '5', '5m'],
    ['upper bound', '480', '480m'],
    ['below lower bound', '4', '30m'],
    ['above upper bound', '481', '30m'],
    ['invalid text', 'invalid', '30m'],
    ['invalid suffix', '5minutes', '30m'],
    ['invalid decimal', '5.9', '30m'],
    ['invalid whitespace', ' 5 ', '30m'],
  ])('uses %s timeout', async (_label, value, expected) => {
    if (value !== undefined) process.env.SESSION_TIMEOUT_MINUTES = value;
    const { service, sign } = createService();

    await service.login({ email: user.email, senha: 'password' });

    expect(sign).toHaveBeenCalledWith(expect.any(Object), { expiresIn: expected });
  });

  it('rejects a restaurant timeout update across tenants', async () => {
    const prisma = {
      usuario: {
        findUnique: jest.fn()
          .mockResolvedValueOnce({ restauranteId: 10 })
          .mockResolvedValueOnce({ restauranteId: 20 }),
        update: jest.fn(),
      },
      restaurante: { update: jest.fn() },
    } as any;
    const service = new AuthService(prisma, {} as JwtService, {} as any);

    await expect(service.updateSessionTimeout(1, 'ADMIN' as any, {
      restauranteId: 20,
      timeoutMinutes: 45,
    })).rejects.toThrow('Restaurante fora do tenant autorizado');
    expect(prisma.restaurante.update).not.toHaveBeenCalled();
  });

  it('revokes every tenant session when the restaurant policy changes', async () => {
    const updateMany = jest.fn();
    const prisma = {
      usuario: {
        findUnique: jest.fn().mockResolvedValue({ restauranteId: 10 }),
        update: jest.fn(),
        updateMany,
      },
      restaurante: { update: jest.fn() },
    } as any;
    const service = new AuthService(prisma, {} as JwtService, {} as any);
    jest.spyOn(service, 'getSessionTimeout').mockResolvedValue({} as any);

    await service.updateSessionTimeout(1, 'ADMIN' as any, { timeoutMinutes: 45 });

    expect(updateMany).toHaveBeenCalledWith({
      where: { restauranteId: 10 },
      data: { sessionToken: expect.any(String) },
    });
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });

  it('returns the configured target scope after an override update', async () => {
    const prisma = {
      usuario: {
        findUnique: jest.fn()
          .mockResolvedValueOnce({ restauranteId: 10 })
          .mockResolvedValueOnce({ restauranteId: 10 })
          .mockResolvedValueOnce({ sessionTimeoutMinutes: 45, restaurante: { sessionTimeoutMinutes: 30 } }),
        update: jest.fn(),
      },
      restaurante: { update: jest.fn() },
    } as any;
    const service = new AuthService(prisma, {} as JwtService, {} as any);

    await expect(service.updateSessionTimeout(1, 'ADMIN' as any, { usuarioId: 2, timeoutMinutes: 45 }))
      .resolves.toMatchObject({ timeoutMinutes: 45, effectiveScope: 'usuário', targetScope: 'usuário' });
  });

  it('emits a JWT expiring in the configured interval', async () => {
    process.env.SESSION_TIMEOUT_MINUTES = '5';
    const jwt = new JwtService({ secret: 'test-secret' });
    const prisma = { usuario: { findUnique: jest.fn().mockResolvedValue(user), update: jest.fn() } } as any;
    const service = new AuthService(prisma, jwt, {} as any);

    const { accessToken } = await service.login({ email: user.email, senha: 'password' });
    const [, encodedPayload] = accessToken.split('.');
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString());

    expect(payload.exp - payload.iat).toBe(5 * 60);
  });

  it.each([
    [null, null, '30m'],
    [null, 45, '45m'],
    [20, 45, '20m'],
  ])('resolves user > restaurant > global timeout', async (userTimeout, restaurantTimeout, expected) => {
    process.env.SESSION_TIMEOUT_MINUTES = '30';
    const sign = jest.fn(() => 'token');
    const prisma = {
      usuario: {
        findUnique: jest.fn().mockResolvedValue({
          ...user,
          sessionTimeoutMinutes: userTimeout,
          restaurante: { sessionTimeoutMinutes: restaurantTimeout },
        }),
        update: jest.fn(),
      },
    } as any;
    const service = new AuthService(prisma, { sign } as unknown as JwtService, {} as any);

    await service.login({ email: user.email, senha: 'password' });

    expect(sign).toHaveBeenCalledWith(expect.any(Object), { expiresIn: expected });
  });
});
