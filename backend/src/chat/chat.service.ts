import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { ChatMessage } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async addMessage({
    clientId,
    senderId,
    text,
  }: {
    clientId: number;
    senderId: number;
    text: string;
  }): Promise<ChatMessage> {
    // Only persist allowed fields to avoid runtime errors if extra properties
    // are accidentally provided in the payload (e.g. attachments).
    return this.prisma.chatMessage.create({
      data: { clientId, senderId, text },
    });
  }

  async getMessages(clientId: number): Promise<ChatMessage[]> {
    return this.prisma.chatMessage.findMany({
      where: { clientId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async markAsSeen(clientId: number, viewerId: number, seenAt: Date) {
    await this.prisma.chatMessage.updateMany({
      where: { clientId, senderId: { not: viewerId }, seenAt: null },
      data: { seenAt },
    });
  }

  async getUnansweredMessages(): Promise<{ clientId: number; count: number }[]> {
    const messages = await this.prisma.chatMessage.findMany({
      where: { seenAt: null },
    });
    const counts: Record<number, number> = {};
    for (const m of messages) {
      if (m.senderId === m.clientId) {
        counts[m.clientId] = (counts[m.clientId] ?? 0) + 1;
      }
    }
    return Object.entries(counts).map(([clientId, count]) => ({
      clientId: Number(clientId),
      count,
    }));
  }
}