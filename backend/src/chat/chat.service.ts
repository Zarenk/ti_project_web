import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { AuditAction, ChatMessage, Prisma } from '@prisma/client';
import { Request } from 'express';
import { TenantContext } from 'src/tenancy/tenant-context.interface';

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

  private collectIds(primary: number | null, extras: number[]): Set<number> {
    const ids = new Set<number>();
    if (primary !== null) {
      ids.add(primary);
    }
    for (const id of extras) {
      ids.add(id);
    }
    return ids;
  }

  private async assertClientWithinTenant(
    clientId: number,
    tenant?: TenantContext,
  ) {
    const client = await this.prisma.client.findUnique({
      where: { userId: clientId },
      select: { id: true, organizationId: true, companyId: true },
    });

    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }

    if (!tenant) {
      return client;
    }

    if (tenant.isGlobalSuperAdmin) {
      if (
        tenant.organizationId !== null &&
        client.organizationId !== tenant.organizationId
      ) {
        throw new ForbiddenException(
          'El cliente no pertenece a la organización seleccionada.',
        );
      }
      if (
        tenant.companyId !== null &&
        client.companyId !== tenant.companyId
      ) {
        throw new ForbiddenException(
          'El cliente no pertenece a la empresa seleccionada.',
        );
      }
      return client;
    }

    const allowedOrgIds = this.collectIds(
      tenant.organizationId,
      tenant.allowedOrganizationIds,
    );
    if (allowedOrgIds.size > 0) {
      if (client.organizationId === null) {
        throw new ForbiddenException(
          'El cliente no pertenece a una organización válida.',
        );
      }
      if (!allowedOrgIds.has(client.organizationId)) {
        throw new ForbiddenException(
          'El cliente no pertenece a la organización seleccionada.',
        );
      }
    }

    const allowedCompanyIds = this.collectIds(
      tenant.companyId,
      tenant.allowedCompanyIds,
    );
    if (allowedCompanyIds.size > 0) {
      if (client.companyId === null) {
        throw new ForbiddenException(
          'El cliente no pertenece a una empresa válida.',
        );
      }
      if (!allowedCompanyIds.has(client.companyId)) {
        throw new ForbiddenException(
          'El cliente no pertenece a la empresa seleccionada.',
        );
      }
    }

    return client;
  }

  private buildClientTenantFilter(
    tenant?: TenantContext,
  ): Prisma.ClientWhereInput | undefined {
    if (!tenant) {
      return undefined;
    }

    const where: Prisma.ClientWhereInput = {};

    const allowedOrgIds = this.collectIds(
      tenant.organizationId,
      tenant.isGlobalSuperAdmin ? [] : tenant.allowedOrganizationIds,
    );
    if (allowedOrgIds.size > 0) {
      where.organizationId = { in: Array.from(allowedOrgIds) };
    }

    const allowedCompanyIds = this.collectIds(
      tenant.companyId,
      tenant.isGlobalSuperAdmin ? [] : tenant.allowedCompanyIds,
    );

    if (tenant.companyId !== null) {
      where.companyId = tenant.companyId;
    } else if (allowedCompanyIds.size > 0) {
      where.companyId = { in: Array.from(allowedCompanyIds) };
    }

    return Object.keys(where).length > 0 ? where : undefined;
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
    tenant?: TenantContext,
  ): Promise<ChatMessage> {
    await this.assertClientWithinTenant(clientId, tenant);

    let effectiveSenderId = senderId;
    if (tenant) {
      if (tenant.userId !== null) {
        if (!tenant.isGlobalSuperAdmin && tenant.userId !== senderId) {
          throw new ForbiddenException(
            'No puedes enviar mensajes en nombre de otro usuario.',
          );
        }
        effectiveSenderId = tenant.userId;
      }
    }

    // Only persist allowed fields to avoid runtime errors if extra properties
    // are accidentally provided in the payload (e.g. attachments).
    const message = await this.prisma.chatMessage.create({
      data: {
        clientId,
        senderId: effectiveSenderId,
        text: text ?? '',
        file,
      },
    });

    // Log message creation without storing full message content
    const sanitizedText = text?.slice(0, 1000);
    const actorEmail = await this.getActorEmail(effectiveSenderId);
    await this.activityService.log(
      {
        actorId: effectiveSenderId,
        actorEmail,
        entityType: 'ChatMessage',
        entityId: message.id.toString(),
        action: AuditAction.CREATED,
        summary: `Mensaje de usuario ${effectiveSenderId} al cliente ${clientId}`,
        diff: sanitizedText ? { message: sanitizedText } : undefined,
      },
      req,
    );

    return message;
  }

  async getMessages(
    clientId: number,
    tenant?: TenantContext,
  ): Promise<ChatMessage[]> {
    await this.assertClientWithinTenant(clientId, tenant);
    return this.prisma.chatMessage.findMany({
      where: { clientId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async markAsSeen(
    clientId: number,
    viewerId: number,
    seenAt: Date,
    tenant?: TenantContext,
  ) {
    await this.assertClientWithinTenant(clientId, tenant);
    await this.prisma.chatMessage.updateMany({
      where: { clientId, senderId: { not: viewerId }, seenAt: null },
      data: { seenAt },
    });
  }

  async updateMessage(
    { id, senderId, text }: { id: number; senderId: number; text: string },
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

  async getUnansweredMessages(
    tenant?: TenantContext,
  ): Promise<
    { clientId: number; count: number }[]
  > {
    const clientFilter = this.buildClientTenantFilter(tenant);
    const scopedClients = await this.prisma.client.findMany({
      ...(clientFilter ? { where: clientFilter } : {}),
      select: { userId: true },
    });

    if (tenant && scopedClients.length === 0) {
      return [];
    }

    const clientIds =
      scopedClients.length > 0
        ? scopedClients.map((client) => client.userId)
        : undefined;

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        seenAt: null,
        ...(clientIds ? { clientId: { in: clientIds } } : {}),
      },
      select: { clientId: true, senderId: true },
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
