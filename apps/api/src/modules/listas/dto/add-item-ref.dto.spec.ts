import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AddItemRefDto } from './add-item-ref.dto';

describe('AddItemRefDto', () => {
  const erros = (quantidadeMinima?: number) =>
    validate(plainToInstance(AddItemRefDto, { itemId: 1, quantidadeMinima }));

  it('rejeita quantidadeMinima negativa', async () => {
    expect(await erros(-1)).not.toHaveLength(0);
  });

  it('aceita zero, positivo e omitido', async () => {
    expect(await erros(0)).toHaveLength(0);
    expect(await erros(10)).toHaveLength(0);
    expect(await erros(undefined)).toHaveLength(0);
  });
});
