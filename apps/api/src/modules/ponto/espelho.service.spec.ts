import { EspelhoService } from './espelho.service';

describe('EspelhoService', () => {
  const prisma = { registroPonto: { findMany: jest.fn() }, escalaTrabalho: { findMany: jest.fn() }, atestado: { findMany: jest.fn() } } as any;
  const service = new EspelhoService(prisma);

  beforeEach(() => { jest.resetAllMocks(); prisma.atestado.findMany.mockResolvedValue([]); });

  it('calcula horas realizadas, previstas e pendência sem mutar dados', async () => {
    prisma.registroPonto.findMany.mockResolvedValue([
      { tipo: 'ENTRADA', registradoEm: new Date('2026-11-03T11:00:00Z'), dataOperacional: new Date('2026-11-03T00:00:00Z') },
      { tipo: 'SAIDA', registradoEm: new Date('2026-11-03T20:00:00Z'), dataOperacional: new Date('2026-11-03T00:00:00Z') },
    ]);
    prisma.escalaTrabalho.findMany.mockResolvedValue([{ vigenciaInicio: new Date('2026-11-01T00:00:00Z'), vigenciaFim: null, dias: [{ diaSemana: 2, trabalha: true, entradaPrevista: '08:00', saidaPrevista: '17:00', toleranciaMinutos: 0 }] }]);

    const espelho = await service.consultar(3, 7, '2026-11');
    expect(espelho.totais).toEqual({ minutosRealizados: 540, minutosAbonados: 0, minutosPrevistos: 540, saldoOperacionalMinutos: 0, diasPendentes: 0 });
    expect(espelho.dias).toContainEqual(expect.objectContaining({ data: '2026-11-03', minutosRealizados: 540, minutosPrevistos: 540, pendente: false }));
    expect(espelho.dias).toContainEqual(expect.objectContaining({ data: '2026-11-04', minutosRealizados: 0, minutosPrevistos: 0, pendente: false }));
    expect(prisma.registroPonto.findMany).toHaveBeenCalledTimes(1);
  });

  it('zera saldo operacional dentro da tolerância da escala', async () => {
    prisma.registroPonto.findMany.mockResolvedValue([
      { tipo: 'ENTRADA', registradoEm: new Date('2026-11-03T11:00:00Z'), dataOperacional: new Date('2026-11-03T00:00:00Z') },
      { tipo: 'SAIDA', registradoEm: new Date('2026-11-03T19:55:00Z'), dataOperacional: new Date('2026-11-03T00:00:00Z') },
    ]);
    prisma.escalaTrabalho.findMany.mockResolvedValue([{ vigenciaInicio: new Date('2026-11-01T00:00:00Z'), vigenciaFim: null, dias: [{ diaSemana: 2, trabalha: true, entradaPrevista: '08:00', saidaPrevista: '17:00', toleranciaMinutos: 5 }] }]);

    const espelho = await service.consultar(3, 7, '2026-11');
    expect(espelho.dias).toContainEqual(expect.objectContaining({ data: '2026-11-03', saldoOperacionalMinutos: 0 }));
  });

  it('abona somente sobreposição aprovada sem criar crédito artificial', async () => {
    prisma.registroPonto.findMany.mockResolvedValue([
      { tipo: 'ENTRADA', registradoEm: new Date('2026-11-03T11:00:00Z'), dataOperacional: new Date('2026-11-03T00:00:00Z') },
      { tipo: 'SAIDA', registradoEm: new Date('2026-11-03T14:00:00Z'), dataOperacional: new Date('2026-11-03T00:00:00Z') },
    ]);
    prisma.escalaTrabalho.findMany.mockResolvedValue([{ vigenciaInicio: new Date('2026-11-01T00:00:00Z'), vigenciaFim: null, dias: [{ diaSemana: 2, trabalha: true, entradaPrevista: '08:00', saidaPrevista: '17:00', toleranciaMinutos: 0 }] }]);
    prisma.atestado.findMany.mockResolvedValue([{ inicio: new Date('2026-11-03T00:00:00Z'), fim: new Date('2026-11-03T00:00:00Z'), horaInicio: '08:00', horaFim: '12:00', situacao: 'APROVADO' }]);

    const espelho = await service.consultar(3, 7, '2026-11');
    expect(espelho.dias).toContainEqual(expect.objectContaining({ data: '2026-11-03', minutosAbonados: 240, saldoOperacionalMinutos: -120 }));
  });

  it('não duplica minutos em atestados parciais sobrepostos', async () => {
    prisma.registroPonto.findMany.mockResolvedValue([]);
    prisma.escalaTrabalho.findMany.mockResolvedValue([{ vigenciaInicio: new Date('2026-11-01T00:00:00Z'), vigenciaFim: null, dias: [{ diaSemana: 2, trabalha: true, entradaPrevista: '08:00', saidaPrevista: '17:00', toleranciaMinutos: 0 }] }]);
    prisma.atestado.findMany.mockResolvedValue([
      { inicio: new Date('2026-11-03T00:00:00Z'), fim: new Date('2026-11-03T00:00:00Z'), horaInicio: '08:00', horaFim: '12:00' },
      { inicio: new Date('2026-11-03T00:00:00Z'), fim: new Date('2026-11-03T00:00:00Z'), horaInicio: '10:00', horaFim: '14:00' },
    ]);
    const espelho = await service.consultar(3, 7, '2026-11');
    expect(espelho.dias).toContainEqual(expect.objectContaining({ data: '2026-11-03', minutosAbonados: 360, saldoOperacionalMinutos: -180 }));
  });

  it('ignora atestado não aprovado', async () => {
    prisma.registroPonto.findMany.mockResolvedValue([]);
    prisma.escalaTrabalho.findMany.mockResolvedValue([{ vigenciaInicio: new Date('2026-11-01T00:00:00Z'), vigenciaFim: null, dias: [{ diaSemana: 2, trabalha: true, entradaPrevista: '08:00', saidaPrevista: '17:00', toleranciaMinutos: 0 }] }]);
    prisma.atestado.findMany.mockResolvedValue([]);

    const espelho = await service.consultar(3, 7, '2026-11');
    expect(espelho.dias).toContainEqual(expect.objectContaining({ data: '2026-11-03', minutosAbonados: 0, saldoOperacionalMinutos: -540 }));
  });
});
