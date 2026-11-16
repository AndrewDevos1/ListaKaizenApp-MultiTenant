import { PrismaService } from "../../prisma/prisma.service";
import { PontoService } from './ponto.service';
import { EspelhoService } from './espelho.service';

// Integração com banco descartável (nome deve conter _test). Pulada sem TEST_DATABASE_URL.
const url = process.env.TEST_DATABASE_URL;
const d = url && /_test/.test(url) ? describe : describe.skip;

d('jornada noturna sem pausa (relógio controlado, banco real)', () => {
  const REST = 1;
  const USER = 5; // colab2 do seed
  let prisma: PrismaService;
  let ponto: PontoService;
  let espelho: EspelhoService;
  const at = (iso: string) => jest.useFakeTimers({ now: new Date(iso), doNotFake: ['setTimeout', 'setInterval', 'setImmediate', 'nextTick', 'queueMicrotask', 'clearTimeout', 'clearInterval', 'clearImmediate', 'performance'] });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    ponto = new PontoService(prisma);
    espelho = new EspelhoService(prisma);
    await prisma.registroPonto.deleteMany({ where: { usuarioId: USER, restauranteId: REST } });
    await prisma.escalaTrabalho.deleteMany({ where: { usuarioId: USER, restauranteId: REST } });
    await prisma.escalaTrabalho.create({
      data: {
        usuarioId: USER, restauranteId: REST, criadoPorId: 3, nome: 'Noturna teste', vigenciaInicio: new Date('2026-10-01T00:00:00Z'),
        dias: { create: [0, 1, 2, 3, 4, 5, 6].map((diaSemana) => ({ diaSemana, trabalha: true, entradaPrevista: '18:00', saidaPrevista: '02:00', toleranciaMinutos: 0 })) },
      },
    });
  });
  afterEach(() => jest.useRealTimers());
  afterAll(async () => {
    await prisma.registroPonto.deleteMany({ where: { usuarioId: USER, restauranteId: REST } });
    await prisma.escalaTrabalho.deleteMany({ where: { usuarioId: USER, restauranteId: REST } });
    await prisma.$disconnect();
  });

  it('31/10 18h -> 01/11 02h (BRT): 480 min, data operacional 31/10, sem duplicar em novembro', async () => {
    at('2026-10-31T21:00:00Z'); // 18:00 BRT
    await ponto.registrar(USER, REST, { tipo: 'ENTRADA' as any });
    at('2026-11-01T01:00:00Z'); // 22:00 BRT, ainda aberta
    expect((await ponto.status(USER, REST)).tiposDisponiveis).toEqual(['PAUSA', 'SAIDA']);
    at('2026-11-01T05:00:00Z'); // 02:00 BRT de 01/11
    await ponto.registrar(USER, REST, { tipo: 'SAIDA' as any });

    const regs = await prisma.registroPonto.findMany({ where: { usuarioId: USER, restauranteId: REST }, orderBy: { id: 'asc' } });
    expect(regs.map((r) => [r.tipo, r.dataOperacional.toISOString().slice(0, 10)])).toEqual([['ENTRADA', '2026-10-31'], ['SAIDA', '2026-10-31']]);

    const out = await espelho.consultar(REST, USER, '2026-10');
    expect(out.dias).toContainEqual(expect.objectContaining({ data: '2026-10-31', minutosPrevistos: 480, minutosRealizados: 480, pendente: false }));
    const nov = await espelho.consultar(REST, USER, '2026-11');
    expect(nov.dias.find((x: any) => x.data === '2026-11-01')).toEqual(expect.objectContaining({ minutosRealizados: 0 }));
    expect(out.totais.minutosRealizados + nov.totais.minutosRealizados).toBe(480);
  });
});
