import { AuthService } from './auth.service';

describe('AuthService', () => {
  it('retorna módulos atuais no perfil para renovar sessão persistida', async () => {
    const prisma = {
      usuario: {
        findUnique: jest.fn().mockResolvedValue({
          id: 7, nome: 'Ana', email: 'ana@example.com', username: null, role: 'COLLABORATOR',
          aprovado: true, avatarUrl: null, restauranteId: 3,
          restaurante: { id: 3, nome: 'Central', moduloPonto: true, moduloFuncionarios: false, moduloAlmoxarifadoEpi: true },
        }),
      },
    } as any;
    const service = new AuthService(prisma, {} as any, {} as any);

    await expect(service.getProfile(7)).resolves.toMatchObject({
      restauranteId: 3,
      modulos: { moduloPonto: true, moduloFuncionarios: false, moduloAlmoxarifadoEpi: true },
    });
  });
});
