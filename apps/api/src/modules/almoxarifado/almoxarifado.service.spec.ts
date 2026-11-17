import { BadRequestException } from '@nestjs/common';
import { AlmoxarifadoService } from './almoxarifado.service';

describe('AlmoxarifadoService', () => {
  const move = { tipo: 'SAIDA' as any, quantidade: 2, motivo: 'uso', chaveIdempotencia: 'k' };
  const user = { id: 1, nome: 'A' };
  const build = (prior: any) => {
    const tx: any = {
      almoxarifadoMovimentacao: { findUnique: jest.fn().mockResolvedValue(prior), create: jest.fn() },
      $queryRaw: jest.fn().mockResolvedValue([{ id: 1, saldo: '1', ativo: true }]),
      almoxarifadoPosicao: { update: jest.fn(), findUniqueOrThrow: jest.fn() },
    };
    const p: any = { $transaction: jest.fn((fn) => fn(tx)) };
    return { tx, svc: new AlmoxarifadoService(p) };
  };
  it('idempotência retorna evento prévio sem escrita', async () => {
    const { tx, svc } = build({ id: 9, posicaoId: 1 });
    await expect(svc.move(1, move, 1, user)).resolves.toEqual({ id: 9, posicaoId: 1 });
    expect(tx.almoxarifadoPosicao.update).not.toHaveBeenCalled();
  });
  it('saída sem saldo falha antes de escrita', async () => {
    const { tx, svc } = build(null);
    await expect(svc.move(1, move, 1, user)).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.almoxarifadoPosicao.update).not.toHaveBeenCalled();
    expect(tx.almoxarifadoMovimentacao.create).not.toHaveBeenCalled();
  });
});
