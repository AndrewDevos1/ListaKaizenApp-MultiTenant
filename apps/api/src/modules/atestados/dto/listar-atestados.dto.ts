import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class ListarAtestadosDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) usuarioId?: number;
  // Seletor de restaurante (SUPER_ADMIN); resolvido por @TenantId.
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) restauranteId?: number;
}
