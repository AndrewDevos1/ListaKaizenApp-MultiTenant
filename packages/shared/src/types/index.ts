import { UserRole } from '../enums';

export interface AuthUser {
  id: number;
  nome: string;
  email: string;
  role: UserRole;
  restauranteId: number | null;
  avatarUrl?: string | null;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface Restaurante {
  id: number;
  nome: string;
  cnpj: string | null;
  ativo: boolean;
}

export interface Item {
  id: number;
  nome: string;
  unidadeMedida: string;
  ativo: boolean;
  restauranteId: number;
}

export interface Area {
  id: number;
  nome: string;
  restauranteId: number;
}

export interface Lista {
  id: number;
  nome: string;
  restauranteId: number;
  deletado: boolean;
}

export interface ListaItemRef {
  id: number;
  listaId: number;
  itemId: number;
  quantidadeMinima: number;
  quantidadeAtual: number;
  item?: Item;
}
