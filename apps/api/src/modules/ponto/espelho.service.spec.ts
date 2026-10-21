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

  it('apura 18h–02h sem pausa como 8 horas na data da ENTRADA', async () => {
    const dataOperacional = new Date('2026-10-19T00:00:00.000Z');
    prisma.registroPonto.findMany.mockResolvedValue([
      { tipo: 'ENTRADA', registradoEm: new Date('2026-10-19T21:00:00Z'), dataOperacional },
      { tipo: 'SAIDA', registradoEm: new Date('2026-10-20T05:00:00Z'), dataOperacional },
    ]);
    prisma.escalaTrabalho.findMany.mockResolvedValue([{
      vigenciaInicio: new Date('2026-10-01T00:00:00Z'), vigenciaFim: null,
      dias: [{ diaSemana: 1, trabalha: true, entradaPrevista: '18:00', saidaPrevista: '02:00', toleranciaMinutos: 0 }],
    }]);

    const espelho = await service.consultar(3, 7, '2026-10');
    expect(espelho.dias).toContainEqual(expect.objectContaining({
      data: '2026-10-19', minutosPrevistos: 480, minutosRealizados: 480, saldoOperacionalMinutos: 0, pendente: false,
      batidas: expect.arrayContaining([expect.objectContaining({ tipo: 'SAIDA' })]),
    }));
    expect(espelho.totais.minutosRealizados).toBe(480);
    expect(prisma.registroPonto.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ usuarioId: 7, restauranteId: 3 }),
    }));
  });

  it('desconta somente pausa registrada na jornada noturna', async () => {
    const dataOperacional = new Date('2026-10-19T00:00:00.000Z');
    prisma.registroPonto.findMany.mockResolvedValue([
      { tipo: 'ENTRADA', registradoEm: new Date('2026-10-19T21:00:00Z'), dataOperacional },
      { tipo: 'PAUSA', registradoEm: new Date('2026-10-20T01:30:00Z'), dataOperacional },
      { tipo: 'RETORNO', registradoEm: new Date('2026-10-20T02:00:00Z'), dataOperacional },
      { tipo: 'SAIDA', registradoEm: new Date('2026-10-20T05:00:00Z'), dataOperacional },
    ]);
    prisma.escalaTrabalho.findMany.mockResolvedValue([{
      vigenciaInicio: new Date('2026-10-01T00:00:00Z'), vigenciaFim: null,
      dias: [{ diaSemana: 1, trabalha: true, entradaPrevista: '18:00', saidaPrevista: '02:00', toleranciaMinutos: 0 }],
    }]);
    const espelho = await service.consultar(3, 7, '2026-10');
    expect(espelho.dias).toContainEqual(expect.objectContaining({
      data: '2026-10-19', minutosPrevistos: 480, minutosRealizados: 450, saldoOperacionalMinutos: -30,
    }));
  });

  it('não duplica SAÍDA de 01/11 no espelho de novembro', async () => {
    const dataOperacional = new Date('2026-10-31T00:00:00.000Z');
    const registros = [
      { tipo: 'ENTRADA', registradoEm: new Date('2026-10-31T21:00:00Z'), dataOperacional },
      { tipo: 'SAIDA', registradoEm: new Date('2026-11-01T05:00:00Z'), dataOperacional },
    ];
    prisma.registroPonto.findMany.mockImplementation(async ({ where }: any) =>
      registros.filter((r) => r.dataOperacional >= where.dataOperacional.gte && r.dataOperacional <= where.dataOperacional.lte));
    prisma.escalaTrabalho.findMany.mockResolvedValue([{
      vigenciaInicio: new Date('2026-10-01T00:00:00Z'), vigenciaFim: null,
      dias: [{ diaSemana: 6, trabalha: true, entradaPrevista: '18:00', saidaPrevista: '02:00', toleranciaMinutos: 0 }],
    }]);
    const outubro = await service.consultar(3, 7, '2026-10');
    const novembro = await service.consultar(3, 7, '2026-11');
    expect(outubro.dias).toContainEqual(expect.objectContaining({ data: '2026-10-31', minutosRealizados: 480 }));
    expect(novembro.dias).toContainEqual(expect.objectContaining({ data: '2026-11-01', minutosRealizados: 0, batidas: [] }));
    expect(outubro.totais.minutosRealizados + novembro.totais.minutosRealizados).toBe(480);
  });

  it('mantém sobreposição de atestado aprovado em turno noturno sem crédito além do previsto', async () => {
    prisma.registroPonto.findMany.mockResolvedValue([]);
    prisma.escalaTrabalho.findMany.mockResolvedValue([{
      vigenciaInicio: new Date('2026-10-01T00:00:00Z'), vigenciaFim: null,
      dias: [{ diaSemana: 1, trabalha: true, entradaPrevista: '18:00', saidaPrevista: '02:00', toleranciaMinutos: 0 }],
    }]);
    prisma.atestado.findMany.mockResolvedValue([{
      inicio: new Date('2026-10-19T00:00:00Z'), fim: new Date('2026-10-19T00:00:00Z'),
      horaInicio: '18:00', horaFim: '02:00',
    }]);
    const espelho = await service.consultar(3, 7, '2026-10');
    expect(espelho.dias).toContainEqual(expect.objectContaining({
      data: '2026-10-19', minutosPrevistos: 480, minutosAbonados: 480, saldoOperacionalMinutos: 0,
    }));
  });
});
