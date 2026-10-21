import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EspelhoService {
  constructor(private readonly prisma: PrismaService) {}

  async consultar(restauranteId: number, usuarioId: number, competencia: string) {
    const { inicio, fim } = competenciaMes(competencia);
    const [registros, escalas, atestados] = await Promise.all([
      this.prisma.registroPonto.findMany({ where: { restauranteId, usuarioId, dataOperacional: { gte: inicio, lte: fim } }, orderBy: [{ dataOperacional: 'asc' }, { registradoEm: 'asc' }, { id: 'asc' }] }),
      this.prisma.escalaTrabalho.findMany({ where: { restauranteId, usuarioId, vigenciaInicio: { lte: fim }, OR: [{ vigenciaFim: null }, { vigenciaFim: { gte: inicio } }] }, include: { dias: true }, orderBy: { vigenciaInicio: 'desc' } }),
      this.prisma.atestado.findMany({ where: { restauranteId, usuarioId, situacao: 'APROVADO', inicio: { lte: fim }, fim: { gte: inicio } }, select: { inicio: true, fim: true, horaInicio: true, horaFim: true } }),
    ]);
    const porDia = new Map<string, typeof registros>();
    for (const registro of registros) { const data = dataCivil(registro.dataOperacional); porDia.set(data, [...(porDia.get(data) ?? []), registro]); }
    const dias = diasDoMes(inicio, fim).map((data) => {
      const batidas = porDia.get(data) ?? [];
      const escala = escalaDaData(escalas, data);
      const diaEscala = escala?.dias.find((dia) => dia.diaSemana === weekday(data));
      const minutosPrevistos = diaEscala?.trabalha ? minutos(diaEscala.entradaPrevista!, diaEscala.saidaPrevista!) : 0;
      const apuracao = apurar(batidas);
      const pendente = batidas.length > 0 && apuracao.pendente;
      const minutosAbonados = minutosPrevistos ? Math.min(minutosPrevistos, cobertura(atestados, data, diaEscala!.entradaPrevista!, diaEscala!.saidaPrevista!)) : 0;
      const saldoBruto = apuracao.minutos + minutosAbonados - minutosPrevistos;
      const saldoOperacionalMinutos = pendente ? null : Math.abs(saldoBruto) <= (diaEscala?.toleranciaMinutos ?? 0) ? 0 : saldoBruto;
      return { data, batidas, minutosPrevistos, minutosAbonados, minutosRealizados: apuracao.minutos, pendente, saldoOperacionalMinutos };
    });
    const concluidos = dias.filter((dia) => !dia.pendente && (dia.batidas.length > 0 || dia.minutosAbonados > 0));
    return { competencia, dias, totais: { minutosRealizados: concluidos.reduce((t, d) => t + d.minutosRealizados, 0), minutosAbonados: concluidos.reduce((t, d) => t + d.minutosAbonados, 0), minutosPrevistos: concluidos.reduce((t, d) => t + d.minutosPrevistos, 0), saldoOperacionalMinutos: concluidos.reduce((t, d) => t + (d.saldoOperacionalMinutos ?? 0), 0), diasPendentes: dias.filter((d) => d.pendente).length } };
  }
}
function competenciaMes(value: string) { if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw new BadRequestException('Competência inválida'); const inicio = new Date(`${value}-01T00:00:00.000Z`); return { inicio, fim: new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + 1, 0)) }; }
function dataCivil(data: Date) { return data.toISOString().slice(0, 10); }
function diasDoMes(inicio: Date, fim: Date) { const dias: string[] = []; for (let d = new Date(inicio); d <= fim; d = new Date(d.valueOf() + 86_400_000)) dias.push(dataCivil(d)); return dias; }
function weekday(data: string) { return new Date(`${data}T00:00:00.000Z`).getUTCDay(); }
type EscalaComDias = { vigenciaInicio: Date; vigenciaFim: Date | null; dias: Array<{ diaSemana: number; trabalha: boolean; entradaPrevista: string | null; saidaPrevista: string | null; toleranciaMinutos: number }> };
function escalaDaData(escalas: EscalaComDias[], data: string) { const dia = new Date(`${data}T00:00:00.000Z`); return escalas.find((e) => e.vigenciaInicio <= dia && (!e.vigenciaFim || e.vigenciaFim >= dia)); }
function minutos(inicio: string, fim: string) { const [hi, mi] = inicio.split(':').map(Number); const [hf, mf] = fim.split(':').map(Number); const diferenca = hf * 60 + mf - hi * 60 - mi; return diferenca < 0 ? diferenca + 1_440 : diferenca; }
function cobertura(atestados: Array<{ inicio: Date; fim: Date; horaInicio: string | null; horaFim: string | null }>, data: string, inicio: string, fim: string) {
  const inicioTurno = minutos('00:00', inicio), fimTurno = inicioTurno + minutos(inicio, fim);
  const intervalos = atestados
    .filter((a) => dataCivil(a.inicio) <= data && dataCivil(a.fim) >= data)
    .map((a) => {
      const horaInicial = minutos('00:00', a.horaInicio ?? inicio);
      let horaFinal = a.horaFim ? minutos('00:00', a.horaFim) : fimTurno;
      if (a.horaFim && horaFinal < horaInicial) horaFinal += 1_440;
      return { inicio: Math.max(inicioTurno, horaInicial), fim: Math.min(fimTurno, horaFinal) };
    })
    .filter((a) => a.inicio < a.fim)
    .sort((a, b) => a.inicio - b.inicio);
  let total = 0, fimAnterior = inicioTurno;
  for (const intervalo of intervalos) { const inicioEfetivo = Math.max(intervalo.inicio, fimAnterior); if (inicioEfetivo < intervalo.fim) total += intervalo.fim - inicioEfetivo; fimAnterior = Math.max(fimAnterior, intervalo.fim); }
  return total;
}
function apurar(registros: Array<{ tipo: string; registradoEm: Date }>) { let aberto: Date | undefined; let total = 0; for (const r of registros) { if (r.tipo === 'ENTRADA' || r.tipo === 'RETORNO') aberto = r.registradoEm; if ((r.tipo === 'PAUSA' || r.tipo === 'SAIDA') && aberto) { total += Math.max(0, Math.round((r.registradoEm.valueOf() - aberto.valueOf()) / 60_000)); aberto = undefined; } } return { minutos: total, pendente: !!aberto || !registros.some((r) => r.tipo === 'SAIDA') }; }
