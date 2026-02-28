import { IsArray, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignColaboradoresDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  colaboradorIds: number[];
}
