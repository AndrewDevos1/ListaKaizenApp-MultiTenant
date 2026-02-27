import { IsInt } from 'class-validator';

export class IniciarExecucaoDto {
  @IsInt()
  templateId: number;
}
