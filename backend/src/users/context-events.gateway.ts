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

type ContextChangePayload = {
  orgId: number;
  companyId: number | null;
  updatedAt: string;
};

@WebSocketGateway({
  namespace: '/context',
  cors: {
    origin: '*',
  },
})
export class ContextEventsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ContextEventsGateway.name);
  private readonly connections = new Map<number, Set<string>>();

  handleConnection(client: Socket) {
    const userId = this.resolveUserId(client);
    if (userId === null) {
      this.logger.warn(
        `Socket ${client.id} attempted to connect without userId.`,
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

  private resolveUserId(client: Socket): number | null {
    const raw =
      client.handshake.auth?.userId ?? client.handshake.query?.['userId'];
    if (Array.isArray(raw)) {
      return this.normalizeId(raw[0]);
    }
    return this.normalizeId(raw);
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
