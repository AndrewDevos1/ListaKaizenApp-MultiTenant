import { EspelhoService } from './espelho.service';

describe('EspelhoService', () => {
  const prisma = { registroPonto: { findMany: jest.fn() }, escalaTrabalho: { findMany: jest.fn() } } as any;
  const service = new EspelhoService(prisma);

  beforeEach(() => jest.resetAllMocks());

  it('calcula horas realizadas, previstas e pendência sem mutar dados', async () => {
    prisma.registroPonto.findMany.mockResolvedValue([
      { tipo: 'ENTRADA', registradoEm: new Date('2026-11-03T11:00:00Z'), dataOperacional: new Date('2026-11-03T00:00:00Z') },
      { tipo: 'SAIDA', registradoEm: new Date('2026-11-03T20:00:00Z'), dataOperacional: new Date('2026-11-03T00:00:00Z') },
    ]);
    prisma.escalaTrabalho.findMany.mockResolvedValue([{ vigenciaInicio: new Date('2026-11-01T00:00:00Z'), vigenciaFim: null, dias: [{ diaSemana: 2, trabalha: true, entradaPrevista: '08:00', saidaPrevista: '17:00', toleranciaMinutos: 0 }] }]);

    const espelho = await service.consultar(3, 7, '2026-11');
    expect(espelho.totais).toEqual({ minutosRealizados: 540, minutosPrevistos: 540, saldoOperacionalMinutos: 0, diasPendentes: 0 });
    expect(espelho.dias).toContainEqual(expect.objectContaining({ data: '2026-11-03', minutosRealizados: 540, minutosPrevistos: 540, pendente: false }));
    expect(espelho.dias).toContainEqual(expect.objectContaining({ data: '2026-11-04', minutosRealizados: 0, minutosPrevistos: 0, pendente: false }));
    expect(prisma.registroPonto.findMany).toHaveBeenCalledTimes(1);
  });
});
