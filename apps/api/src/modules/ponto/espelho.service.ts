import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EspelhoService {
  constructor(private readonly prisma: PrismaService) {}

  async consultar(restauranteId: number, usuarioId: number, competencia: string) {
    const { inicio, fim } = competenciaMes(competencia);
    const [registros, escalas] = await Promise.all([
      this.prisma.registroPonto.findMany({ where: { restauranteId, usuarioId, dataOperacional: { gte: inicio, lte: fim } }, orderBy: [{ dataOperacional: 'asc' }, { registradoEm: 'asc' }, { id: 'asc' }] }),
      this.prisma.escalaTrabalho.findMany({ where: { restauranteId, usuarioId, vigenciaInicio: { lte: fim }, OR: [{ vigenciaFim: null }, { vigenciaFim: { gte: inicio } }] }, include: { dias: true }, orderBy: { vigenciaInicio: 'desc' } }),
    ]);
    const porDia = new Map<string, typeof registros>();
    for (const registro of registros) {
      const data = dataCivil(registro.dataOperacional);
      porDia.set(data, [...(porDia.get(data) ?? []), registro]);
    }
    const dias = diasDoMes(inicio, fim).map((data) => {
      const batidas = porDia.get(data) ?? [];
      const escala = escalaDaData(escalas, data);
      const diaEscala = escala?.dias.find((dia) => dia.diaSemana === weekday(data));
      const minutosPrevistos = diaEscala?.trabalha ? minutos(diaEscala.entradaPrevista!, diaEscala.saidaPrevista!) : 0;
      const apuracao = apurar(batidas);
      const pendente = batidas.length > 0 && apuracao.pendente;
      const saldoBruto = apuracao.minutos - minutosPrevistos;
      const saldoOperacionalMinutos = pendente ? null : Math.abs(saldoBruto) <= (diaEscala?.toleranciaMinutos ?? 0) ? 0 : saldoBruto;
      return { data, batidas, minutosPrevistos, minutosRealizados: apuracao.minutos, pendente, saldoOperacionalMinutos };
    });
    // ponytail: faltas/folgas ainda não compõem saldo; integrar classificação na issue #5.
    const concluidos = dias.filter((dia) => !dia.pendente && dia.batidas.length > 0);
    return {
      competencia,
      dias,
      totais: {
        minutosRealizados: concluidos.reduce((total, dia) => total + dia.minutosRealizados, 0),
        minutosPrevistos: concluidos.reduce((total, dia) => total + dia.minutosPrevistos, 0),
        saldoOperacionalMinutos: concluidos.reduce((total, dia) => total + (dia.saldoOperacionalMinutos ?? 0), 0),
        diasPendentes: dias.filter((dia) => dia.pendente).length,
      },
    };
  }
}

function competenciaMes(value: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw new BadRequestException('Competência inválida');
  const inicio = new Date(`${value}-01T00:00:00.000Z`);
  const fim = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + 1, 0));
  return { inicio, fim };
}
function dataCivil(data: Date) { return data.toISOString().slice(0, 10); }
function diasDoMes(inicio: Date, fim: Date) {
  const dias: string[] = [];
  for (let data = new Date(inicio); data <= fim; data = new Date(data.valueOf() + 86_400_000)) dias.push(dataCivil(data));
  return dias;
}
function weekday(data: string) { return new Date(`${data}T00:00:00.000Z`).getUTCDay(); }
type EscalaComDias = { vigenciaInicio: Date; vigenciaFim: Date | null; dias: Array<{ diaSemana: number; trabalha: boolean; entradaPrevista: string | null; saidaPrevista: string | null; toleranciaMinutos: number }> };
function escalaDaData(escalas: EscalaComDias[], data: string) {
  const dia = new Date(`${data}T00:00:00.000Z`);
  return escalas.find((escala) => escala.vigenciaInicio <= dia && (!escala.vigenciaFim || escala.vigenciaFim >= dia));
}
function minutos(inicio: string, fim: string) { const [hi, mi] = inicio.split(':').map(Number); const [hf, mf] = fim.split(':').map(Number); return hf * 60 + mf - hi * 60 - mi; }
function apurar(registros: Array<{ tipo: string; registradoEm: Date }>) {
  let aberto: Date | undefined;
  let total = 0;
  for (const registro of registros) {
    if (registro.tipo === 'ENTRADA' || registro.tipo === 'RETORNO') aberto = registro.registradoEm;
    if ((registro.tipo === 'PAUSA' || registro.tipo === 'SAIDA') && aberto) { total += Math.max(0, Math.round((registro.registradoEm.valueOf() - aberto.valueOf()) / 60_000)); aberto = undefined; }
  }
  return { minutos: total, pendente: !!aberto || !registros.some((registro) => registro.tipo === 'SAIDA') };
}
