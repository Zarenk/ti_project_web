import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityModule } from 'src/activity/activity.module';

@Module({
  imports: [ActivityModule],
  controllers: [ChatController],
  providers: [ChatGateway, ChatService, PrismaService],
})
export class ChatModule {}
