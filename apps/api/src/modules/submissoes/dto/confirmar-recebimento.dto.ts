import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class ConfirmarRecebimentoDto {
  @ApiProperty({
    type: [Number],
    example: [10, 11, 15],
    description: 'IDs dos pedidos aprovados que foram recebidos fisicamente',
  })
  @IsArray()
  @IsInt({ each: true })
  itensConfirmados: number[];

  @ApiPropertyOptional({
    example: 'Item X chegou com avaria na embalagem.',
  })
  @IsOptional()
  @IsString()
  observacoes?: string;
}

