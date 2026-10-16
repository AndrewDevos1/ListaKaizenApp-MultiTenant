import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  it('uses the persisted tenant and rejects inactive users', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: 7,
      nome: 'User',
      email: 'user@example.com',
      role: 'COLLABORATOR',
      restauranteId: 22,
      sessionToken: 'stored-token',
      ativo: true,
      aprovado: true,
    });
    const strategy = new JwtStrategy(
      { get: jest.fn().mockReturnValue('test-secret') } as unknown as ConfigService,
      { usuario: { findUnique } } as any,
    );

    await expect(strategy.validate({
      sub: 7,
      email: 'attacker@example.com',
      role: 'SUPER_ADMIN',
      restauranteId: 999,
      sessionToken: 'stored-token',
    })).resolves.toMatchObject({ id: 7, role: 'COLLABORATOR', restauranteId: 22 });
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 7 } });

    findUnique.mockResolvedValueOnce({ ativo: false });
    await expect(strategy.validate({
      sub: 7,
      email: 'user@example.com',
      role: 'COLLABORATOR',
      restauranteId: 22,
      sessionToken: 'stored-token',
    })).rejects.toThrow('Usuário não encontrado ou inativo');
  });

  it.each([undefined, 'wrong-token'])('rejects legacy or divergent session token: %s', async (sessionToken) => {
    const strategy = new JwtStrategy(
      { get: jest.fn().mockReturnValue('test-secret') } as unknown as ConfigService,
      { usuario: { findUnique: jest.fn().mockResolvedValue({ id: 7, ativo: true, aprovado: true, sessionToken: 'stored-token' }) } } as any,
    );

    await expect(strategy.validate({ sub: 7, email: 'user@example.com', role: 'COLLABORATOR', restauranteId: 22, sessionToken }))
      .rejects.toThrow('Usuário não encontrado ou inativo');
  });
});
