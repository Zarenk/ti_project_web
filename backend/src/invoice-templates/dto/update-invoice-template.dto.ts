import { PartialType } from '@nestjs/mapped-types';
import { CreateInvoiceTemplateDto } from './create-invoice-template.dto';

export class UpdateInvoiceTemplateDto extends PartialType(
  CreateInvoiceTemplateDto,
) {}
