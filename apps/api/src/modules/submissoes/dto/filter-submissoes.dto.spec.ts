import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { FilterSubmissoesDto } from './filter-submissoes.dto';

describe('FilterSubmissoesDto', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
  const run = (query: object) =>
    pipe.transform(query, { type: 'query', metatype: FilterSubmissoesDto });

  it('aceita restauranteId (seletor de tenant do SUPER_ADMIN enviado pelo Web)', async () => {
    await expect(run({ restauranteId: '7', status: 'PENDENTE' })).resolves.toMatchObject({ restauranteId: 7 });
  });

  it('rejeita restauranteId inválido e parâmetros desconhecidos', async () => {
    await expect(run({ restauranteId: 'abc' })).rejects.toBeDefined();
    await expect(run({ restauranteId: '0' })).rejects.toBeDefined();
    await expect(run({ foo: 'x' })).rejects.toBeDefined();
  });
});
