import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { EntregasEpiService } from './entregas-epi.service';

describe('EntregasEpiService', () => {
  const prisma = {
    usuario: { findFirst: jest.fn() },
    entregaEpi: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), findFirstOrThrow: jest.fn(), updateMany: jest.fn() },
    entregaEpiEvento: { create: jest.fn() },
    posicaoMaterialAlmoxarifado: { findFirst: jest.fn() },
    notificacao: { create: jest.fn() },
    $transaction: jest.fn(),
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
});
