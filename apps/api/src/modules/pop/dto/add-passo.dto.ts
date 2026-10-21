import { IsInt, IsString, Min } from 'class-validator';

export class AddPassoDto {
  @IsString()
  descricao: string;

  @IsInt()
  @Min(1)
  ordem: number;
}
