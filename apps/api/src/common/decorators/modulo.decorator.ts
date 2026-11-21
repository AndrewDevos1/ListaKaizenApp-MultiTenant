import { SetMetadata } from '@nestjs/common';

export type RestauranteModulo = 'moduloPonto' | 'moduloFuncionarios';

export const MODULO_KEY = 'restaurante-modulo';
export const Modulo = (modulo: RestauranteModulo) => SetMetadata(MODULO_KEY, modulo);
