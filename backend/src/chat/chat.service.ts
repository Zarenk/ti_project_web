import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
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

  private readonly LIMIT_MS = 5 * 60 * 1000;

  private async getActorEmail(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return user?.email;
  }

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
    const actorEmail = await this.getActorEmail(senderId);
    await this.activityService.log(
      {
        actorId: senderId,
        actorEmail,
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
      where: { clientId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async markAsSeen(clientId: number, viewerId: number, seenAt: Date) {
    await this.prisma.chatMessage.updateMany({
      where: { clientId, senderId: { not: viewerId }, seenAt: null },
      data: { seenAt },
    });
  }

  async updateMessage(
    {
      id,
      senderId,
      text,
    }: { id: number; senderId: number; text: string },
    req?: Request,
  ): Promise<ChatMessage> {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id },
    });

    if (!message || message.deletedAt) {
      throw new NotFoundException('Message not found');
    }
    if (message.senderId !== senderId) {
      throw new ForbiddenException('Cannot edit this message');
    }
    if (Date.now() - message.createdAt.getTime() > this.LIMIT_MS) {
      throw new ForbiddenException('Edit window expired');
    }

    const updated = await this.prisma.chatMessage.update({
      where: { id },
      data: { text },
    });

    const sanitizedText = text?.slice(0, 1000);
    const actorEmail = await this.getActorEmail(senderId);
    await this.activityService.log(
      {
        actorId: senderId,
        actorEmail,
        entityType: 'ChatMessage',
        entityId: id.toString(),
        action: AuditAction.UPDATED,
        summary: `Mensaje ${id} editado por ${senderId}`,
        diff: sanitizedText ? { message: sanitizedText } : undefined,
      },
      req,
    );

    return updated;
  }

  async deleteMessage(
    { id, senderId }: { id: number; senderId: number },
    req?: Request,
  ): Promise<ChatMessage> {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id },
    });

    if (!message || message.deletedAt) {
      throw new NotFoundException('Message not found');
    }
    if (message.senderId !== senderId) {
      throw new ForbiddenException('Cannot delete this message');
    }
    if (Date.now() - message.createdAt.getTime() > this.LIMIT_MS) {
      throw new ForbiddenException('Delete window expired');
    }

    const deleted = await this.prisma.chatMessage.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    const actorEmail = await this.getActorEmail(senderId);
    await this.activityService.log(
      {
        actorId: senderId,
        actorEmail,
        entityType: 'ChatMessage',
        entityId: id.toString(),
        action: AuditAction.DELETED,
        summary: `Mensaje ${id} eliminado por ${senderId}`,
      },
      req,
    );

    return deleted;
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