import { PrismaService } from '../../prisma/prisma.service';
import { StatusLoteConsolidado } from '@prisma/client';

const LOTE_JANELA_HORAS = 24;

type ContextoLote =
  | {
      tipo: 'GRUPO';
      grupoId: number;
      participantesIds: number[];
    }
  | {
      tipo: 'LISTA_PAI';
      listaPaiId: number;
      participantesIds: number[];
    };

async function resolverContextoLoteConsolidado(
  prisma: PrismaService,
  listaId: number,
  restauranteId: number,
): Promise<ContextoLote | null> {
  const lista = await prisma.lista.findFirst({
    where: { id: listaId, restauranteId, deletado: false },
    select: { id: true, grupoId: true, listaPaiId: true },
  });

  if (!lista) {
    return null;
  }

  if (lista.grupoId) {
    const participantes = await prisma.lista.findMany({
      where: {
        restauranteId,
        deletado: false,
        grupoId: lista.grupoId,
      },
      select: { id: true },
      orderBy: { id: 'asc' },
    });

    return {
      tipo: 'GRUPO',
      grupoId: lista.grupoId,
      participantesIds: participantes.map((p) => p.id),
    };
  }

  if (lista.listaPaiId) {
    const participantes = await prisma.lista.findMany({
      where: {
        restauranteId,
        deletado: false,
        listaPaiId: lista.listaPaiId,
      },
      select: { id: true },
      orderBy: { id: 'asc' },
    });

    return {
      tipo: 'LISTA_PAI',
      listaPaiId: lista.listaPaiId,
      participantesIds: participantes.map((p) => p.id),
    };
  }

  return null;
}

async function recalcularStatusLoteAberto(
  prisma: PrismaService,
  loteId: number,
) {
  const lote = await prisma.submissaoConsolidadaLote.findUnique({
    where: { id: loteId },
    select: {
      id: true,
      status: true,
      participantes: {
        select: { recebida: true },
      },
    },
  });

  if (!lote) {
    return;
  }

  // Lotes já aprovados não devem ter status rebaixado automaticamente.
  if (
    lote.status === StatusLoteConsolidado.APROVADO_COMPLETO ||
    lote.status === StatusLoteConsolidado.APROVADO_PARCIAL
  ) {
    return;
  }

  const faltantes = lote.participantes.some((p) => !p.recebida);
  const proximoStatus = faltantes
    ? StatusLoteConsolidado.AGUARDANDO_SUBLISTAS
    : StatusLoteConsolidado.PRONTO_PARA_APROVAR;

  if (lote.status !== proximoStatus) {
    await prisma.submissaoConsolidadaLote.update({
      where: { id: loteId },
      data: { status: proximoStatus },
    });
  }
}

export async function registrarSubmissaoEmLoteConsolidado(
  prisma: PrismaService,
  params: {
    submissaoId: number;
    listaId: number;
    restauranteId: number;
  },
) {
  const { submissaoId, listaId, restauranteId } = params;
  const contexto = await resolverContextoLoteConsolidado(
    prisma,
    listaId,
    restauranteId,
  );

  if (!contexto || contexto.participantesIds.length === 0) {
    return null;
  }

  const agora = new Date();
  const janelaFim = new Date(
    agora.getTime() + LOTE_JANELA_HORAS * 60 * 60 * 1000,
  );

  const whereContexto =
    contexto.tipo === 'GRUPO'
      ? { grupoId: contexto.grupoId, listaPaiId: null }
      : { grupoId: null, listaPaiId: contexto.listaPaiId };

  const loteAberto = await prisma.submissaoConsolidadaLote.findFirst({
    where: {
      restauranteId,
      ...whereContexto,
      status: {
        in: [
          StatusLoteConsolidado.AGUARDANDO_SUBLISTAS,
          StatusLoteConsolidado.PRONTO_PARA_APROVAR,
        ],
      },
      janelaFim: { gte: agora },
    },
    include: {
      participantes: {
        select: { listaId: true },
      },
    },
    orderBy: { criadoEm: 'desc' },
  });

  const criarNovoLote = async () => {
    const lote = await prisma.submissaoConsolidadaLote.create({
      data: {
        restauranteId,
        ...(contexto.tipo === 'GRUPO'
          ? { grupoId: contexto.grupoId }
          : { listaPaiId: contexto.listaPaiId }),
        janelaInicio: agora,
        janelaFim,
        status: StatusLoteConsolidado.AGUARDANDO_SUBLISTAS,
        participantes: {
          createMany: {
            data: contexto.participantesIds.map((participanteListaId) => ({
              listaId: participanteListaId,
              recebida: participanteListaId === listaId,
              submissaoAtualId:
                participanteListaId === listaId ? submissaoId : null,
            })),
          },
        },
      },
      select: { id: true },
    });

    await recalcularStatusLoteAberto(prisma, lote.id);
    return lote.id;
  };

  if (!loteAberto) {
    return criarNovoLote();
  }

  const listaEstaNoSnapshot = loteAberto.participantes.some(
    (p) => p.listaId === listaId,
  );

  if (!listaEstaNoSnapshot) {
    return criarNovoLote();
  }

  await prisma.submissaoConsolidadaParticipante.update({
    where: {
      loteId_listaId: { loteId: loteAberto.id, listaId },
    },
    data: {
      recebida: true,
      submissaoAtualId: submissaoId,
    },
  });

  await recalcularStatusLoteAberto(prisma, loteAberto.id);
  return loteAberto.id;
}

export async function recalcularLotesPorSubmissao(
  prisma: PrismaService,
  submissaoId: number,
) {
  const participacao = await prisma.submissaoConsolidadaParticipante.findFirst({
    where: { submissaoAtualId: submissaoId },
    select: { loteId: true },
  });

  if (!participacao) {
    return;
  }

  await recalcularStatusLoteAberto(prisma, participacao.loteId);
}
