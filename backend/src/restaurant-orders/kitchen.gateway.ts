import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { PrismaService } from 'src/prisma/prisma.service';
import { isAllowedOrigin } from 'src/common/cors/allowed-origins';
import * as jwt from 'jsonwebtoken';

interface KitchenSocketContext {
  userId: number;
  organizationId: number | null;
  companyId: number | null;
}

@Injectable()
@WebSocketGateway({
  namespace: '/kitchen',
  cors: {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  },
})
export class KitchenGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server!: Server;

  private logger = new Logger('KitchenGateway');
  private prisma!: PrismaService;

  constructor(private readonly moduleRef: ModuleRef) {}

  afterInit() {
    try {
      this.prisma = this.moduleRef.get(PrismaService, { strict: false });
      this.logger.log('KitchenGateway initialized');
    } catch (error) {
      this.logger.error(
        `Failed to resolve PrismaService: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async handleConnection(client: Socket) {
    try {
      const context = await this.resolveContext(client);
      client.data.kitchenContext = context;

      // Join tenant room so broadcasts are scoped
      const room = this.buildRoom(context.organizationId, context.companyId);
      client.join(room);
      this.logger.log(
        `Kitchen socket ${client.id} connected (room=${room})`,
      );
    } catch (error) {
      this.logger.warn(
        `Kitchen connection rejected: ${error instanceof Error ? error.message : String(error)}`,
      );
      client.emit('kitchen:error', {
        message:
          error instanceof Error ? error.message : 'No autorizado.',
      });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Kitchen socket ${client.id} disconnected`);
    delete client.data.kitchenContext;
  }

  // ── Public methods called by RestaurantOrdersService ──

  /** Broadcast when an order is created or its status changes */
  emitOrderUpdate(
    organizationId: number | null,
    companyId: number | null,
    payload: {
      orderId: number;
      status: string;
      action: 'created' | 'updated' | 'checkout' | 'item_updated';
    },
  ) {
    const room = this.buildRoom(organizationId, companyId);
    this.server?.to(room).emit('kitchen:order_update', payload);
    this.logger.debug(
      `kitchen:order_update → room=${room} orderId=${payload.orderId} action=${payload.action}`,
    );
  }

  /** Broadcast when a table status changes */
  emitTableUpdate(
    organizationId: number | null,
    companyId: number | null,
    payload: { tableId: number; status: string },
  ) {
    const room = this.buildRoom(organizationId, companyId);
    this.server?.to(room).emit('kitchen:table_update', payload);
  }

  // ── Private helpers ──

  private buildRoom(
    organizationId: number | null,
    companyId: number | null,
  ): string {
    return `kitchen:org:${organizationId ?? 0}:co:${companyId ?? 0}`;
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

  private parseNumeric(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private async resolveContext(client: Socket): Promise<KitchenSocketContext> {
    const authPayload =
      (client.handshake.auth as Record<string, unknown> | undefined) ?? {};

    const token = this.resolveToken(client);
    if (!token) {
      throw new UnauthorizedException('Token requerido.');
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new UnauthorizedException('JWT secret no configurado.');
    }

    let payload: { sub?: number; tokenVersion?: number };
    try {
      payload = jwt.verify(token, secret) as any;
    } catch {
      throw new UnauthorizedException('Token invalido o expirado.');
    }

    const userId = this.parseNumeric(payload?.sub);
    if (!userId) {
      throw new UnauthorizedException('Token invalido.');
    }

    // Verify user exists and token version matches
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, tokenVersion: true },
    });
    if (!user || user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException('Sesion expirada.');
    }

    // Resolve org/company from handshake
    const organizationId =
      this.parseNumeric(authPayload.orgId) ??
      this.parseNumeric(client.handshake.headers['x-org-id']) ??
      null;
    const companyId =
      this.parseNumeric(authPayload.companyId) ??
      this.parseNumeric(client.handshake.headers['x-company-id']) ??
      null;

    return { userId, organizationId, companyId };
  }
}
