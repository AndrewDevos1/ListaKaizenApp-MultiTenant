import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BancoHorasService } from './banco-horas.service';

describe('BancoHorasService', () => {
  const prisma = { usuario: { findFirst: jest.fn() }, lancamentoBancoHoras: { create: jest.fn(), findMany: jest.fn() }, appLog: { create: jest.fn() }, $transaction: jest.fn() } as any;
  const service = new BancoHorasService(prisma);
  beforeEach(() => { jest.resetAllMocks(); prisma.$transaction.mockImplementation((cb: (tx: any) => unknown) => cb({ usuario: prisma.usuario, lancamentoBancoHoras: prisma.lancamentoBancoHoras, appLog: prisma.appLog })); });
  it('cria ajuste manual auditado no tenant', async () => {
    prisma.usuario.findFirst.mockResolvedValue({ id: 7 }); prisma.lancamentoBancoHoras.create.mockResolvedValue({ id: 1 });
    await expect(service.criar(3, 10, { usuarioId: 7, tipo: 'AJUSTE_MANUAL' as any, minutosDelta: 60, dataReferencia: '2026-11-03', motivo: 'Correção aprovada' })).resolves.toEqual({ id: 1 });
    expect(prisma.appLog.create).toHaveBeenCalled();
  });
  it('rejeita outro tenant e lançamento sem impacto', async () => {
    prisma.usuario.findFirst.mockResolvedValue(null);
    await expect(service.criar(3, 10, { usuarioId: 9, tipo: 'AJUSTE_MANUAL' as any, minutosDelta: 60, dataReferencia: '2026-11-03', motivo: 'x' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.criar(3, 10, { usuarioId: 7, tipo: 'AJUSTE_MANUAL' as any, minutosDelta: 0, dataReferencia: '2026-11-03', motivo: 'x' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
