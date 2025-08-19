import { PartialType } from '@nestjs/swagger';
import { CreatePublishDto } from './create-publish.dto';

export class UpdatePublishDto extends PartialType(CreatePublishDto) {}
