import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ListarAusenciasDto } from './listar-ausencias.dto';
import { ListarAtestadosDto } from '../../atestados/dto/listar-atestados.dto';

describe('DTOs de listagem aceitam restauranteId (seletor SUPER_ADMIN)', () => {
  it.each([ListarAusenciasDto, ListarAtestadosDto])('%p', (C) => {
    const o = plainToInstance(C as any, { restauranteId: '2' });
    expect(validateSync(o as object, { whitelist: true, forbidNonWhitelisted: true })).toHaveLength(0);
  });
});
