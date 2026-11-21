import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AtualizarEstoqueDto } from './atualizar-estoque.dto';

describe('AtualizarEstoqueDto', () => {
  const erros = (quantidadeAtual: number) =>
    validate(
      plainToInstance(AtualizarEstoqueDto, { itens: [{ itemRefId: 1, quantidadeAtual }] }),
    );

  it('rejeita quantidade negativa', async () => {
    expect(await erros(-5)).not.toHaveLength(0);
  });

  it('aceita zero e fracionado', async () => {
    expect(await erros(0)).toHaveLength(0);
    expect(await erros(5.5)).toHaveLength(0);
  });
});
