import { IsOptional, IsString } from 'class-validator';

export class RejeitarSugestaoDto {
  @IsOptional()
  @IsString()
  motivo?: string;
}
