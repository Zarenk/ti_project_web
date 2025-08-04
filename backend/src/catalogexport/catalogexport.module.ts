import { Module } from '@nestjs/common';
import { CatalogexportService } from './catalogexport.service';
import { CatalogexportController } from './catalogexport.controller';

@Module({
  controllers: [CatalogexportController],
  providers: [CatalogexportService],
})
export class CatalogexportModule {}
