import { PartialType } from '@nestjs/swagger';
import { CreateAccReportDto } from './create-acc-report.dto';

export class UpdateAccReportDto extends PartialType(CreateAccReportDto) {}
