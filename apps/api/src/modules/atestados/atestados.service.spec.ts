import { BadRequestException } from '@nestjs/common';
import { AtestadosService } from './atestados.service';

describe('AtestadosService', () => {
  const prisma = {
    usuario: { findFirst: jest.fn() },
    atestado: { create: jest.fn(), findMany: jest.fn() },
    appLog: { create: jest.fn() },
    $transaction: jest.fn(),
  } as any;
  const service = new AtestadosService(prisma);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((callback: (tx: any) => unknown) => callback({
      atestado: prisma.atestado, appLog: prisma.appLog,
    }));
  });

  it('cadastra atestado no próprio restaurante sem lançar banco de horas', async () => {
    prisma.usuario.findFirst.mockResolvedValue({ id: 7 });
    prisma.atestado.create.mockResolvedValue({ id: 9, usuarioId: 7 });

    await expect(service.criar(3, 10, {
      usuarioId: 7, inicio: '2026-10-18', fim: '2026-10-20', motivo: 'Atestado médico',
    })).resolves.toEqual({ id: 9, usuarioId: 7 });

    expect(prisma.atestado.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ usuarioId: 7, restauranteId: 3, criadoPorId: 10, motivo: 'Atestado médico' }),
    }));
    expect(prisma.appLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ acao: 'ATESTADO_CRIADO', entidade: 'Atestado', entidadeId: 9, restauranteId: 3, usuarioId: 10 }),
    }));
  });

  it('rejeita período invertido', async () => {
    await expect(service.criar(3, 10, {
      usuarioId: 7, inicio: '2026-10-20', fim: '2026-10-18', motivo: 'Atestado médico',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.usuario.findFirst).not.toHaveBeenCalled();
  });

  it('não lista atestados de outro restaurante', async () => {
    prisma.atestado.findMany.mockResolvedValue([]);
    await service.listar(3, { usuarioId: 7 });
    expect(prisma.atestado.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ restauranteId: 3, usuarioId: 7 }),
    }));
  });
});
