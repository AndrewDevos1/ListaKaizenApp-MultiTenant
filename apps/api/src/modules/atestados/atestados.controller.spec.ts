import { ForbiddenException } from '@nestjs/common';
import { AtestadosController } from './atestados.controller';

describe('AtestadosController', () => {
  const service = { listar: jest.fn(), criar: jest.fn(), decidir: jest.fn(), cancelar: jest.fn() } as any;
  const controller = new AtestadosController(service);

  beforeEach(() => jest.resetAllMocks());

  it('rejeita SUPER_ADMIN sem restaurante selecionado', () => {
    expect(() => controller.listar(undefined as any, {} as any)).toThrow(ForbiddenException);
    expect(service.listar).not.toHaveBeenCalled();
  });
});
