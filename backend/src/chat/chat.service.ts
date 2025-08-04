import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { ChatMessage } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async addMessage(message: {
    clientId: number;
    senderId: number;
    text: string;
  }): Promise<ChatMessage> {
    return this.prisma.chatMessage.create({ data: message });
  }

  async getMessages(clientId: number): Promise<ChatMessage[]> {
    return this.prisma.chatMessage.findMany({
      where: { clientId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getUnansweredMessages(): Promise<ChatMessage[]> {
    const lastMessages = await this.prisma.chatMessage.findMany({
      orderBy: { createdAt: 'desc' },
      distinct: ['clientId'],
    });
    return lastMessages.filter((m) => m.senderId === m.clientId);
  }
}