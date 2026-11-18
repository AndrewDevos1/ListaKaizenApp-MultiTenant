import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ROLES_KEY } from '../../common/decorators';
import { CatalogoFornecedorController } from './catalogo-fornecedor.controller';
import { CreateCatalogoItemDto, PreviewCatalogoDto, ConfirmarCatalogoDto } from './dto/catalogo.dto';
import { CatalogoFornecedorModule } from './catalogo-fornecedor.module';
import { AppModule } from '../../app.module';

const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const v = (type: any, value: any) => pipe.transform(value, { type: 'body', metatype: type });

describe('CatalogoFornecedorController', () => {
  it('toda rota exige ADMIN ou SUPER_ADMIN (SUPPLIER/COLLABORATOR sem acesso)', () => {
    const proto = CatalogoFornecedorController.prototype as any;
    for (const m of ['listar', 'criar', 'atualizar', 'inativar', 'preview', 'confirmar']) {
      expect(Reflect.getMetadata(ROLES_KEY, proto[m])).toEqual(['ADMIN', 'SUPER_ADMIN']);
    }
  });

  it('delegates com tenant resolvido', async () => {
    const svc: any = { listar: jest.fn(), preview: jest.fn(), confirmar: jest.fn() };
    const c = new CatalogoFornecedorController(svc);
    await c.listar(3, 1, { q: 'a' } as any);
    expect(svc.listar).toHaveBeenCalledWith(3, 1, { q: 'a', ativo: undefined });
    await c.preview(3, 1, 9, { formato: 'texto', conteudo: 'x' });
    expect(svc.preview).toHaveBeenCalledWith(3, { formato: 'texto', conteudo: 'x' }, 1, 9);
    await c.confirmar(3, 1, { token: 'u' } as any);
    expect(svc.confirmar).toHaveBeenCalledWith(3, 'u', 1);
  });

  it('DTO inválido => 400', async () => {
    await expect(v(CreateCatalogoItemDto, { nome: '', unidadeMedida: 'kg' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(v(CreateCatalogoItemDto, { nome: 'a', unidadeMedida: 'kg', precoAtual: -1 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(v(CreateCatalogoItemDto, { nome: 'a', unidadeMedida: 'kg', restauranteId: 2 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(v(PreviewCatalogoDto, { formato: 'xml', conteudo: 'x' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(v(PreviewCatalogoDto, { formato: 'csv', conteudo: '' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(v(ConfirmarCatalogoDto, { token: 'nao-uuid' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(v(CreateCatalogoItemDto, { nome: ' Sal ', unidadeMedida: 'kg' })).resolves.toMatchObject({ nome: 'Sal' });
  });

  it('módulo registrado no AppModule', () => {
    expect(Reflect.getMetadata('imports', AppModule)).toContain(CatalogoFornecedorModule);
  });
});
