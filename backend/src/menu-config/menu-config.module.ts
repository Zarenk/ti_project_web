import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TenancyModule } from 'src/tenancy/tenancy.module';
import { MenuConfigController } from './menu-config.controller';
import { MenuConfigService } from './menu-config.service';

@Module({
  imports: [PrismaModule, TenancyModule],
  controllers: [MenuConfigController],
  providers: [MenuConfigService],
  exports: [MenuConfigService],
})
export class MenuConfigModule {}
