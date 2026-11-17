import { CatalogoFornecedorService } from './catalogo-fornecedor.service';

describe('CatalogoFornecedorService — histórico de preço', () => {
  const setup = () => {
    const tx: any = { item: { findFirst: jest.fn(), update: jest.fn() }, historicoPrecoItem: { create: jest.fn(), findMany: jest.fn() } };
    const prisma: any = { item: { findFirst: jest.fn().mockResolvedValue({ id: 7, restauranteId: 3, fornecedorId: 2 }), update: jest.fn() }, fornecedor: { findFirst: jest.fn().mockResolvedValue({ id: 2 }) }, $transaction: jest.fn((fn: any) => fn(tx)) };
    return { service: new CatalogoFornecedorService(prisma), prisma, tx };
  };

  it('grava preço e evento imutável na mesma transação quando muda', async () => {
    const { service, tx } = setup();
    tx.item.findFirst.mockResolvedValue({ id: 7, restauranteId: 3, fornecedorId: 2, precoAtual: '10.00' });
    tx.item.update.mockResolvedValue({ id: 7, precoAtual: '12.50' });
    await service.atualizar(2, 7, { precoAtual: 12.5 }, 3, { id: 9, nome: 'Admin' });
    expect(tx.item.update).toHaveBeenCalledWith({ where: { id: 7 }, data: { precoAtual: 12.5 } });
    expect(tx.historicoPrecoItem.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ itemId: 7, restauranteId: 3, fornecedorId: 2, precoAnterior: '10.00', precoNovo: 12.5, autorId: 9, origem: 'CATALOGO' }) }));
  });

  it('não cria evento quando preço é idêntico', async () => {
    const { service, tx } = setup();
    tx.item.findFirst.mockResolvedValue({ id: 7, restauranteId: 3, fornecedorId: 2, precoAtual: '12.50' });
    await service.atualizar(2, 7, { precoAtual: 12.5 }, 3, { id: 9, nome: 'Admin' });
    expect(tx.item.update).not.toHaveBeenCalled();
    expect(tx.historicoPrecoItem.create).not.toHaveBeenCalled();
  });
});
