import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { AuditAction, ChatMessage } from '@prisma/client';
import { Request } from 'express';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private readonly activityService: ActivityService,
  ) {}

  async addMessage(
    {
      clientId,
      senderId,
      text,
      file,
    }: {
      clientId: number;
      senderId: number;
      text?: string;
      file?: string;
    },
    req?: Request,
  ): Promise<ChatMessage> {
    // Only persist allowed fields to avoid runtime errors if extra properties
    // are accidentally provided in the payload (e.g. attachments).
    const message = await this.prisma.chatMessage.create({
      data: { clientId, senderId, text: text ?? '', file },
    });

    // Log message creation without storing full message content
    const sanitizedText = text?.slice(0, 1000);
    await this.activityService.log(
      {
        actorId: senderId,
        entityType: 'ChatMessage',
        entityId: message.id.toString(),
        action: AuditAction.CREATED,
        summary: `Mensaje de usuario ${senderId} al cliente ${clientId}`,
        diff: sanitizedText ? { message: sanitizedText } : undefined,
      },
      req,
    );

    return message;
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

  async getUnansweredMessages(): Promise<
    { clientId: number; count: number }[]
  > {
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