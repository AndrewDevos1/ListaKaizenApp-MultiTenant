import { Module } from '@nestjs/common';
import { CatalogoFornecedorController } from './catalogo-fornecedor.controller';
import { CatalogoFornecedorService } from './catalogo-fornecedor.service';

@Module({ controllers: [CatalogoFornecedorController], providers: [CatalogoFornecedorService] })
export class CatalogoFornecedorModule {}
