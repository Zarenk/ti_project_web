import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { isAllowedOrigin } from 'src/common/cors/allowed-origins';

type ContextChangePayload = {
  orgId: number;
  companyId: number | null;
  updatedAt: string;
};

@WebSocketGateway({
  namespace: '/context',
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
export class ContextEventsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ContextEventsGateway.name);
  private readonly connections = new Map<number, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const userId = await this.resolveUserIdFromToken(client);
      if (userId === null) {
        this.logger.warn(
          `Socket ${client.id} rejected: no valid JWT token.`,
        );
        client.disconnect(true);
        return;
      }
      const existing = this.connections.get(userId) ?? new Set<string>();
      existing.add(client.id);
      this.connections.set(userId, existing);
      this.logger.debug(
        `Socket ${client.id} subscribed to context events for user ${userId}`,
      );
    } catch (error) {
      this.logger.warn(
        `Socket ${client.id} rejected: ${error instanceof Error ? error.message : String(error)}`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    for (const [userId, sockets] of this.connections) {
      if (sockets.delete(client.id)) {
        if (sockets.size === 0) {
          this.connections.delete(userId);
        }
        this.logger.debug(
          `Socket ${client.id} disconnected from user ${userId}`,
        );
        break;
      }
    }
  }

  emitContextChanged(userId: number, payload: ContextChangePayload) {
    const sockets = this.connections.get(userId);
    if (!sockets || sockets.size === 0) {
      return;
    }
    for (const socketId of sockets) {
      this.server.to(socketId).emit('context:changed', payload);
    }
  }

  @SubscribeMessage('context:ping')
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
    client.emit('context:pong', body ?? {});
  }

  private async resolveUserIdFromToken(client: Socket): Promise<number | null> {
    const token = this.resolveToken(client);
    if (!token) return null;

    const secret = this.configService.get<string>('JWT_SECRET');
    const payload = await this.jwtService.verifyAsync<{ sub?: number }>(
      token,
      { secret },
    );
    return this.normalizeId(payload?.sub);
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

  private normalizeId(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }
}
