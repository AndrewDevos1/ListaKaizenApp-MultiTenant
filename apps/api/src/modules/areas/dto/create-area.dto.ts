import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAreaDto {
  @ApiProperty({ example: 'Cozinha' })
  @IsString()
  @IsNotEmpty()
  nome: string;
}
