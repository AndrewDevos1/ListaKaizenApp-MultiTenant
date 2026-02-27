import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AddItemListaRapidaDto {
  @IsString()
  nome: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantidade?: number;

  @IsOptional()
  @IsString()
  unidade?: string;

  @IsOptional()
  @IsInt()
  itemId?: number;
}
