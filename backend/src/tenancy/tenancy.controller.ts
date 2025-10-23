import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { TenancyService } from './tenancy.service';
import { CreateTenancyDto } from './dto/create-tenancy.dto';
import { UpdateTenancyDto } from './dto/update-tenancy.dto';
import { TenancySnapshot } from './entities/tenancy.entity';
import { GlobalSuperAdminGuard } from './global-super-admin.guard';

@UseGuards(GlobalSuperAdminGuard)
@Controller('tenancy')
export class TenancyController {
  constructor(private readonly tenancyService: TenancyService) {}

  @Post()
  create(@Body() createTenancyDto: CreateTenancyDto): Promise<TenancySnapshot> {
    return this.tenancyService.create(createTenancyDto);
  }

  @Get()
  findAll(): Promise<TenancySnapshot[]> {
    return this.tenancyService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<TenancySnapshot> {
    return this.tenancyService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTenancyDto: UpdateTenancyDto,
  ): Promise<TenancySnapshot> {
    return this.tenancyService.update(id, updateTenancyDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<TenancySnapshot> {
    return this.tenancyService.remove(id);
  }
}
