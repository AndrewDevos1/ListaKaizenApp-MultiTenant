import { BadRequestException } from '@nestjs/common';
import { PontoService } from './ponto.service';

describe('PontoService', () => {
  const prisma = {
    registroPonto: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  } as any;
  const service = new PontoService(prisma);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.registroPonto.findFirst.mockResolvedValue(null);
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

  afterEach(() => {
    jest.useRealTimers();
  });

  it('mantém a data operacional da ENTRADA ao registrar SAÍDA após meia-noite', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-20T05:00:00.000Z')); // 02h de Brasília
    const dataOperacional = new Date('2026-10-19T00:00:00.000Z');
    const entrada = { id: 1, tipo: 'ENTRADA', registradoEm: new Date('2026-10-19T21:00:00.000Z'), dataOperacional };
    prisma.registroPonto.findFirst.mockResolvedValue(entrada);
    prisma.registroPonto.findMany.mockResolvedValue([entrada]);
    prisma.registroPonto.create.mockResolvedValue({ id: 2, tipo: 'SAIDA', dataOperacional });

    await expect(service.registrar(7, 3, { tipo: 'SAIDA' as any })).resolves.toMatchObject({
      jornadaEncerrada: true,
      registro: { tipo: 'SAIDA', dataOperacional },
    });
    expect(prisma.registroPonto.findFirst).toHaveBeenCalledWith({
      where: { usuarioId: 7, restauranteId: 3 },
      orderBy: [{ registradoEm: 'desc' }, { id: 'desc' }],
    });
    expect(prisma.registroPonto.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { usuarioId: 7, restauranteId: 3, dataOperacional },
    }));
    expect(prisma.registroPonto.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tipo: 'SAIDA', dataOperacional }),
    }));
  });

  it('mantém jornada com PAUSA e RETORNO aberta após 00h, sem criar nova ENTRADA', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-20T05:00:00.000Z'));
    const dataOperacional = new Date('2026-10-19T00:00:00.000Z');
    const registros = [
      { tipo: 'ENTRADA', registradoEm: new Date('2026-10-19T21:00:00Z'), dataOperacional },
      { tipo: 'PAUSA', registradoEm: new Date('2026-10-20T01:30:00Z'), dataOperacional },
      { tipo: 'RETORNO', registradoEm: new Date('2026-10-20T02:00:00Z'), dataOperacional },
    ];
    prisma.registroPonto.findFirst.mockResolvedValue(registros[2]);
    prisma.registroPonto.findMany.mockResolvedValue(registros);
    const status = await service.status(7, 3);
    expect(status.tiposDisponiveis).toEqual(['SAIDA']);
    expect(status.registrosHoje).toEqual(registros);
    expect(prisma.registroPonto.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { usuarioId: 7, restauranteId: 3, dataOperacional },
    }));
    expect(prisma.registroPonto.create).not.toHaveBeenCalled();

    await expect(service.registrar(7, 3, { tipo: 'ENTRADA' as any })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.registroPonto.create).not.toHaveBeenCalled();
  });

  it('preserva jornada da data anterior na virada do mês', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-01T05:00:00.000Z'));
    const dataOperacional = new Date('2026-10-31T00:00:00.000Z');
    const entrada = { tipo: 'ENTRADA', registradoEm: new Date('2026-10-31T21:00:00Z'), dataOperacional };
    prisma.registroPonto.findFirst.mockResolvedValue(entrada);
    prisma.registroPonto.findMany.mockResolvedValue([entrada]);
    prisma.registroPonto.create.mockResolvedValue({ tipo: 'SAIDA' });

    await service.registrar(7, 3, { tipo: 'SAIDA' as any });
    expect(prisma.registroPonto.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ dataOperacional }),
    }));
  });

  it('abre nova data operacional após jornada anterior encerrada', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-20T21:00:00.000Z'));
    prisma.registroPonto.findFirst.mockResolvedValue({
      tipo: 'SAIDA',
      dataOperacional: new Date('2026-10-19T00:00:00.000Z'),
    });
    prisma.registroPonto.findMany.mockResolvedValue([]);
    prisma.registroPonto.create.mockResolvedValue({ tipo: 'ENTRADA' });
    await service.registrar(7, 3, { tipo: 'ENTRADA' as any });
    expect(prisma.registroPonto.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        dataOperacional: new Date('2026-10-20T00:00:00.000Z'),
      }),
    }));
  });
});
