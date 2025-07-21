import { PartialType } from '@nestjs/swagger';
import { CreateWebSaleDto } from './create-websale.dto';

export class UpdateWebsaleDto extends PartialType(CreateWebSaleDto) {}
