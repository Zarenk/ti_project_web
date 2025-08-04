import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { ChatMessage } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async addMessage(message: { userId: number; text: string }): Promise<ChatMessage> {
    return this.prisma.chatMessage.create({ data: message });
  }

  async getMessages(userId: number): Promise<ChatMessage[]> {
    return this.prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }
}