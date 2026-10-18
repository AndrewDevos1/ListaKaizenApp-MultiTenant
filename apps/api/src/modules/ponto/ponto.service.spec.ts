import { BadRequestException } from '@nestjs/common';
import { PontoService } from './ponto.service';

describe('PontoService', () => {
  const prisma = {
    registroPonto: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  } as any;
  const service = new PontoService(prisma);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((callback: (tx: any) => unknown) => callback({
      registroPonto: prisma.registroPonto,
      $executeRaw: jest.fn(),
    }));
  });

  it('registra a primeira ENTRADA do próprio restaurante', async () => {
    prisma.registroPonto.findMany.mockResolvedValue([]);
    prisma.registroPonto.create.mockResolvedValue({ id: 1, tipo: 'ENTRADA' });

    await expect(service.registrar(7, 3, {})).resolves.toEqual({
      registro: { id: 1, tipo: 'ENTRADA' },
      tiposDisponiveis: ['PAUSA', 'SAIDA'],
      jornadaEncerrada: false,
    });
    expect(prisma.registroPonto.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ usuarioId: 7, restauranteId: 3, tipo: 'ENTRADA' }),
      }),
    );
  });

  it('rejeita transição inválida sem gravar', async () => {
    prisma.registroPonto.findMany.mockResolvedValue([{ tipo: 'ENTRADA' }]);

    await expect(service.registrar(7, 3, { tipo: 'RETORNO' as any })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.registroPonto.create).not.toHaveBeenCalled();
  });

  it('rejeita quinto registro no mesmo dia', async () => {
    prisma.registroPonto.findMany.mockResolvedValue([
      { tipo: 'ENTRADA' },
      { tipo: 'PAUSA' },
      { tipo: 'RETORNO' },
      { tipo: 'SAIDA' },
    ]);

    await expect(service.registrar(7, 3, {})).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.registroPonto.create).not.toHaveBeenCalled();
  });

  it('não mistura histórico de outro restaurante', async () => {
    prisma.registroPonto.findMany.mockResolvedValue([{ tipo: 'ENTRADA' }]);
    prisma.registroPonto.create.mockResolvedValue({ id: 2, tipo: 'SAIDA' });

    await service.registrar(7, 3, { tipo: 'SAIDA' as any });
    expect(prisma.registroPonto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ usuarioId: 7, restauranteId: 3 }),
      }),
    );
  });

  it('filtra histórico pela data operacional de Brasília', async () => {
    prisma.registroPonto.findMany.mockResolvedValue([]);

    await service.historico(7, 3, new Date('2026-10-18T12:00:00.000Z'));
    expect(prisma.registroPonto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          usuarioId: 7,
          restauranteId: 3,
          dataOperacional: { gte: new Date('2026-10-18T00:00:00.000Z') },
        }),
      }),
    );
  });
});
