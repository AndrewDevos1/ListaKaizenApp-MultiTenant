import { ForbiddenException } from '@nestjs/common';
import { ContadorService } from './contador.service';

describe('ContadorService', () => {
  const prisma = {
    contadorRestaurante: { findMany: jest.fn(), findFirst: jest.fn(), upsert: jest.fn() },
    contadorFuncionario: { findMany: jest.fn(), findFirst: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() },
    usuario: { findFirst: jest.fn(), findMany: jest.fn() },
    registroPonto: { findMany: jest.fn() },
    atestado: { findMany: jest.fn() },
    $transaction: jest.fn(async (callback: (tx: any) => unknown) => callback(prisma)),
  } as any;
  const service = new ContadorService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('recusa funcionário fora do vínculo explícito', async () => {
    prisma.contadorFuncionario.findFirst.mockResolvedValue(null);
    await expect(service.ponto(7, 10, 99, undefined, undefined)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.registroPonto.findMany).not.toHaveBeenCalled();
  });

  it('lista funcionários com permissão somente de ponto', async () => {
    prisma.contadorRestaurante.findFirst.mockResolvedValue({ id: 1, permissoes: ['PONTO'] });
    prisma.contadorFuncionario.findMany.mockResolvedValue([{ funcionario: { id: 99, nome: 'Ana', email: 'ana@example.com' } }]);
    await expect(service.funcionarios(7, 10)).resolves.toEqual([{ id: 99, nome: 'Ana', email: 'ana@example.com' }]);
  });

  it('filtra funcionários por contador e restaurante vinculados', async () => {
    prisma.contadorRestaurante.findFirst.mockResolvedValue({ id: 1 });
    prisma.contadorFuncionario.findMany.mockResolvedValue([{ funcionario: { id: 99, nome: 'Ana', email: 'ana@example.com' } }]);
    await expect(service.funcionarios(7, 10)).resolves.toEqual([{ id: 99, nome: 'Ana', email: 'ana@example.com' }]);
    expect(prisma.contadorFuncionario.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        contadorId: 7,
        restauranteId: 10,
        funcionario: { restauranteId: 10, role: 'COLLABORATOR', ativo: true },
      },
    }));
  });

  it('não permite acesso após funcionário ficar inativo ou mudar de escopo', async () => {
    prisma.contadorFuncionario.findFirst.mockResolvedValue(null);
    await expect(service.documentos(7, 10, 99)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.atestado.findMany).not.toHaveBeenCalled();
  });

  it('inclui o dia inteiro no limite final do ponto', async () => {
    prisma.contadorFuncionario.findFirst.mockResolvedValue({ id: 1 });
    prisma.registroPonto.findMany.mockResolvedValue([]);
    await service.ponto(7, 10, 99, new Date('2026-10-18T00:00:00.000Z'), new Date('2026-10-18T00:00:00.000Z'));
    expect(prisma.registroPonto.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        dataOperacional: {
          gte: new Date('2026-10-18T00:00:00.000Z'),
          lte: new Date('2026-10-18T23:59:59.999Z'),
        },
      }),
    }));
  });

  it('não permite administrador configurar outro restaurante', async () => {
    await expect(service.configurarVinculo(2, 10, 7, 99, [])).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('permite super administrador configurar vínculo sem restaurante próprio', async () => {
    prisma.usuario.findFirst
      .mockResolvedValueOnce({ id: 1, role: 'SUPER_ADMIN' })
      .mockResolvedValueOnce({ id: 7, role: 'CONTADOR', ativo: true })
      .mockResolvedValueOnce({ id: 99, role: 'COLLABORATOR', ativo: true });
    prisma.contadorRestaurante.upsert.mockResolvedValue({});
    prisma.contadorFuncionario.upsert.mockResolvedValue({});
    await expect(service.configurarVinculo(1, 10, 7, 99, ['PONTO'] as any)).resolves.toBeDefined();
  });

  it('revoga vínculos ao remover todas as permissões', async () => {
    prisma.usuario.findFirst
      .mockResolvedValueOnce({ id: 1, role: 'SUPER_ADMIN' })
      .mockResolvedValueOnce({ id: 7, role: 'CONTADOR', ativo: true })
      .mockResolvedValueOnce({ id: 99, role: 'COLLABORATOR', ativo: true });
    prisma.contadorRestaurante.upsert.mockResolvedValue({});
    await expect(service.configurarVinculo(1, 10, 7, 99, [])).resolves.toEqual({ contadorId: 7, restauranteId: 10, permissoes: [] });
    expect(prisma.contadorFuncionario.deleteMany).toHaveBeenCalledWith({ where: { contadorId: 7, restauranteId: 10 } });
    expect(prisma.contadorFuncionario.upsert).not.toHaveBeenCalled();
  });
});
