import { IsArray, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkImportNamesDto {
  @ApiProperty({ example: ['Farinha de Trigo', 'Açúcar Cristal', 'Sal'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  nomes: string[];
}
