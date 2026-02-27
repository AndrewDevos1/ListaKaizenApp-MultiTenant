import { IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StatusSubmissao } from '@prisma/client';

export class FilterSubmissoesDto {
  @ApiPropertyOptional({ enum: StatusSubmissao })
  @IsEnum(StatusSubmissao)
  @IsOptional()
  status?: StatusSubmissao;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  arquivada?: boolean;
}
