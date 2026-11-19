import { BadRequestException, ConflictException } from '@nestjs/common';
import { AlmoxarifadoService } from './almoxarifado.service';

describe('AlmoxarifadoService EPI', () => {
  const user = { id: 7, nome: 'Admin' };

  it('cria material isolado do catálogo de compras', async () => {
    const prisma: any = {
      materialAlmoxarifado: { create: jest.fn().mockResolvedValue({ id: 1, nome: 'Avental', categoria: 'UNIFORME' }) },
    };
    const service = new AlmoxarifadoService(prisma);
    await expect(service.createMaterial({ nome: 'Avental', categoria: 'UNIFORME', retornavel: true, valorReferencia: 29.9 }, 1))
      .resolves.toMatchObject({ nome: 'Avental', categoria: 'UNIFORME' });
    expect(prisma.item).toBeUndefined();
  });

  it('idempotência retorna movimento prévio sem alterar saldo', async () => {
    const tx: any = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 1, saldo: '1', ativo: true, material_id: 3, variante_id: null }]),
      movimentoMaterialAlmoxarifado: { findUnique: jest.fn().mockResolvedValue({ id: 9, posicaoId: 1 }), create: jest.fn() },
      posicaoMaterialAlmoxarifado: { update: jest.fn(), findUniqueOrThrow: jest.fn() },
    };
    const service = new AlmoxarifadoService({ $transaction: jest.fn((fn) => fn(tx)) } as any);
    await expect(service.move(1, { tipo: 'ENTRADA', quantidade: 2, motivo: 'entrada', chaveIdempotencia: 'k' } as any, 1, user))
      .resolves.toEqual({ id: 9, posicaoId: 1 });
    expect(tx.posicaoMaterialAlmoxarifado.update).not.toHaveBeenCalled();
  });

  it('ajuste negativo falha antes de escrita', async () => {
    const tx: any = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 1, saldo: '1', ativo: true, material_id: 3, variante_id: null }]),
      movimentoMaterialAlmoxarifado: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
      posicaoMaterialAlmoxarifado: { update: jest.fn(), findUniqueOrThrow: jest.fn() },
    };
    const service = new AlmoxarifadoService({ $transaction: jest.fn((fn) => fn(tx)) } as any);
    await expect(service.move(1, { tipo: 'AJUSTE', quantidade: -1, motivo: 'inventário', chaveIdempotencia: 'k' } as any, 1, user))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(tx.posicaoMaterialAlmoxarifado.update).not.toHaveBeenCalled();
  });

  it('rejeita chave usada em outra posição', async () => {
    const tx: any = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 1, saldo: '1', ativo: true, material_id: 3, variante_id: null }]),
      movimentoMaterialAlmoxarifado: { findUnique: jest.fn().mockResolvedValue({ id: 9, posicaoId: 2 }), create: jest.fn() },
      posicaoMaterialAlmoxarifado: { update: jest.fn(), findUniqueOrThrow: jest.fn() },
    };
    const service = new AlmoxarifadoService({ $transaction: jest.fn((fn) => fn(tx)) } as any);
    await expect(service.move(1, { tipo: 'ENTRADA', quantidade: 1, motivo: 'entrada', chaveIdempotencia: 'k' } as any, 1, user))
      .rejects.toBeInstanceOf(ConflictException);
  });
});
