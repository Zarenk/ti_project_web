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

  async getUnansweredMessages(): Promise<{ clientId: number; count: number }[]> {
    const clients = await this.prisma.chatMessage.groupBy({ by: ['clientId'] });
    const counts: { clientId: number; count: number }[] = [];
    for (const { clientId } of clients) {
      const lastAdmin = await this.prisma.chatMessage.findFirst({
        where: { clientId, senderId: { not: clientId } },
        orderBy: { createdAt: 'desc' },
      });
      const count = await this.prisma.chatMessage.count({
        where: {
          clientId,
          senderId: clientId,
          ...(lastAdmin && { createdAt: { gt: lastAdmin.createdAt } }),
        },
      });
      if (count > 0) counts.push({ clientId, count });
    }
    return counts;
  }
}