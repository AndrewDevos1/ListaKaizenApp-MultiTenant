import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { EntregasEpiService } from './entregas-epi.service';

describe('EntregasEpiService', () => {
  const prisma = {
    usuario: { findFirst: jest.fn() },
    entregaEpi: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), findFirstOrThrow: jest.fn(), updateMany: jest.fn(), update: jest.fn() },
    entregaEpiEvento: { create: jest.fn() },
    posicaoMaterialAlmoxarifado: { findFirst: jest.fn() },
    notificacao: { create: jest.fn() },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    custodiaEpiItem: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
    devolucaoEpi: { findUnique: jest.fn(), create: jest.fn() },
    entregaEpiItem: { findUnique: jest.fn() },
    movimentoMaterialAlmoxarifado: { create: jest.fn() },
  } as any;
  const notifications = { criarNaTransacao: jest.fn() } as any;
  const service = new EntregasEpiService(prisma, notifications);

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((fn: any) => fn({ ...prisma, notificacao: prisma.notificacao }));
  });

  it('cria entrega multi-item com snapshots e notificação no mesmo tenant', async () => {
    prisma.usuario.findFirst.mockResolvedValue({ id: 7, role: 'COLLABORATOR', restauranteId: 3, ativo: true });
    prisma.posicaoMaterialAlmoxarifado.findFirst
      .mockResolvedValueOnce({ id: 10, restauranteId: 3, ativo: true, material: { id: 2, nome: 'Capacete', categoria: 'EPI' }, variante: { id: 4, tamanho: 'M' } })
      .mockResolvedValueOnce({ id: 11, restauranteId: 3, ativo: true, material: { id: 5, nome: 'Luva', categoria: 'EPI' }, variante: null });
    prisma.entregaEpi.create.mockResolvedValue({ id: 99, status: 'PENDENTE' });

    await expect(service.criar(3, { id: 8, role: 'ADMIN' }, {
      funcionarioId: 7, chaveIdempotencia: 'req-1', observacoes: 'Uso imediato',
      itens: [{ posicaoId: 10, quantidade: 1 }, { posicaoId: 11, quantidade: 2 }],
    })).resolves.toEqual({ id: 99, status: 'PENDENTE' });

    expect(prisma.entregaEpi.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ restauranteId: 3, funcionarioId: 7, criadoPorId: 8, itens: { create: expect.arrayContaining([expect.objectContaining({ materialNomeSnapshot: 'Capacete' })]) } }) }));
    expect(notifications.criarNaTransacao).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ usuarioId: 7, referenciaId: 99 }));
  });

  it('rejeita chave de criação repetida com payload diferente', async () => {
    prisma.usuario.findFirst.mockResolvedValue({ id: 7 });
    prisma.posicaoMaterialAlmoxarifado.findFirst.mockResolvedValue({ id: 10, materialId: 2, varianteId: null, material: { nome: 'Capacete', categoria: 'EPI', retornavel: false }, variante: null });
    prisma.entregaEpi.create.mockRejectedValue({ code: 'P2002', constructor: { name: 'PrismaClientKnownRequestError' } });
    prisma.entregaEpi.findFirst.mockResolvedValue({ id: 99, hashCriacao: 'outro-payload', itens: [] });
    await expect(service.criar(3, { id: 8, role: 'ADMIN' }, { funcionarioId: 7, chaveIdempotencia: 'req-1', itens: [{ posicaoId: 10, quantidade: 1 }] })).rejects.toBeInstanceOf(ConflictException);
  });

  it('exige chave não vazia para aceite', async () => {
    await expect(service.aceitar(3, 7, 99, ' ')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejeita retry de aceite com a mesma chave e payload diferente', async () => {
    prisma.entregaEpi.updateMany.mockResolvedValue({ count: 0 });
    prisma.entregaEpi.findFirst.mockResolvedValue({ id: 99, status: 'ACEITO', chaveUltimaTransicao: 'same', hashUltimaTransicao: 'outro', itens: [] });
    await expect(service.aceitar(3, 7, 99, 'same')).rejects.toBeInstanceOf(ConflictException);
  });

  it('aceita somente o próprio destinatário e transiciona condicionalmente', async () => {
    prisma.entregaEpi.updateMany.mockResolvedValue({ count: 1 });
    prisma.entregaEpi.findFirst.mockResolvedValueOnce({ id: 99, funcionarioId: 7, status: 'PENDENTE' });
    prisma.entregaEpi.findFirstOrThrow.mockResolvedValue({ id: 99, funcionarioId: 7, status: 'ACEITO', statusFisico: 'PREPARADA', itens: [], eventos: [], custodias: [] });
    prisma.entregaEpi.findFirst.mockResolvedValueOnce({ id: 99, funcionarioId: 7, status: 'ACEITO' });
    await expect(service.aceitar(3, 7, 99, 'accept-1')).resolves.toEqual(expect.objectContaining({ status: 'ACEITO' }));
    expect(prisma.entregaEpi.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 99, restauranteId: 3, funcionarioId: 7, status: 'PENDENTE' }) }));
  });

  it('exige justificativa na recusa', async () => {
    await expect(service.recusar(3, 7, 99, { chaveIdempotencia: 'r-1', justificativa: '' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('devolve parcialmente item retornável, reduz posse e só repõe condição reutilizável', async () => {
    prisma.custodiaEpiItem = { findFirst: jest.fn().mockResolvedValue({ id: 12, entregaId: 99, entregaItemId: 33, funcionarioId: 7, materialId: 2, varianteId: null, quantidadeEmPosse: 2, retornavel: true, entregaItem: { posicaoId: 10 } }), update: jest.fn() };
    prisma.posicaoMaterialAlmoxarifado.update = jest.fn();
    prisma.movimentoMaterialAlmoxarifado.create = jest.fn();
    prisma.$queryRaw.mockResolvedValueOnce([{ id: 12, entrega_id: 99, entrega_item_id: 33, funcionario_id: 7, material_id: 2, variante_id: null, quantidade_em_posse: 2, retornavel: true }]).mockResolvedValueOnce([{ id: 10, saldo: 4, material_id: 2, variante_id: null }]);
    prisma.entregaEpiEvento.create.mockResolvedValue({ id: 1 });
    prisma.entregaEpiItem.findUnique.mockResolvedValue({ id: 33, posicaoId: 10 });
    prisma.devolucaoEpi.create.mockResolvedValue({ id: 44 });
    await service.devolver(3, { id: 8, nome: 'Admin', role: 'ADMIN' }, 12, { quantidade: 1, condicao: 'REUTILIZAVEL', chaveIdempotencia: 'return-1' });
    expect(String(prisma.custodiaEpiItem.update.mock.calls[0][0].data.quantidadeEmPosse)).toBe('1');
    expect(String(prisma.posicaoMaterialAlmoxarifado.update.mock.calls[0][0].data.saldo)).toBe('5');
    expect(prisma.entregaEpiEvento.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ tipo: 'DEVOLUCAO' }) }));
  });

  it('rejeita devolução acima da posse', async () => {
    prisma.custodiaEpiItem = { findFirst: jest.fn().mockResolvedValue({ id: 12, quantidadeEmPosse: 1, retornavel: true }) };
    prisma.$queryRaw.mockResolvedValueOnce([{ id: 12, quantidade_em_posse: 1 }]);
    await expect(service.devolver(3, { id: 8, role: 'ADMIN' }, 12, { quantidade: 2, condicao: 'DANIFICADO', chaveIdempotencia: 'return-2' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
