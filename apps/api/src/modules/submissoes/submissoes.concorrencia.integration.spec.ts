import { BadRequestException } from '@nestjs/common';
import { PrismaClient, StatusPedido, StatusSubmissao, UserRole } from '@prisma/client';
import { SubmissoesService } from './submissoes.service';

const url = process.env.TEST_DATABASE_URL;
const d = url && /kzn_45_test/.test(url) ? describe : describe.skip;

jest.setTimeout(120000);

d('SubmissoesService.editarSubmissao (PostgreSQL real)', () => {
  let prisma: PrismaClient;
  const tag = `sub45_${Date.now()}`;

  const service = () => new SubmissoesService(
    prisma as any,
    { criar: jest.fn() } as any,
  );

  async function criarCenario(restauranteId?: number) {
    const restaurante = restauranteId
      ? { id: restauranteId }
      : await prisma.restaurante.create({ data: { nome: `${tag}_restaurante` } });
    const usuario = await prisma.usuario.create({
      data: {
        nome: `${tag}_usuario`, email: `${tag}_${Math.random()}@test.local`, senha: 'x',
        role: UserRole.ADMIN, aprovado: true, restauranteId: restaurante.id,
      },
    });
    const lista = await prisma.lista.create({
      data: { nome: `${tag}_lista_${Math.random()}`, restauranteId: restaurante.id },
    });
    const item = await prisma.item.create({
      data: { nome: `${tag}_item_${Math.random()}`, unidadeMedida: 'un', restauranteId: restaurante.id },
    });
    await prisma.listaItemRef.create({
      data: { listaId: lista.id, itemId: item.id, quantidadeMinima: 10, quantidadeAtual: 5 },
    });
    const submissao = await prisma.submissao.create({
      data: {
        listaId: lista.id, usuarioId: usuario.id, restauranteId: restaurante.id,
        pedidos: { create: { itemId: item.id, qtdSolicitada: 5 } },
      },
    });
    return { restauranteId: restaurante.id, itemId: item.id, submissaoId: submissao.id };
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('duas edições concorrentes mantêm um conjunto consistente de pedidos', async () => {
    const c = await criarCenario();
    const resultados = await Promise.allSettled([
      service().editarSubmissao(c.submissaoId, c.restauranteId, { itens: [{ itemId: c.itemId, quantidadeAtual: 1 }] }),
      service().editarSubmissao(c.submissaoId, c.restauranteId, { itens: [{ itemId: c.itemId, quantidadeAtual: 3 }] }),
    ]);

    expect(resultados.every((r) => r.status === 'fulfilled')).toBe(true);
    const pedidos = await prisma.pedido.findMany({ where: { submissaoId: c.submissaoId } });
    expect(pedidos).toHaveLength(1);
    expect(pedidos[0]).toMatchObject({ itemId: c.itemId, status: StatusPedido.PENDENTE });
    expect([7, 9]).toContain(pedidos[0].qtdSolicitada);
  });

  it('edição concorrente com aprovação não perde pedido decidido', async () => {
    const c = await criarCenario();
    const resultados = await Promise.allSettled([
      service().editarSubmissao(c.submissaoId, c.restauranteId, { itens: [{ itemId: c.itemId, quantidadeAtual: 2 }] }),
      service().aprovarSubmissao(c.submissaoId, c.restauranteId),
    ]);

    for (const resultado of resultados) {
      if (resultado.status === 'rejected') {
        expect(resultado.reason).toBeInstanceOf(BadRequestException);
      }
    }
    const submissao = await prisma.submissao.findUniqueOrThrow({ where: { id: c.submissaoId } });
    const pedidos = await prisma.pedido.findMany({ where: { submissaoId: c.submissaoId } });
    expect(submissao.status).toBe(StatusSubmissao.APROVADO);
    expect(pedidos).toHaveLength(1);
    expect(pedidos[0].status).toBe(StatusPedido.APROVADO);
  });

  it('tenant A não edita submissão do tenant B', async () => {
    const a = await criarCenario();
    const b = await criarCenario();
    await expect(service().editarSubmissao(b.submissaoId, a.restauranteId, {
      itens: [{ itemId: b.itemId, quantidadeAtual: 1 }],
    })).rejects.toMatchObject({ status: 404 });
    expect((await prisma.listaItemRef.findFirstOrThrow({ where: { itemId: b.itemId } })).quantidadeAtual).toBe(5);
  });
});
