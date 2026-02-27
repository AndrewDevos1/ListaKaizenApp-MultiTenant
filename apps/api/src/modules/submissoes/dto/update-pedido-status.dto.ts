import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StatusPedido } from '@prisma/client';

export class UpdatePedidoStatusDto {
  @ApiProperty({ enum: StatusPedido, example: StatusPedido.APROVADO })
  @IsEnum(StatusPedido)
  status: StatusPedido;
}
