import { BadRequestException } from '@nestjs/common';
import { EscalaService } from './escala.service';

describe('EscalaService', () => {
  const prisma = {
    usuario: { findFirst: jest.fn() },
    escalaTrabalho: { findFirst: jest.fn(), create: jest.fn() },
    appLog: { create: jest.fn() },
    $transaction: jest.fn(),
  } as any;
  const service = new EscalaService(prisma);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((callback: (tx: any) => unknown) => callback({
      usuario: prisma.usuario, escalaTrabalho: prisma.escalaTrabalho, appLog: prisma.appLog,
    }));
  });

  it('cria escala vigente sem sobrepor outra do mesmo colaborador', async () => {
    prisma.usuario.findFirst.mockResolvedValue({ id: 7 });
    prisma.escalaTrabalho.findFirst.mockResolvedValue(null);
    prisma.escalaTrabalho.create.mockResolvedValue({ id: 1, usuarioId: 7 });

    await expect(service.criar(3, 10, {
      usuarioId: 7, nome: 'Comercial', vigenciaInicio: '2026-11-01',
      dias: [{ diaSemana: 1, trabalha: true, entradaPrevista: '08:00', saidaPrevista: '17:00' }],
    })).resolves.toMatchObject({ id: 1, usuarioId: 7 });
    expect(prisma.escalaTrabalho.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ restauranteId: 3, usuarioId: 7, vigenciaInicio: new Date('2026-11-01T00:00:00.000Z') }),
    }));
  });

  it('rejeita vigência que se sobrepõe à escala existente', async () => {
    prisma.usuario.findFirst.mockResolvedValue({ id: 7 });
    prisma.escalaTrabalho.findFirst.mockResolvedValue({ id: 9 });

    await expect(service.criar(3, 10, {
      usuarioId: 7, nome: 'Comercial', vigenciaInicio: '2026-11-01',
      dias: [{ diaSemana: 1, trabalha: true, entradaPrevista: '08:00', saidaPrevista: '17:00' }],
    })).rejects.toBeInstanceOf(BadRequestException);
  });
});
