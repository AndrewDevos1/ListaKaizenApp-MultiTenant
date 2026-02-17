import { PartialType } from '@nestjs/swagger';
import { CreateListaDto } from './create-lista.dto';

export class UpdateListaDto extends PartialType(CreateListaDto) {}
