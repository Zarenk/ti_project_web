import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import {
  Logger,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenantContext } from 'src/tenancy/tenant-context.interface';
import { isAllowedOrigin } from 'src/common/cors/allowed-origins';

@WebSocketGateway({
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private readonly messageCounts = new Map<
    string,
    { count: number; timestamp: number }
  >();
  private readonly LIMIT = 5;
  private readonly INTERVAL_MS = 10_000;

  async handleConnection(client: Socket) {
    try {
      const context = await this.resolveSocketTenantContext(client);
      const data = client.data as { chatContext?: typeof context };
      data.chatContext = context;
      await client.join(
        this.getTenantRoom(context.organizationId, context.companyId),
      );
    } catch (error) {
      this.logger.warn(
        `Socket ${client.id} rejected: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      client.emit('chat:error', { message: 'No autorizado para usar chat.' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.messageCounts.delete(client.id);
  }

  private parseNumeric(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private resolveToken(client: Socket): string | null {
    const authPayload =
      (client.handshake.auth as Record<string, unknown> | undefined) ?? {};
    const authToken = authPayload.token;
    const headerAuth = client.handshake.headers?.authorization;
    const raw =
      (typeof authToken === 'string' ? authToken : null) ??
      (typeof headerAuth === 'string' ? headerAuth : null);

    if (!raw) return null;
    return raw.startsWith('Bearer ') ? raw.slice(7).trim() : raw.trim();
  }

  private normalizeRole(role: unknown): string {
    if (typeof role !== 'string') return '';
    return role.trim().toUpperCase().replace(/\s+/g, '_');
  }

  private buildTenantContextFromSocket(socketContext: {
    userId: number;
    organizationId: number | null;
    companyId: number | null;
    isGlobalSuperAdmin: boolean;
    allowedOrganizationIds: number[];
    allowedCompanyIds: number[];
  }): TenantContext {
    return {
      organizationId: socketContext.organizationId,
      companyId: socketContext.companyId,
      organizationUnitId: null,
      userId: socketContext.userId,
      isGlobalSuperAdmin: socketContext.isGlobalSuperAdmin,
      isOrganizationSuperAdmin: false,
      isSuperAdmin: socketContext.isGlobalSuperAdmin,
      allowedOrganizationIds: socketContext.allowedOrganizationIds,
      allowedCompanyIds: socketContext.allowedCompanyIds,
      allowedOrganizationUnitIds: [],
    };
  }

  private getTenantRoom(
    organizationId: number | null,
    companyId: number | null,
  ): string {
    return `chat:org:${organizationId ?? 'none'}:company:${companyId ?? 'none'}`;
  }

  private getConversationRoom(
    organizationId: number | null,
    companyId: number | null,
    clientId: number,
  ): string {
    return `${this.getTenantRoom(organizationId, companyId)}:client:${clientId}`;
  }

  private getSocketContext(client: Socket): {
    userId: number;
    organizationId: number | null;
    companyId: number | null;
    isGlobalSuperAdmin: boolean;
    allowedOrganizationIds: number[];
    allowedCompanyIds: number[];
  } {
    const socketData = client.data as { chatContext?: unknown };
    const context = socketData.chatContext as
      | {
          userId: number;
          organizationId: number | null;
          companyId: number | null;
          isGlobalSuperAdmin: boolean;
          allowedOrganizationIds: number[];
          allowedCompanyIds: number[];
        }
      | undefined;
    if (!context) {
      throw new UnauthorizedException('Contexto de chat no disponible.');
    }
    return context;
  }

  private async resolveSocketTenantContext(client: Socket) {
    const authPayload =
      (client.handshake.auth as Record<string, unknown> | undefined) ?? {};
    const token = this.resolveToken(client);
    if (!token) {
      throw new UnauthorizedException('Token requerido.');
    }

    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new UnauthorizedException('JWT secret no configurado.');
    }

    const payload = await this.jwtService.verifyAsync<{
      sub?: number;
      role?: string;
      tokenVersion?: number;
      defaultOrganizationId?: number | null;
      defaultCompanyId?: number | null;
      organizations?: Array<number | string>;
      companies?: Array<number | string>;
      companyIds?: Array<number | string>;
    }>(token, { secret });

    const userId = this.parseNumeric(payload?.sub);
    if (!userId) {
      throw new UnauthorizedException('Token inválido.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tokenVersion: true,
        role: true,
        organizationId: true,
        lastOrgId: true,
        lastCompanyId: true,
      },
    });
    if (!user || user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Token revocado.');
    }

    const normalizedRole = this.normalizeRole(payload.role ?? user.role);
    const isGlobalSuperAdmin =
      normalizedRole === 'SUPER_ADMIN_GLOBAL' ||
      normalizedRole === 'SUPER_ADMIN';

    const memberships = await this.prisma.organizationMembership.findMany({
      where: { userId },
      select: { organizationId: true },
    });
    const allowedOrganizationIds = Array.from(
      new Set([
        ...memberships.map((m) => m.organizationId),
        ...(user.organizationId ? [user.organizationId] : []),
      ]),
    );

    const handshakeOrgId = this.parseNumeric(
      authPayload.orgId ?? client.handshake.headers?.['x-org-id'],
    );
    const handshakeCompanyId = this.parseNumeric(
      authPayload.companyId ?? client.handshake.headers?.['x-company-id'],
    );

    let organizationId =
      handshakeOrgId ??
      this.parseNumeric(payload.defaultOrganizationId) ??
      user.lastOrgId ??
      user.organizationId ??
      allowedOrganizationIds[0] ??
      null;
    const companyId =
      handshakeCompanyId ??
      this.parseNumeric(payload.defaultCompanyId) ??
      user.lastCompanyId ??
      null;

    if (companyId !== null) {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, organizationId: true },
      });
      if (!company) {
        throw new UnauthorizedException('Compañía inválida.');
      }
      if (
        organizationId !== null &&
        organizationId !== company.organizationId
      ) {
        throw new UnauthorizedException(
          'La compañía no pertenece a la organización.',
        );
      }
      organizationId = company.organizationId;
    }

    if (!isGlobalSuperAdmin) {
      if (
        organizationId === null ||
        !allowedOrganizationIds.includes(organizationId)
      ) {
        throw new UnauthorizedException(
          'No autorizado para la organización seleccionada.',
        );
      }
    }

    const allowedCompanyIds = (payload.companies ?? payload.companyIds ?? [])
      .map((id) => this.parseNumeric(id))
      .filter((id): id is number => id !== null);

    return {
      userId,
      organizationId,
      companyId,
      isGlobalSuperAdmin,
      allowedOrganizationIds,
      allowedCompanyIds,
    };
  }

  emitMessageToConversation(
    message: { clientId: number },
    tenant?: Pick<TenantContext, 'organizationId' | 'companyId'>,
  ): void {
    if (!tenant) {
      return;
    }
    const room = this.getConversationRoom(
      tenant.organizationId ?? null,
      tenant.companyId ?? null,
      message.clientId,
    );
    this.server.to(room).emit('chat:receive', message);
  }

  @SubscribeMessage('chat:history')
  async handleHistory(
    @MessageBody() data: { clientId: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const context = this.getSocketContext(client);
      const clientId = this.parseNumeric(data?.clientId);
      if (!clientId) {
        client.emit('chat:error', { message: 'Cliente inválido.' });
        return;
      }

      // 🔒 Validar ownership antes de acceder al historial
      const clientRecord = await this.prisma.client.findUnique({
        where: { userId: clientId },
        select: { id: true, organizationId: true, companyId: true },
      });

      if (!clientRecord) {
        throw new NotFoundException('Cliente no encontrado.');
      }

      const allowedOrgIds = new Set([
        context.organizationId,
        ...context.allowedOrganizationIds,
      ]);

      if (
        allowedOrgIds.size > 0 &&
        !allowedOrgIds.has(clientRecord.organizationId)
      ) {
        throw new ForbiddenException('No autorizado para este cliente.');
      }

      const tenant = this.buildTenantContextFromSocket(context);
      const history = await this.chatService.getMessages(clientId, tenant);
      await client.join(
        this.getConversationRoom(
          context.organizationId,
          context.companyId,
          clientId,
        ),
      );
      client.emit('chat:history', history);
    } catch (error) {
      client.emit('chat:error', {
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo cargar el historial.',
      });
    }
  }

  @SubscribeMessage('chat:send')
  async handleMessage(
    @MessageBody()
    payload: {
      clientId: number;
      senderId: number;
      text: string;
      file?: string; // optional attachment from client
      tempId?: number; // temporary id for optimistic UI updates
    },
    @ConnectedSocket() client: Socket,
  ) {
    const { clientId, text, file, tempId } = payload;

    const now = Date.now();
    const entry = this.messageCounts.get(client.id);
    if (entry && now - entry.timestamp < this.INTERVAL_MS) {
      if (entry.count >= this.LIMIT) {
        client.emit('chat:rate-limit');
        return;
      }
      entry.count += 1;
    } else {
      this.messageCounts.set(client.id, { count: 1, timestamp: now });
    }

    // Persist only required fields. Extra data such as files are ignored by the
    // database but still propagated to listeners so UIs can handle them if
    // needed.
    const fakeReq = {
      ip: client.handshake.address,
      headers: { 'user-agent': client.handshake.headers['user-agent'] },
    } as Request;
    try {
      const context = this.getSocketContext(client);
      const resolvedClientId = this.parseNumeric(clientId);
      if (!resolvedClientId) {
        client.emit('chat:error', { message: 'Cliente inválido.' });
        return;
      }

      // 🔒 Validar que clientId pertenece a la organización del usuario (prevenir IDOR)
      const clientRecord = await this.prisma.client.findUnique({
        where: { userId: resolvedClientId },
        select: { id: true, organizationId: true, companyId: true },
      });

      if (!clientRecord) {
        throw new NotFoundException('Cliente no encontrado.');
      }

      const allowedOrgIds = new Set([
        context.organizationId,
        ...context.allowedOrganizationIds,
      ]);

      if (
        allowedOrgIds.size > 0 &&
        !allowedOrgIds.has(clientRecord.organizationId)
      ) {
        throw new ForbiddenException('No autorizado para este cliente.');
      }

      const tenant = this.buildTenantContextFromSocket(context);
      const message = await this.chatService.addMessage(
        {
          clientId: resolvedClientId,
          senderId: context.userId,
          text,
          file,
        },
        fakeReq,
        tenant,
      );
      const room = this.getConversationRoom(
        context.organizationId,
        context.companyId,
        resolvedClientId,
      );
      await client.join(room);
      this.server.to(room).emit('chat:receive', { ...message, tempId });
    } catch (error) {
      client.emit('chat:error', {
        message:
          error instanceof Error ? error.message : 'No se pudo enviar mensaje.',
      });
    }
  }

  @SubscribeMessage('chat:edit')
  async handleEdit(
    @MessageBody() data: { id: number; senderId: number; text: string },
    @ConnectedSocket() client: Socket,
  ) {
    const fakeReq = {
      ip: client.handshake.address,
      headers: { 'user-agent': client.handshake.headers['user-agent'] },
    } as Request;
    try {
      const context = this.getSocketContext(client);
      const tenant = this.buildTenantContextFromSocket(context);
      const updated = await this.chatService.updateMessage(
        { ...data, senderId: context.userId },
        fakeReq,
        tenant,
      );
      const room = this.getConversationRoom(
        context.organizationId,
        context.companyId,
        updated.clientId,
      );
      this.server.to(room).emit('chat:updated', updated);
    } catch (error) {
      client.emit('chat:error', {
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo actualizar mensaje.',
      });
    }
  }

  @SubscribeMessage('chat:delete')
  async handleDelete(
    @MessageBody() data: { id: number; senderId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const fakeReq = {
      ip: client.handshake.address,
      headers: { 'user-agent': client.handshake.headers['user-agent'] },
    } as Request;
    try {
      const context = this.getSocketContext(client);
      const tenant = this.buildTenantContextFromSocket(context);
      const deleted = await this.chatService.deleteMessage(
        { ...data, senderId: context.userId },
        fakeReq,
        tenant,
      );
      const room = this.getConversationRoom(
        context.organizationId,
        context.companyId,
        deleted.clientId,
      );
      this.server.to(room).emit('chat:deleted', {
        id: deleted.id,
        deletedAt: deleted.deletedAt,
      });
    } catch (error) {
      client.emit('chat:error', {
        message:
          error instanceof Error ? error.message : 'No se pudo borrar mensaje.',
      });
    }
  }

  @SubscribeMessage('chat:seen')
  async handleSeen(
    @MessageBody() data: { clientId: number; viewerId: number },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const context = this.getSocketContext(client);
      const tenant = this.buildTenantContextFromSocket(context);
      const clientId = this.parseNumeric(data?.clientId);
      if (!clientId) {
        client.emit('chat:error', { message: 'Cliente inválido.' });
        return;
      }

      // 🔒 Validar ownership antes de marcar como visto
      const clientRecord = await this.prisma.client.findUnique({
        where: { userId: clientId },
        select: { id: true, organizationId: true, companyId: true },
      });

      if (!clientRecord) {
        throw new NotFoundException('Cliente no encontrado.');
      }

      const allowedOrgIds = new Set([
        context.organizationId,
        ...context.allowedOrganizationIds,
      ]);

      if (
        allowedOrgIds.size > 0 &&
        !allowedOrgIds.has(clientRecord.organizationId)
      ) {
        throw new ForbiddenException('No autorizado para este cliente.');
      }

      const seenAt = new Date();
      await this.chatService.markAsSeen(
        clientId,
        context.userId,
        seenAt,
        tenant,
      );
      const room = this.getConversationRoom(
        context.organizationId,
        context.companyId,
        clientId,
      );
      this.server.to(room).emit('chat:seen', {
        clientId,
        viewerId: context.userId,
        seenAt,
      });
    } catch (error) {
      client.emit('chat:error', {
        message:
          error instanceof Error ? error.message : 'No se pudo marcar visto.',
      });
    }
  }

  @SubscribeMessage('chat:typing')
  handleTyping(
    @MessageBody()
    payload: {
      clientId: number;
      senderId: number;
      isTyping: boolean;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const context = this.getSocketContext(client);
      const clientId = this.parseNumeric(payload?.clientId);
      if (!clientId) {
        client.emit('chat:error', { message: 'Cliente inválido.' });
        return;
      }
      const room = this.getConversationRoom(
        context.organizationId,
        context.companyId,
        clientId,
      );
      this.server.to(room).emit('chat:typing', {
        clientId,
        senderId: context.userId,
        isTyping: Boolean(payload?.isTyping),
      });
    } catch {
      client.emit('chat:error', { message: 'No se pudo procesar typing.' });
    }
  }
}
