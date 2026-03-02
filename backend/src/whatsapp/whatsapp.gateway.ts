import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

interface WhatsAppClient extends Socket {
  organizationId?: number;
  companyId?: number;
}

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.FRONTEND_URL || '',
    ],
    credentials: true,
  },
  namespace: '/whatsapp',
})
export class WhatsAppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(WhatsAppGateway.name);

  // ============================================================================
  // CONNECTION LIFECYCLE
  // ============================================================================

  handleConnection(client: WhatsAppClient) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: WhatsAppClient) {
    this.logger.log(`Client disconnected: ${client.id}`);

    if (client.organizationId && client.companyId) {
      const room = this.getTenantRoom(client.organizationId, client.companyId);
      client.leave(room);
    }
  }

  // ============================================================================
  // ROOM MANAGEMENT (Tenant Isolation)
  // ============================================================================

  @SubscribeMessage('join')
  handleJoinRoom(
    @ConnectedSocket() client: WhatsAppClient,
    @MessageBody() data: { organizationId: number; companyId: number },
  ) {
    const { organizationId, companyId } = data;
    const room = this.getTenantRoom(organizationId, companyId);

    // Store tenant info in socket
    client.organizationId = organizationId;
    client.companyId = companyId;

    // Join tenant-specific room
    client.join(room);

    this.logger.log(`Client ${client.id} joined room: ${room}`);

    client.emit('joined', { room, organizationId, companyId });
  }

  @SubscribeMessage('leave')
  handleLeaveRoom(@ConnectedSocket() client: WhatsAppClient) {
    if (client.organizationId && client.companyId) {
      const room = this.getTenantRoom(client.organizationId, client.companyId);
      client.leave(room);

      this.logger.log(`Client ${client.id} left room: ${room}`);

      client.organizationId = undefined;
      client.companyId = undefined;

      client.emit('left', { room });
    }
  }

  // ============================================================================
  // EVENT LISTENERS - WhatsApp Service Events
  // ============================================================================

  @OnEvent('whatsapp.qr')
  handleQRCode(payload: {
    organizationId: number;
    companyId: number;
    qrCode: string;
  }) {
    const { organizationId, companyId, qrCode } = payload;
    const room = this.getTenantRoom(organizationId, companyId);

    this.logger.log(`Broadcasting QR code to room: ${room}`);

    this.server.to(room).emit('qr', {
      qrCode,
      timestamp: new Date().toISOString(),
    });
  }

  @OnEvent('whatsapp.connected')
  handleConnected(payload: {
    organizationId: number;
    companyId: number;
    phoneNumber: string;
  }) {
    const { organizationId, companyId, phoneNumber } = payload;
    const room = this.getTenantRoom(organizationId, companyId);

    this.logger.log(`Broadcasting connection success to room: ${room}`);

    this.server.to(room).emit('connected', {
      phoneNumber,
      status: 'CONNECTED',
      timestamp: new Date().toISOString(),
    });
  }

  @OnEvent('whatsapp.disconnected')
  handleDisconnected(payload: {
    organizationId: number;
    companyId: number;
    reason?: string;
  }) {
    const { organizationId, companyId, reason } = payload;
    const room = this.getTenantRoom(organizationId, companyId);

    this.logger.log(`Broadcasting disconnection to room: ${room}`);

    this.server.to(room).emit('disconnected', {
      status: 'DISCONNECTED',
      reason,
      timestamp: new Date().toISOString(),
    });
  }

  @OnEvent('whatsapp.message.received')
  handleIncomingMessage(payload: {
    organizationId: number;
    companyId: number;
    message: {
      id: number;
      remoteJid: string;
      content: string;
      messageType: string;
      mediaUrl?: string;
      sentAt: Date;
    };
  }) {
    const { organizationId, companyId, message } = payload;
    const room = this.getTenantRoom(organizationId, companyId);

    this.logger.log(`Broadcasting incoming message to room: ${room}`);

    this.server.to(room).emit('message', {
      ...message,
      timestamp: new Date().toISOString(),
    });
  }

  @OnEvent('whatsapp.message.sent')
  handleSentMessage(payload: {
    organizationId: number;
    companyId: number;
    message: {
      id: number;
      to: string;
      content: string;
      status: string;
    };
  }) {
    const { organizationId, companyId, message } = payload;
    const room = this.getTenantRoom(organizationId, companyId);

    this.logger.log(`Broadcasting sent message status to room: ${room}`);

    this.server.to(room).emit('message-sent', {
      ...message,
      timestamp: new Date().toISOString(),
    });
  }

  @OnEvent('whatsapp.message.failed')
  handleFailedMessage(payload: {
    organizationId: number;
    companyId: number;
    error: string;
    to: string;
  }) {
    const { organizationId, companyId, error, to } = payload;
    const room = this.getTenantRoom(organizationId, companyId);

    this.logger.warn(`Broadcasting message failure to room: ${room}`);

    this.server.to(room).emit('message-failed', {
      error,
      to,
      timestamp: new Date().toISOString(),
    });
  }

  @OnEvent('whatsapp.automation.triggered')
  handleAutomationTriggered(payload: {
    organizationId: number;
    companyId: number;
    automation: {
      id: number;
      name: string;
      event: string;
      recipient: string;
    };
  }) {
    const { organizationId, companyId, automation } = payload;
    const room = this.getTenantRoom(organizationId, companyId);

    this.logger.log(`Broadcasting automation trigger to room: ${room}`);

    this.server.to(room).emit('automation-triggered', {
      ...automation,
      timestamp: new Date().toISOString(),
    });
  }

  @OnEvent('whatsapp.status.update')
  handleStatusUpdate(payload: {
    organizationId: number;
    companyId: number;
    status: string;
    details?: any;
  }) {
    const { organizationId, companyId, status, details } = payload;
    const room = this.getTenantRoom(organizationId, companyId);

    this.logger.log(`Broadcasting status update to room: ${room}`);

    this.server.to(room).emit('status-update', {
      status,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private getTenantRoom(organizationId: number, companyId: number): string {
    return `whatsapp:${organizationId}:${companyId}`;
  }

  /**
   * Broadcast custom event to specific tenant room
   * Can be called from services
   */
  broadcastToTenant(
    organizationId: number,
    companyId: number,
    event: string,
    data: any,
  ) {
    const room = this.getTenantRoom(organizationId, companyId);
    this.server.to(room).emit(event, data);
  }

  /**
   * Get all connected clients for a tenant
   */
  async getConnectedClients(
    organizationId: number,
    companyId: number,
  ): Promise<number> {
    const room = this.getTenantRoom(organizationId, companyId);
    const sockets = await this.server.in(room).fetchSockets();
    return sockets.length;
  }
}
