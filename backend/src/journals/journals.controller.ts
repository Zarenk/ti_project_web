import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
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

  @Get()
  @Roles('ADMIN')
  findAll(): Journal[] {
    return this.journalsService.findAll();
  }
}