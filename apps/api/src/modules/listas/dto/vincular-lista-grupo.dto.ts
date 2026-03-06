import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export class VincularListaGrupoDto {
  @ApiProperty({ example: 42 })
  @IsInt()
  listaId: number;
}
