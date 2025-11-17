import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TenancyModule } from 'src/tenancy/tenancy.module';
import { ApisNetService } from './apisnet.service';
import { ApisPeruService } from './apisperu.service';
import { DecolectaService } from './decolecta.service';
import { LookupsController } from './lookups.controller';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 5000,
    }),
    TenancyModule,
  ],
  controllers: [LookupsController],
  providers: [ApisNetService, ApisPeruService, DecolectaService],
  exports: [ApisNetService, ApisPeruService, DecolectaService],
})
export class LookupsModule {}
