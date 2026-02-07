import { Module } from '@nestjs/common';
import { ClientService } from './clients.service';
import { ClientController } from './clients.controller';
import { ClientsPublicController } from './clients-public.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [ClientController, ClientsPublicController],
  providers: [ClientService, PrismaService],
})
export class ClientsModule {}
