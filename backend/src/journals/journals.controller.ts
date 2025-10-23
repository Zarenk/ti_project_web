import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { Roles } from 'src/users/roles.decorator';
import { RolesGuard } from 'src/users/roles.guard';
import { CreateJournalDto } from './dto/create-journal.dto';
import { Journal, JournalsService } from './journals.service';

@ApiTags('journals')
@Controller('accounting/journals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JournalsController {
  constructor(private readonly journalsService: JournalsService) {}

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateJournalDto): Journal {
    return this.journalsService.create(dto);
  }

  @Put(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: CreateJournalDto): Journal {
    return this.journalsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string): void {
    return this.journalsService.remove(id);
  }

  @Get()
  @Roles('ADMIN')
  async findAll(): Promise<Journal[]> {
    return this.journalsService.findAll();
  }
}
