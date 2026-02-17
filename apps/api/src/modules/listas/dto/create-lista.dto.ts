import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateListaDto {
  @ApiProperty({ example: 'Lista Semanal' })
  @IsString()
  @IsNotEmpty()
  nome: string;
}
