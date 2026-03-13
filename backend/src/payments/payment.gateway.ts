import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { isAllowedOrigin } from '../common/cors/allowed-origins';

@WebSocketGateway({
  namespace: '/payments',
  cors: {
    origin: (
      origin: string | undefined,
      cb: (err: Error | null, ok?: boolean) => void,
    ) => {
      if (isAllowedOrigin(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  },
})
export class PaymentGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(PaymentGateway.name);

  handleConnection(client: Socket): void {
    const orgId = client.handshake.query.orgId as string | undefined;
    const companyId = client.handshake.query.companyId as string | undefined;

    if (!orgId) {
      client.disconnect(true);
      return;
    }

    const room = this.buildRoom(orgId, companyId);
    client.join(room);
    this.logger.debug(`Client ${client.id} joined room ${room}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Client ${client.id} disconnected`);
  }

  emitStatusUpdate(
    orgId: number,
    companyId: number | null,
    payload: {
      paymentOrderId: number;
      code: string;
      status: string;
      previousStatus: string;
      provider: string;
      amount: number;
      completedAt?: string;
    },
  ): void {
    const room = this.buildRoom(String(orgId), companyId ? String(companyId) : undefined);
    this.server?.to(room).emit('payment:status_updated', payload);
  }

  private buildRoom(orgId: string, companyId?: string): string {
    return `payments-org-${orgId}-company-${companyId ?? 'all'}`;
  }
}
