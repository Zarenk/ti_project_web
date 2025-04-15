import { Module } from '@nestjs/common';
import { SunatService } from './sunat.service';
import { SunatController } from './sunat.controller';

@Module({
  controllers: [SunatController],
  providers: [SunatService],
})
export class SunatModule {}
