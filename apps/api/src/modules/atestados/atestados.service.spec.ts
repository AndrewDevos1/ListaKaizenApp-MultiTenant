import { BadRequestException, ConflictException } from '@nestjs/common';

import { AtestadosService } from './atestados.service';

describe('AtestadosService', () => {
  const prisma = {
    usuario: { findFirst: jest.fn() },
    atestado: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
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

  it('converte criação concorrente duplicada em conflito', async () => {
    prisma.usuario.findFirst.mockResolvedValue({ id: 7 });
    prisma.atestado.create.mockRejectedValue({ code: 'P2002' });

    await expect(service.criar(3, 10, {
      usuarioId: 7, inicio: '2026-10-18', fim: '2026-10-20', motivo: 'Atestado médico',
    })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.appLog.create).not.toHaveBeenCalled();
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

  it('rejeita data civil inexistente', async () => {
    await expect(service.criar(3, 10, {
      usuarioId: 7, inicio: '2026-02-30', fim: '2026-03-01', motivo: 'Atestado médico',
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('aprova pendente com auditoria e não permite redecisão', async () => {
    prisma.atestado.findFirst.mockResolvedValueOnce({ id: 9 }).mockResolvedValueOnce({ id: 9, situacao: 'APROVADO' });
    prisma.atestado.updateMany.mockResolvedValue({ count: 1 });
    await expect(service.decidir(3, 10, 9, { situacao: 'APROVADO' })).resolves.toEqual({ id: 9, situacao: 'APROVADO' });
    expect(prisma.atestado.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 9, restauranteId: 3, situacao: 'PENDENTE' } }));
    expect(prisma.appLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ acao: 'ATESTADO_APROVADO', entidadeId: 9, restauranteId: 3, usuarioId: 10 }) }));
    prisma.atestado.findFirst.mockResolvedValue({ id: 9 });
    prisma.atestado.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.decidir(3, 10, 9, { situacao: 'REJEITADO' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cancela somente atestado do restaurante e audita', async () => {
    prisma.atestado.findFirst.mockResolvedValueOnce({ id: 9, situacao: 'ATIVO' }).mockResolvedValueOnce({ id: 9, situacao: 'CANCELADO' });
    prisma.atestado.updateMany.mockResolvedValue({ count: 1 });
    await expect(service.cancelar(3, 10, 9)).resolves.toEqual({ id: 9, situacao: 'CANCELADO' });
    expect(prisma.atestado.findFirst).toHaveBeenCalledWith({ where: { id: 9, restauranteId: 3 }, select: { id: true, situacao: true } });
    expect(prisma.appLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ acao: 'ATESTADO_CANCELADO', entidadeId: 9, restauranteId: 3, usuarioId: 10 }),
    }));
  });

  it('rejeita cancelamento perdido para concorrência sem auditar', async () => {
    prisma.atestado.findFirst.mockResolvedValue({ id: 9, situacao: 'ATIVO' });
    prisma.atestado.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.cancelar(3, 10, 9)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.appLog.create).not.toHaveBeenCalled();
  });
});
