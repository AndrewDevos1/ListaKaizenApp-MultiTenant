import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ImportCsvDto {
  @ApiProperty({ description: 'Conteúdo CSV: nome,unidade,quantidade_minima por linha' })
  @IsString()
  @IsNotEmpty()
  texto: string;
}
