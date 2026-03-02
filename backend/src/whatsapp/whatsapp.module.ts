import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppGateway } from './whatsapp.gateway';
import { AutomationService } from './automation/automation.service';
import { AutoReplyService } from './auto-reply/auto-reply.service';
import { AutoReplyController } from './auto-reply/auto-reply.controller';
import { HelpModule } from '../help/help.module';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      // Use this instance to handle WhatsApp-specific events
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    HelpModule,
  ],
  controllers: [WhatsAppController, AutoReplyController],
  providers: [
    WhatsAppService,
    WhatsAppGateway,
    AutomationService,
    AutoReplyService,
    PrismaService,
  ],
  exports: [WhatsAppService, AutomationService],
})
export class WhatsAppModule {}
