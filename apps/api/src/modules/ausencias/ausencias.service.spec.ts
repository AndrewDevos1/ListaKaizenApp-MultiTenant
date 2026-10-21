import { BadRequestException } from '@nestjs/common';
import { AusenciasService } from './ausencias.service';

describe('AusenciasService', () => {
  const prisma = {
    usuario: { findFirst: jest.fn() },
    classificacaoAusencia: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn() },
    appLog: { create: jest.fn() },
    notificacao: { create: jest.fn() },
    $transaction: jest.fn(),
    $executeRaw: jest.fn(),
  } as any;
  const service = new AusenciasService(prisma);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((callback: (tx: any) => unknown) => callback({
      usuario: prisma.usuario,
      classificacaoAusencia: prisma.classificacaoAusencia,
      appLog: prisma.appLog,
      notificacao: prisma.notificacao,
      $executeRaw: prisma.$executeRaw,
    }));
    prisma.classificacaoAusencia.findUnique.mockResolvedValue(null);
  });

  it('classifica falta do colaborador do próprio restaurante sem duplicar', async () => {
    prisma.usuario.findFirst.mockResolvedValue({ id: 7 });
    prisma.classificacaoAusencia.upsert.mockResolvedValue({ id: 9, tipo: 'FALTA' });

    await expect(service.classificar(3, 10, {
      usuarioId: 7,
      data: '2026-10-18',
      tipo: 'FALTA',
      motivo: 'Ausência não justificada',
    })).resolves.toEqual({ id: 9, tipo: 'FALTA' });

    expect(prisma.classificacaoAusencia.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { usuarioId_restauranteId_data: { usuarioId: 7, restauranteId: 3, data: new Date('2026-10-18T00:00:00.000Z') } },
      create: expect.objectContaining({ usuarioId: 7, restauranteId: 3, classificadoPorId: 10, tipo: 'FALTA' }),
      update: expect.objectContaining({ classificadoPorId: 10, tipo: 'FALTA' }),
    }));
    expect(prisma.appLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ acao: 'CLASSIFICAR_AUSENCIA', entidade: 'ClassificacaoAusencia', entidadeId: 9, restauranteId: 3, usuarioId: 10 }),
    }));
    expect(prisma.notificacao.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ usuarioId: 7, restauranteId: 3, tipo: 'CLASSIFICACAO_FALTA' }),
    }));
  });

  it('não cria outra notificação ao repetir a mesma falta', async () => {
    prisma.usuario.findFirst.mockResolvedValue({ id: 7 });
    prisma.classificacaoAusencia.findUnique.mockResolvedValue({ id: 9, tipo: 'FALTA' });
    prisma.classificacaoAusencia.upsert.mockResolvedValue({ id: 9, tipo: 'FALTA' });

    await service.classificar(3, 10, { usuarioId: 7, data: '2026-10-18', tipo: 'FALTA' });

    expect(prisma.notificacao.create).not.toHaveBeenCalled();
  });

  it('inclui notificação na mesma transação da classificação', async () => {
    prisma.usuario.findFirst.mockResolvedValue({ id: 7 });
    prisma.classificacaoAusencia.upsert.mockResolvedValue({ id: 9, tipo: 'FALTA' });

    await service.classificar(3, 10, { usuarioId: 7, data: '2026-10-18', tipo: 'FALTA' });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.notificacao.create).toHaveBeenCalled();
  });

  it('rejeita data impossível com erro de validação', async () => {
    prisma.usuario.findFirst.mockResolvedValue({ id: 7 });

    await expect(service.classificar(3, 10, { usuarioId: 7, data: '2026-02-30', tipo: 'FALTA' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lista classificações apenas do restaurante solicitado', async () => {
    prisma.classificacaoAusencia.findMany.mockResolvedValue([]);

    await service.listar(3, { usuarioId: 7, tipo: 'FOLGA' as any });

    expect(prisma.classificacaoAusencia.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ restauranteId: 3, usuarioId: 7, tipo: 'FOLGA' }),
    }));
  });

  it('rejeita classificação de usuário de outro restaurante', async () => {
    prisma.usuario.findFirst.mockResolvedValue(null);

    await expect(service.classificar(3, 10, {
      usuarioId: 99,
      data: '2026-10-18',
      tipo: 'FOLGA',
    })).rejects.toThrow('Usuário não encontrado');
    expect(prisma.classificacaoAusencia.upsert).not.toHaveBeenCalled();
  });
});
