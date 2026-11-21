import { INestApplication } from '@nestjs/common';
import { PrismaClient, UserRole } from '@prisma/client';
import { api, bearer, bootApp, describeDb, login, mkTenant, mkUser, mover, relogio, reporter } from './helpers/e2e-app';

// E2E de PONTO / RH: API NestJS real + JWT real + PostgreSQL descartável.
// Relógio controlado só para Date (nunca altera o horário do SO). BRT = UTC-3.
const rep = reporter('ponto-rh', 'Relatório E2E — Ponto e RH');
const dia = (iso: string) => iso.slice(0, 10);

describeDb('E2E Ponto/RH (API + PostgreSQL descartável)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let A: { id: number }, B: { id: number }, C: { id: number };
  let adminA: string, adminB: string, superT: string;
  const post = (t: string, p: string, b: object = {}) => api(app).post(`/api/v1${p}`).set(bearer(t)).send(b);
  const put = (t: string, p: string, b: object = {}) => api(app).put(`/api/v1${p}`).set(bearer(t)).send(b);
  const get = (t: string, p: string) => api(app).get(`/api/v1${p}`).set(bearer(t));
  const putSuper = (t: string, id: number, b: object) => api(app).put(`/api/restaurantes/${id}/modulos`).set(bearer(t)).send(b);

  const escalaSemana = (inicio: string, entrada = '08:00', saida = '17:00', folgas = [0, 6]) => ({
    nome: 'Escala E2E',
    vigenciaInicio: inicio,
    dias: [0, 1, 2, 3, 4, 5, 6].map((diaSemana) =>
      folgas.includes(diaSemana)
        ? { diaSemana, trabalha: false }
        : { diaSemana, trabalha: true, entradaPrevista: entrada, saidaPrevista: saida, toleranciaMinutos: 0 },
    ),
  });
  const colaborador = async (nome: string, restauranteId: number) => {
    const u = await mkUser(prisma, nome, UserRole.COLLABORATOR, restauranteId);
    return { u, token: await login(app, u.email) };
  };
  const batida = (t: string, iso: string, body: object = {}) => {
    mover(iso);
    return post(t, '/collaborator/ponto/registrar', body);
  };
  const dbBatidas = (usuarioId: number) =>
    prisma.registroPonto.findMany({ where: { usuarioId }, orderBy: [{ registradoEm: 'asc' }, { id: 'asc' }] });

  beforeAll(async () => {
    ({ app, prisma } = await bootApp());
    relogio('2026-10-01T12:00:00Z');
    A = await mkTenant(prisma, 'E2E Ponto A');
    B = await mkTenant(prisma, 'E2E Ponto B');
    C = await mkTenant(prisma, 'E2E Ponto C sem modulo', { moduloPonto: false });
    const aa = await mkUser(prisma, 'Admin Ponto A', UserRole.ADMIN, A.id);
    const ab = await mkUser(prisma, 'Admin Ponto B', UserRole.ADMIN, B.id);
    const su = await mkUser(prisma, 'Super Ponto', UserRole.SUPER_ADMIN, null);
    adminA = await login(app, aa.email);
    adminB = await login(app, ab.email);
    superT = await login(app, su.email);
  });
  afterAll(async () => {
    jest.useRealTimers();
    rep.flush();
    await app?.close();
    await prisma?.$disconnect();
  });

  it('J1 jornada diurna completa: ENTRADA, PAUSA, RETORNO, SAIDA + sequência inválida + espelho + banco de horas', async () => {
    const { u, token } = await colaborador('Colab Diurno', A.id);
    await rep.step('J1 diurna', 'ADMIN cria escala seg-sex 08-17, sáb/dom folga', async () => {
      const r = await post(adminA, '/admin/escalas-trabalho', { usuarioId: u.id, ...escalaSemana('2026-11-01') });
      expect(r.status).toBe(201);
      const dbE = await prisma.escalaTrabalho.findUnique({ where: { id: r.body.id }, include: { dias: true } });
      expect(dbE?.restauranteId).toBe(A.id);
      expect(dbE?.usuarioId).toBe(u.id);
      expect(dbE?.dias.filter((d) => d.trabalha)).toHaveLength(5);
      expect(await prisma.appLog.count({ where: { acao: 'CRIAR_ESCALA_TRABALHO', entidadeId: r.body.id, restauranteId: A.id } })).toBe(1);
      return { http: r.status, efeito: 'escala + 7 dias persistidos; AppLog CRIAR_ESCALA_TRABALHO' };
    });
    await rep.step('J1 diurna', 'sobreposição de escala é recusada', async () => {
      const r = await post(adminA, '/admin/escalas-trabalho', { usuarioId: u.id, ...escalaSemana('2026-11-15') });
      expect(r.status).toBe(400);
      expect(await prisma.escalaTrabalho.count({ where: { usuarioId: u.id } })).toBe(1);
      return { http: r.status, efeito: 'continua 1 escala no banco' };
    });

    mover('2026-11-03T10:55:00Z');
    await rep.step('J1 diurna', 'status inicial só permite ENTRADA', async () => {
      const r = await get(token, '/collaborator/ponto/status');
      expect(r.status).toBe(200);
      expect(r.body.tiposDisponiveis).toEqual(['ENTRADA']);
      expect(r.body.registrosHoje).toEqual([]);
      return { http: r.status, efeito: 'tiposDisponiveis=[ENTRADA]' };
    });
    await rep.step('J1 diurna', 'sem token => 401; ENTRADA 08:00 BRT => 201', async () => {
      mover('2026-11-03T11:00:00Z');
      const sem = await api(app).post('/api/v1/collaborator/ponto/registrar').send({});
      expect(sem.status).toBe(401);
      expect(await dbBatidas(u.id)).toHaveLength(0);
      const r = await post(token, '/collaborator/ponto/registrar', { tipo: 'ENTRADA' });
      expect(r.status).toBe(201);
      expect(r.body.tiposDisponiveis).toEqual(['PAUSA', 'SAIDA']);
      const rows = await dbBatidas(u.id);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ tipo: 'ENTRADA', restauranteId: A.id, usuarioId: u.id });
      expect(rows[0].registradoEm.toISOString()).toBe('2026-11-03T11:00:00.000Z');
      expect(dia(rows[0].dataOperacional.toISOString())).toBe('2026-11-03');
      return { http: r.status, efeito: 'registro ENTRADA 11:00Z, dataOperacional 2026-11-03' };
    });
    await rep.step('J1 diurna', 'ENTRADA duplicada => 400, sem novo registro', async () => {
      const r = await batida(token, '2026-11-03T11:05:00Z', { tipo: 'ENTRADA' });
      expect(r.status).toBe(400);
      expect(await dbBatidas(u.id)).toHaveLength(1);
      return { http: r.status, efeito: 'banco mantém 1 registro' };
    });
    await rep.step('J1 diurna', 'RETORNO sem PAUSA => 400 (sequência inválida)', async () => {
      const r = await batida(token, '2026-11-03T11:06:00Z', { tipo: 'RETORNO' });
      expect(r.status).toBe(400);
      expect(await dbBatidas(u.id)).toHaveLength(1);
      return { http: r.status, efeito: 'banco mantém 1 registro' };
    });
    await rep.step('J1 diurna', 'PAUSA <60s após ENTRADA => 429, sem registro', async () => {
      const r = await batida(token, '2026-11-03T11:00:30Z', { tipo: 'PAUSA' });
      expect(r.status).toBe(429);
      expect(await dbBatidas(u.id)).toHaveLength(1);
      return { http: r.status, efeito: 'antirrajada: banco mantém 1 registro' };
    });
    await rep.step('J1 diurna', 'PAUSA 12:00 BRT (início do intervalo) => 201', async () => {
      const r = await batida(token, '2026-11-03T15:00:00Z', { tipo: 'PAUSA' });
      expect(r.status).toBe(201);
      expect(r.body.tiposDisponiveis).toEqual(['RETORNO']);
      return { http: r.status, efeito: 'próximo permitido: RETORNO' };
    });
    await rep.step('J1 diurna', 'SAIDA durante intervalo => 400; PAUSA repetida => 400', async () => {
      const a = await batida(token, '2026-11-03T15:10:00Z', { tipo: 'SAIDA' });
      const b = await batida(token, '2026-11-03T15:20:00Z', { tipo: 'PAUSA' });
      expect([a.status, b.status]).toEqual([400, 400]);
      expect(await dbBatidas(u.id)).toHaveLength(2);
      return { http: `${a.status}/${b.status}`, efeito: 'banco mantém 2 registros' };
    });
    await rep.step('J1 diurna', 'RETORNO 13:00 BRT sem informar tipo (inferido) => 201', async () => {
      const r = await batida(token, '2026-11-03T16:00:00Z', {});
      expect(r.status).toBe(201);
      expect(r.body.registro.tipo).toBe('RETORNO');
      expect(r.body.tiposDisponiveis).toEqual(['SAIDA']);
      return { http: r.status, efeito: 'tipo inferido RETORNO' };
    });
    await rep.step('J1 diurna', 'SAIDA 18:05 BRT => 201, jornada encerrada', async () => {
      const r = await batida(token, '2026-11-03T21:05:00Z', { tipo: 'SAIDA' });
      expect(r.status).toBe(201);
      expect(r.body.jornadaEncerrada).toBe(true);
      const rows = await dbBatidas(u.id);
      expect(rows.map((x) => x.tipo)).toEqual(['ENTRADA', 'PAUSA', 'RETORNO', 'SAIDA']);
      expect(rows.every((x) => dia(x.dataOperacional.toISOString()) === '2026-11-03' && x.restauranteId === A.id && x.usuarioId === u.id)).toBe(true);
      expect(rows.map((x) => x.registradoEm.toISOString())).toEqual([
        '2026-11-03T11:00:00.000Z', '2026-11-03T15:00:00.000Z', '2026-11-03T16:00:00.000Z', '2026-11-03T21:05:00.000Z',
      ]);
      return { http: r.status, efeito: '4 registros ordenados no PostgreSQL, mesma dataOperacional' };
    });
    await rep.step('J1 diurna', 'nova ENTRADA no mesmo dia após SAIDA => 400 (limite diário)', async () => {
      const r = await batida(token, '2026-11-03T22:00:00Z', { tipo: 'ENTRADA' });
      expect(r.status).toBe(400);
      expect(await dbBatidas(u.id)).toHaveLength(4);
      const st = await get(token, '/collaborator/ponto/status');
      expect(st.body.jornadaEncerrada).toBe(true);
      expect(st.body.tiposDisponiveis).toEqual([]);
      return { http: r.status, efeito: 'banco mantém 4; status jornadaEncerrada=true' };
    });
    await rep.step('J1 diurna', 'histórico filtra por data e rejeita datas inválidas', async () => {
      const ok = await get(token, '/collaborator/ponto/historico?dataInicio=2026-11-03&dataFim=2026-11-03');
      expect(ok.status).toBe(200);
      expect(ok.body.map((x: any) => x.tipo)).toEqual(['SAIDA', 'RETORNO', 'PAUSA', 'ENTRADA']);
      const vazio = await get(token, '/collaborator/ponto/historico?dataInicio=2026-11-04&dataFim=2026-11-30');
      expect(vazio.body).toEqual([]);
      const ruim = await get(token, '/collaborator/ponto/historico?dataInicio=03-11-2026');
      const inv = await get(token, '/collaborator/ponto/historico?dataInicio=2026-11-10&dataFim=2026-11-01');
      expect([ruim.status, inv.status]).toEqual([400, 400]);
      return { http: '200/200/400/400', efeito: '4 itens no dia, 0 fora do período' };
    });
    await rep.step('J1 diurna', 'espelho: 545 min realizados (intervalo descontado), 540 previstos, saldo +5', async () => {
      mover('2026-11-03T22:00:00Z');
      const r = await get(token, '/collaborator/espelho-ponto?competencia=2026-11');
      expect(r.status).toBe(200);
      const d = r.body.dias.find((x: any) => x.data === '2026-11-03');
      expect(d).toMatchObject({ minutosRealizados: 545, minutosPrevistos: 540, minutosAbonados: 0, pendente: false, saldoOperacionalMinutos: 5 });
      expect(d.batidas).toHaveLength(4);
      expect(r.body.dias.find((x: any) => x.data === '2026-11-07')).toMatchObject({ minutosPrevistos: 0 }); // sábado = folga na escala
      expect(r.body.totais).toMatchObject({ minutosRealizados: 545, minutosPrevistos: 540, saldoOperacionalMinutos: 5, diasPendentes: 0 });
      const ruim = await get(token, '/collaborator/espelho-ponto?competencia=2026-13');
      expect(ruim.status).toBe(400);
      return { http: `${r.status}/${ruim.status}`, efeito: 'cálculo confere com batidas do banco; sábado/domingo previsto 0' };
    });

    await rep.step('J1 diurna', 'banco de horas: ADMIN lança +120 e -30; COLLAB vê saldo; AppLog gravado', async () => {
      const l1 = await post(adminA, '/admin/banco-horas/lancamentos', { usuarioId: u.id, tipo: 'AJUSTE_MANUAL', minutosDelta: 120, dataReferencia: '2026-11-03', motivo: 'Horas extras aprovadas' });
      const l2 = await post(adminA, '/admin/banco-horas/lancamentos', { usuarioId: u.id, tipo: 'PAGAMENTO_HORAS', minutosDelta: -30, dataReferencia: '2026-11-03', motivo: 'Pagamento parcial' });
      const l3 = await post(adminA, '/admin/banco-horas/lancamentos', { usuarioId: u.id, tipo: 'AJUSTE_MANUAL', minutosDelta: 30, dataReferencia: '2026-12-02', motivo: 'Competência seguinte' });
      expect([l1.status, l2.status, l3.status]).toEqual([201, 201, 201]);
      const zero = await post(adminA, '/admin/banco-horas/lancamentos', { usuarioId: u.id, tipo: 'AJUSTE_MANUAL', minutosDelta: 0, dataReferencia: '2026-11-03', motivo: 'zero' });
      expect(zero.status).toBe(400);
      const rows = await prisma.lancamentoBancoHoras.findMany({ where: { usuarioId: u.id }, orderBy: { id: 'asc' } });
      expect(rows.map((x) => x.minutosDelta)).toEqual([120, -30, 30]);
      expect(rows.every((x) => x.restauranteId === A.id)).toBe(true);
      expect(await prisma.appLog.count({ where: { acao: 'LANCAMENTO_BANCO_HORAS_CRIADO', restauranteId: A.id, entidadeId: { in: rows.map((x) => x.id) } } })).toBe(3);
      const nov = await get(token, '/collaborator/banco-horas?competencia=2026-11');
      expect(nov.status).toBe(200);
      expect(nov.body).toMatchObject({ minutosMes: 90, minutosTotalLancado: 120 });
      const dez = await get(token, '/collaborator/banco-horas?competencia=2026-12');
      expect(dez.body).toMatchObject({ minutosMes: 30, minutosTotalLancado: 120 });
      return { http: '201x3/400/200', efeito: 'soma DB = 120; mês nov=90, dez=30; 3 AppLogs' };
    });
    await rep.step('J1 diurna', 'espelho incorpora banco: dia 03/11 saldo = 5 + 90 = 95', async () => {
      const r = await get(token, '/collaborator/espelho-ponto?competencia=2026-11');
      const d = r.body.dias.find((x: any) => x.data === '2026-11-03');
      expect(d).toMatchObject({ minutosBancoHoras: 90, saldoOperacionalMinutos: 95 });
      expect(d.lancamentos).toHaveLength(2);
      expect(r.body.totais).toMatchObject({ minutosBancoHoras: 90, saldoOperacionalMinutos: 95 });
      return { http: r.status, efeito: 'lançamentos aparecem no espelho e compõem o saldo' };
    });
  });

  it('J2 jornada noturna 18h->02h com virada de dia e de mês (31/10 -> 01/11)', async () => {
    const { u, token } = await colaborador('Colab Noturno', A.id);
    await rep.step('J2 noturna', 'escala 18:00-02:00 todos os dias', async () => {
      const r = await post(adminA, '/admin/escalas-trabalho', { usuarioId: u.id, ...escalaSemana('2026-10-01', '18:00', '02:00', []) });
      expect(r.status).toBe(201);
      return { http: r.status, efeito: 'escala noturna persistida' };
    });
    await rep.step('J2 noturna', 'ENTRADA 31/10 18:00 BRT', async () => {
      const r = await batida(token, '2026-10-31T21:00:00Z', { tipo: 'ENTRADA' });
      expect(r.status).toBe(201);
      const [row] = await dbBatidas(u.id);
      expect(dia(row.dataOperacional.toISOString())).toBe('2026-10-31');
      return { http: r.status, efeito: 'dataOperacional 2026-10-31' };
    });
    await rep.step('J2 noturna', 'PAUSA 22:00 BRT já em 01/11 UTC mantém a jornada de 31/10', async () => {
      const r = await batida(token, '2026-11-01T01:00:00Z', { tipo: 'PAUSA' });
      expect(r.status).toBe(201);
      const rows = await dbBatidas(u.id);
      expect(rows.map((x) => dia(x.dataOperacional.toISOString()))).toEqual(['2026-10-31', '2026-10-31']);
      return { http: r.status, efeito: 'dataOperacional continua 2026-10-31' };
    });
    await rep.step('J2 noturna', 'após meia-noite BRT: status mostra jornada aberta; nova ENTRADA => 400', async () => {
      mover('2026-11-01T03:10:00Z'); // 00:10 BRT de 01/11
      const st = await get(token, '/collaborator/ponto/status');
      expect(st.body.tiposDisponiveis).toEqual(['RETORNO']);
      expect(st.body.registrosHoje).toHaveLength(2);
      const dup = await batida(token, '2026-11-01T03:20:00Z', { tipo: 'ENTRADA' });
      expect(dup.status).toBe(400);
      expect(await dbBatidas(u.id)).toHaveLength(2);
      return { http: `${st.status}/${dup.status}`, efeito: 'jornada não é duplicada na virada do dia' };
    });
    await rep.step('J2 noturna', 'RETORNO 22:30 BRT e SAIDA 02:00 BRT de 01/11', async () => {
      const a = await batida(token, '2026-11-01T01:30:00Z', { tipo: 'RETORNO' });
      const b = await batida(token, '2026-11-01T05:00:00Z', { tipo: 'SAIDA' });
      expect([a.status, b.status]).toEqual([201, 201]);
      const rows = await dbBatidas(u.id);
      expect(rows.map((x) => x.tipo)).toEqual(['ENTRADA', 'PAUSA', 'RETORNO', 'SAIDA']);
      expect(rows.every((x) => dia(x.dataOperacional.toISOString()) === '2026-10-31')).toBe(true);
      return { http: '201/201', efeito: '4 registros, todos com dataOperacional 2026-10-31' };
    });
    await rep.step('J2 noturna', 'espelho 2026-10: 450 min (4h + 3h30), previsto 480, saldo -30', async () => {
      mover('2026-11-01T05:30:00Z');
      const out = await get(token, '/collaborator/espelho-ponto?competencia=2026-10');
      const d = out.body.dias.find((x: any) => x.data === '2026-10-31');
      expect(d).toMatchObject({ minutosRealizados: 450, minutosPrevistos: 480, pendente: false, saldoOperacionalMinutos: -30 });
      const nov = await get(token, '/collaborator/espelho-ponto?competencia=2026-11');
      expect(nov.body.dias.find((x: any) => x.data === '2026-11-01')).toMatchObject({ minutosRealizados: 0 });
      expect(out.body.totais.minutosRealizados + nov.body.totais.minutosRealizados).toBe(450); // sem contar em dois meses
      return { http: `${out.status}/${nov.status}`, efeito: 'horas só no mês da dataOperacional (outubro)' };
    });
    await rep.step('J2 noturna', 'nova jornada 01/11 18:00 BRT abre dataOperacional de novembro', async () => {
      const a = await batida(token, '2026-11-01T21:00:00Z', { tipo: 'ENTRADA' });
      const b = await batida(token, '2026-11-02T05:00:00Z', { tipo: 'SAIDA' });
      expect([a.status, b.status]).toEqual([201, 201]);
      const rows = await dbBatidas(u.id);
      expect(rows.slice(4).map((x) => dia(x.dataOperacional.toISOString()))).toEqual(['2026-11-01', '2026-11-01']);
      mover('2026-11-02T06:00:00Z');
      const nov = await get(token, '/collaborator/espelho-ponto?competencia=2026-11');
      expect(nov.body.dias.find((x: any) => x.data === '2026-11-01')).toMatchObject({ minutosRealizados: 480, minutosPrevistos: 480, saldoOperacionalMinutos: 0 });
      return { http: '201/201/200', efeito: '01/11 = 480 min, saldo 0' };
    });
  });

  it('J3 folgas, faltas e atestados no espelho (abono parcial, integral, rejeitado, pendente, cancelado)', async () => {
    const { u } = await colaborador('Colab Atestado', A.id);
    const esc = await post(adminA, '/admin/escalas-trabalho', { usuarioId: u.id, ...escalaSemana('2026-11-01') });
    expect(esc.status).toBe(201);
    const token = await login(app, u.email);
    const atestado = (body: object) => post(adminA, '/admin/atestados', { usuarioId: u.id, ...body });
    let parcial: number, integral: number, rejeitado: number, pendente: number, cancelado: number;

    await rep.step('J3 atestados', 'cria atestados PENDENTES; duplicado => 409', async () => {
      const mk = async (b: object) => { const r = await atestado(b); expect(r.status).toBe(201); expect(r.body.situacao).toBe('PENDENTE'); return r.body.id as number; };
      parcial = await mk({ inicio: '2026-11-05', fim: '2026-11-05', horaInicio: '08:00', horaFim: '12:00', motivo: 'Consulta' });
      integral = await mk({ inicio: '2026-11-09', fim: '2026-11-10', motivo: 'Atestado integral' });
      rejeitado = await mk({ inicio: '2026-11-11', fim: '2026-11-11', motivo: 'Será rejeitado' });
      pendente = await mk({ inicio: '2026-11-12', fim: '2026-11-12', motivo: 'Continua pendente' });
      cancelado = await mk({ inicio: '2026-11-13', fim: '2026-11-13', motivo: 'Será cancelado' });
      const dup = await atestado({ inicio: '2026-11-05', fim: '2026-11-05', horaInicio: '08:00', horaFim: '12:00', motivo: 'Consulta' });
      expect(dup.status).toBe(409);
      expect(await prisma.atestado.count({ where: { usuarioId: u.id } })).toBe(5);
      return { http: '201x5/409', efeito: '5 atestados PENDENTE no banco; duplicata barrada' };
    });
    await rep.step('J3 atestados', 'atestado PENDENTE ainda não abona o espelho', async () => {
      mover('2026-11-16T15:00:00Z');
      const r = await get(token, '/collaborator/espelho-ponto?competencia=2026-11');
      expect(r.body.dias.find((x: any) => x.data === '2026-11-05')).toMatchObject({ minutosAbonados: 0, saldoOperacionalMinutos: -540 });
      return { http: r.status, efeito: 'abono 0 enquanto PENDENTE' };
    });
    await rep.step('J3 atestados', 'ADMIN aprova parcial e integral, rejeita um; segunda decisão => 400', async () => {
      const a = await put(adminA, `/admin/atestados/${parcial}/decidir`, { situacao: 'APROVADO' });
      const b = await put(adminA, `/admin/atestados/${integral}/decidir`, { situacao: 'APROVADO' });
      const c = await put(adminA, `/admin/atestados/${rejeitado}/decidir`, { situacao: 'REJEITADO', observacao: 'Sem documento' });
      const d = await put(adminA, `/admin/atestados/${parcial}/decidir`, { situacao: 'REJEITADO' });
      expect([a.status, b.status, c.status, d.status]).toEqual([200, 200, 200, 400]);
      const rows = await prisma.atestado.findMany({ where: { usuarioId: u.id }, orderBy: { id: 'asc' } });
      expect(rows.map((x) => x.situacao)).toEqual(['APROVADO', 'APROVADO', 'REJEITADO', 'PENDENTE', 'PENDENTE']);
      expect(rows[0].decididoPorId).toBeTruthy();
      expect(await prisma.appLog.count({ where: { restauranteId: A.id, entidade: 'Atestado', acao: { in: ['ATESTADO_APROVADO', 'ATESTADO_REJEITADO'] }, entidadeId: { in: rows.map((x) => x.id) } } })).toBe(3);
      return { http: '200/200/200/400', efeito: 'situação persistida + 3 AppLogs; decisão única' };
    });
    await rep.step('J3 atestados', 'ADMIN aprova e depois cancela atestado: abono só enquanto aprovado', async () => {
      await put(adminA, `/admin/atestados/${cancelado}/decidir`, { situacao: 'APROVADO' }).expect(200);
      const antes = await get(token, '/collaborator/espelho-ponto?competencia=2026-11');
      expect(antes.body.dias.find((x: any) => x.data === '2026-11-13')).toMatchObject({ minutosAbonados: 540, saldoOperacionalMinutos: 0 });
      const c = await put(adminA, `/admin/atestados/${cancelado}/cancelar`);
      expect(c.status).toBe(200);
      expect((await prisma.atestado.findUnique({ where: { id: cancelado } }))?.situacao).toBe('CANCELADO');
      const depois = await get(token, '/collaborator/espelho-ponto?competencia=2026-11');
      expect(depois.body.dias.find((x: any) => x.data === '2026-11-13')).toMatchObject({ minutosAbonados: 0, saldoOperacionalMinutos: -540 });
      return { http: '200', efeito: 'abono 540 -> 0 após cancelamento' };
    });
    await rep.step('J3 atestados', 'ADMIN classifica FOLGA (04/11) e FALTA (06/11); FALTA notifica o colaborador uma vez', async () => {
      const f = await post(adminA, '/admin/ausencias/classificar', { usuarioId: u.id, data: '2026-11-04', tipo: 'FOLGA', motivo: 'Folga autorizada' });
      const t = await post(adminA, '/admin/ausencias/classificar', { usuarioId: u.id, data: '2026-11-06', tipo: 'FALTA' });
      const t2 = await post(adminA, '/admin/ausencias/classificar', { usuarioId: u.id, data: '2026-11-06', tipo: 'FALTA', motivo: 'reclassificação idêntica' });
      expect([f.status, t.status, t2.status]).toEqual([201, 201, 201]);
      expect(await prisma.classificacaoAusencia.count({ where: { usuarioId: u.id } })).toBe(2);
      expect(await prisma.notificacao.count({ where: { usuarioId: u.id, tipo: 'CLASSIFICACAO_FALTA' } })).toBe(1);
      return { http: '201x3', efeito: '2 classificações (upsert), 1 notificação de falta' };
    });
    await rep.step('J3 atestados', 'espelho: cada dia reflete folga/falta/abono; totais conferem', async () => {
      const r = await get(token, '/collaborator/espelho-ponto?competencia=2026-11');
      const d = (data: string) => r.body.dias.find((x: any) => x.data === data);
      expect(d('2026-11-04')).toMatchObject({ classificacao: expect.objectContaining({ tipo: 'FOLGA' }), minutosPrevistos: 540, saldoOperacionalMinutos: -540 });
      expect(d('2026-11-05')).toMatchObject({ minutosAbonados: 240, saldoOperacionalMinutos: -300 });
      expect(d('2026-11-06')).toMatchObject({ classificacao: expect.objectContaining({ tipo: 'FALTA' }), saldoOperacionalMinutos: -540 });
      expect(d('2026-11-08')).toMatchObject({ minutosPrevistos: 0 }); // domingo: folga da escala
      expect(d('2026-11-09')).toMatchObject({ minutosAbonados: 540, saldoOperacionalMinutos: 0 });
      expect(d('2026-11-10')).toMatchObject({ minutosAbonados: 540, saldoOperacionalMinutos: 0 });
      expect(d('2026-11-11')).toMatchObject({ minutosAbonados: 0, saldoOperacionalMinutos: -540 }); // rejeitado
      expect(d('2026-11-12')).toMatchObject({ minutosAbonados: 0, saldoOperacionalMinutos: -540 }); // pendente
      expect(r.body.totais).toMatchObject({ minutosAbonados: 1320, minutosPrevistos: 2700, saldoOperacionalMinutos: -1380, diasPendentes: 0 });
      return { http: r.status, efeito: 'abonado 1320, previsto 2700, saldo -1380 (calculado a mão)' };
    });
  });

  it('J4 concorrência: batidas e atestados simultâneos não duplicam', async () => {
    const { u, token } = await colaborador('Colab Concorrente', A.id);
    const { u: u2, token: token2 } = await colaborador('Colab Concorrente 2', A.id);
    mover('2026-11-02T11:00:00Z');
    await rep.step('J4 concorrência', '8 ENTRADAs simultâneas do mesmo colaborador => 1x201 e 7x400', async () => {
      const rs = await Promise.all(Array.from({ length: 8 }, () => post(token, '/collaborator/ponto/registrar', { tipo: 'ENTRADA' })));
      const codes = rs.map((r) => r.status).sort();
      expect(codes.filter((c) => c === 201)).toHaveLength(1);
      expect(codes.filter((c) => c === 400)).toHaveLength(7);
      expect(await dbBatidas(u.id)).toHaveLength(1);
      return { http: '1x201 + 7x400', efeito: 'lock advisory: exatamente 1 registro no banco' };
    });
    await rep.step('J4 concorrência', 'dois colaboradores batendo ao mesmo tempo não se bloqueiam', async () => {
      const [a, b] = await Promise.all([post(token2, '/collaborator/ponto/registrar', { tipo: 'ENTRADA' }), get(token2, '/collaborator/ponto/status')]);
      expect(a.status).toBe(201);
      expect(b.status).toBe(200);
      expect(await dbBatidas(u2.id)).toHaveLength(1);
      return { http: '201/200', efeito: '1 registro para o 2º colaborador' };
    });
    await rep.step('J4 concorrência', '6 criações idênticas de atestado => 1x201 e 5x409', async () => {
      const body = { usuarioId: u.id, inicio: '2026-11-20', fim: '2026-11-20', motivo: 'Corrida de criação' };
      const rs = await Promise.all(Array.from({ length: 6 }, () => post(adminA, '/admin/atestados', body)));
      const codes = rs.map((r) => r.status);
      expect(codes.filter((c) => c === 201)).toHaveLength(1);
      expect(codes.filter((c) => c === 409)).toHaveLength(5);
      expect(await prisma.atestado.count({ where: { usuarioId: u.id } })).toBe(1);
      return { http: '1x201 + 5x409', efeito: 'unique da solicitação evita duplicidade' };
    });
  });

  it('J5 isolamento multi-tenant e RBAC do ponto', async () => {
    const a = await colaborador('Colab Iso A', A.id);
    const b = await colaborador('Colab Iso B', B.id);
    await post(adminB, '/admin/escalas-trabalho', { usuarioId: b.u.id, ...escalaSemana('2026-11-01') }).expect(201);
    mover('2026-11-03T11:00:00Z');
    await rep.step('J5 isolamento', 'cada colaborador registra no próprio restaurante', async () => {
      const ra = await post(a.token, '/collaborator/ponto/registrar', { tipo: 'ENTRADA' });
      const rb = await post(b.token, '/collaborator/ponto/registrar', { tipo: 'ENTRADA' });
      expect([ra.status, rb.status]).toEqual([201, 201]);
      expect((await dbBatidas(a.u.id))[0].restauranteId).toBe(A.id);
      expect((await dbBatidas(b.u.id))[0].restauranteId).toBe(B.id);
      const ha = await get(a.token, '/collaborator/ponto/historico');
      expect(ha.body.map((x: any) => x.usuarioId)).toEqual([a.u.id]);
      return { http: '201/201', efeito: 'registros com restauranteId distintos; histórico só do próprio' };
    });
    await rep.step('J5 isolamento', 'ADMIN A não cria escala/atestado/banco/ausência para usuário do restaurante B => 404', async () => {
      const e = await post(adminA, '/admin/escalas-trabalho', { usuarioId: b.u.id, ...escalaSemana('2026-12-01') });
      const t = await post(adminA, '/admin/atestados', { usuarioId: b.u.id, inicio: '2026-11-03', fim: '2026-11-03', motivo: 'cross-tenant' });
      const l = await post(adminA, '/admin/banco-horas/lancamentos', { usuarioId: b.u.id, tipo: 'AJUSTE_MANUAL', minutosDelta: 60, dataReferencia: '2026-11-03', motivo: 'cross-tenant' });
      const x = await post(adminA, '/admin/ausencias/classificar', { usuarioId: b.u.id, data: '2026-11-03', tipo: 'FALTA' });
      expect([e.status, t.status, l.status, x.status]).toEqual([404, 404, 404, 404]);
      expect(await prisma.escalaTrabalho.count({ where: { usuarioId: b.u.id, restauranteId: A.id } })).toBe(0);
      expect(await prisma.atestado.count({ where: { usuarioId: b.u.id } })).toBe(0);
      expect(await prisma.lancamentoBancoHoras.count({ where: { usuarioId: b.u.id } })).toBe(0);
      expect(await prisma.classificacaoAusencia.count({ where: { usuarioId: b.u.id } })).toBe(0);
      return { http: '404x4', efeito: 'nenhuma linha criada em nome do restaurante A' };
    });
    await rep.step('J5 isolamento', 'ADMIN A não lista dados de B nem escolhendo restauranteId na query', async () => {
      const l = await get(adminA, `/admin/banco-horas/lancamentos?usuarioId=${b.u.id}`);
      const e = await get(adminA, `/admin/escalas-trabalho?restauranteId=${B.id}`);
      expect(l.status).toBe(200);
      expect(l.body).toEqual([]);
      expect(e.status).toBe(200);
      expect(e.body.every((x: any) => x.restauranteId === A.id)).toBe(true);
      expect(e.body.some((x: any) => x.usuarioId === b.u.id)).toBe(false);
      return { http: '200/200', efeito: 'listas filtradas pelo restaurante do token' };
    });
    await rep.step('J5 isolamento', 'espelho do colaborador A não contém batidas de B', async () => {
      const r = await get(a.token, '/collaborator/espelho-ponto?competencia=2026-11');
      const total = r.body.dias.reduce((n: number, d: any) => n + d.batidas.length, 0);
      expect(total).toBe(1);
      expect(r.body.dias.flatMap((d: any) => d.batidas).every((x: any) => x.usuarioId === a.u.id && x.restauranteId === A.id)).toBe(true);
      return { http: r.status, efeito: '1 batida, só do próprio usuário' };
    });
    await rep.step('J5 rbac', 'COLLABORATOR em rotas administrativas => 403 e nada persistido', async () => {
      const antes = await prisma.lancamentoBancoHoras.count({ where: { restauranteId: A.id } });
      const rs = await Promise.all([
        post(a.token, '/admin/banco-horas/lancamentos', { usuarioId: a.u.id, tipo: 'AJUSTE_MANUAL', minutosDelta: 600, dataReferencia: '2026-11-03', motivo: 'auto-concessão' }),
        post(a.token, '/admin/escalas-trabalho', { usuarioId: a.u.id, ...escalaSemana('2026-11-01') }),
        post(a.token, '/admin/atestados', { usuarioId: a.u.id, inicio: '2026-11-03', fim: '2026-11-03', motivo: 'x' }),
        put(a.token, '/admin/atestados/1/decidir', { situacao: 'APROVADO' }),
        get(a.token, '/admin/ausencias'),
        get(a.token, '/admin/logs'),
      ]);
      expect(rs.map((r) => r.status)).toEqual([403, 403, 403, 403, 403, 403]);
      expect(await prisma.lancamentoBancoHoras.count({ where: { restauranteId: A.id } })).toBe(antes);
      return { http: '403x6', efeito: 'contagem de lançamentos inalterada' };
    });
    await rep.step('J5 rbac', 'SUPER_ADMIN não usa rotas de colaborador; ADMIN não lê logs globais', async () => {
      const s = await get(superT, `/collaborator/ponto/status?restauranteId=${A.id}`);
      const l = await get(adminA, '/admin/logs');
      expect([s.status, l.status]).toEqual([403, 403]);
      return { http: '403/403', efeito: 'papéis respeitados' };
    });
  });

  it('J6 governança: módulo desativado bloqueia API, preserva dados, AppLog auditável, SUPER_ADMIN respeita tenant', async () => {
    const t = await mkTenant(prisma, 'E2E Governanca');
    const admin = await mkUser(prisma, 'Admin Gov', UserRole.ADMIN, t.id);
    const adminT = await login(app, admin.email);
    const c = await colaborador('Colab Gov', t.id);
    await post(adminT, '/admin/escalas-trabalho', { usuarioId: c.u.id, ...escalaSemana('2026-11-01') }).expect(201);
    await batida(c.token, '2026-11-03T11:00:00Z', { tipo: 'ENTRADA' }).expect(201);
    const cc = await colaborador('Colab Sem Modulo', C.id);

    await rep.step('J6 governança', 'tenant com moduloPonto=false => 403 e nada gravado', async () => {
      const r = await post(cc.token, '/collaborator/ponto/registrar', { tipo: 'ENTRADA' });
      const s = await get(cc.token, '/collaborator/espelho-ponto?competencia=2026-11');
      expect([r.status, s.status]).toEqual([403, 403]);
      expect(await dbBatidas(cc.u.id)).toHaveLength(0);
      return { http: '403/403', efeito: '0 registros no banco' };
    });
    await rep.step('J6 governança', 'SUPER_ADMIN respeita o tenant selecionado: A (ligado)=200, C (desligado)=403, sem tenant=403', async () => {
      const ok = await get(superT, `/admin/escalas-trabalho?restauranteId=${A.id}`);
      const off = await get(superT, `/admin/escalas-trabalho?restauranteId=${C.id}`);
      const nenhum = await get(superT, '/admin/escalas-trabalho');
      expect([ok.status, off.status, nenhum.status]).toEqual([200, 403, 403]);
      expect(ok.body.every((x: any) => x.restauranteId === A.id)).toBe(true);
      return { http: '200/403/403', efeito: 'flag do tenant escolhido na query; sem fallback global' };
    });
    await rep.step('J6 governança', 'SUPER_ADMIN desliga moduloPonto: bloqueia API, dados preservados, AppLog antes/depois', async () => {
      const antes = await dbBatidas(c.u.id);
      const off = await putSuper(superT, t.id, { moduloPonto: false });
      expect(off.status).toBe(200);
      const r1 = await post(c.token, '/collaborator/ponto/registrar', { tipo: 'PAUSA' });
      const r2 = await get(c.token, '/collaborator/espelho-ponto?competencia=2026-11');
      const r3 = await get(adminT, '/admin/escalas-trabalho');
      expect([r1.status, r2.status, r3.status]).toEqual([403, 403, 403]);
      expect(await dbBatidas(c.u.id)).toEqual(antes); // nada apagado nem criado
      expect(await prisma.escalaTrabalho.count({ where: { restauranteId: t.id } })).toBe(1);
      const logs = await prisma.appLog.findMany({ where: { restauranteId: t.id, acao: 'ATUALIZAR_MODULOS_RESTAURANTE' } });
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({ entidade: 'Restaurante', entidadeId: t.id });
      expect(logs[0].detalhes).toEqual({ alteracoes: { moduloPonto: { antes: true, depois: false } } });
      expect(logs[0].usuarioId).toBeTruthy();
      return { http: '200/403x3', efeito: 'dados intactos; 1 AppLog {moduloPonto: true->false}' };
    });
    await rep.step('J6 governança', 'PUT idempotente não gera AppLog; religar restaura acesso aos mesmos dados', async () => {
      const igual = await putSuper(superT, t.id, { moduloPonto: false });
      expect(igual.status).toBe(200);
      expect(await prisma.appLog.count({ where: { restauranteId: t.id, acao: 'ATUALIZAR_MODULOS_RESTAURANTE' } })).toBe(1);
      const on = await putSuper(superT, t.id, { moduloPonto: true });
      expect(on.status).toBe(200);
      mover('2026-11-03T12:00:00Z');
      const r = await get(c.token, '/collaborator/ponto/status');
      expect(r.status).toBe(200);
      expect(r.body.registrosHoje).toHaveLength(1);
      expect(await prisma.appLog.count({ where: { restauranteId: t.id, acao: 'ATUALIZAR_MODULOS_RESTAURANTE' } })).toBe(2);
      return { http: '200/200/200', efeito: 'no-op sem log; reativação gera 2º log e devolve a mesma batida' };
    });
    await rep.step('J6 governança', 'somente SUPER_ADMIN altera módulos e lê AppLog; ADMIN/COLLAB => 403 sem efeito', async () => {
      const a1 = await putSuper(adminT, t.id, { moduloPonto: false });
      const a2 = await putSuper(c.token, t.id, { moduloPonto: false });
      expect([a1.status, a2.status]).toEqual([403, 403]);
      expect((await prisma.restaurante.findUnique({ where: { id: t.id } }))?.moduloPonto).toBe(true);
      const l = await get(superT, `/admin/logs?restauranteId=${t.id}&acao=ATUALIZAR_MODULOS_RESTAURANTE`);
      expect(l.status).toBe(200);
      expect(JSON.stringify(l.body)).toContain('ATUALIZAR_MODULOS_RESTAURANTE');
      return { http: '403/403/200', efeito: 'flag inalterada; log consultável via API' };
    });
    await rep.step('J6 governança', 'moduloFuncionarios=false bloqueia atestados e ausências; ponto segue ativo', async () => {
      await putSuper(superT, t.id, { moduloFuncionarios: false }).expect(200);
      const at = await post(adminT, '/admin/atestados', { usuarioId: c.u.id, inicio: '2026-11-03', fim: '2026-11-03', motivo: 'bloqueado' });
      const au = await get(adminT, '/admin/ausencias');
      const ponto = await get(c.token, '/collaborator/ponto/status');
      expect([at.status, au.status, ponto.status]).toEqual([403, 403, 200]);
      expect(await prisma.atestado.count({ where: { restauranteId: t.id } })).toBe(0);
      return { http: '403/403/200', efeito: 'flags independentes; 0 atestados criados' };
    });
  });
});
