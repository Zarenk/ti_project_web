import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})

export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  constructor(private chatService: ChatService) {}

  async handleConnection() {}

  @SubscribeMessage('chat:history')
  async handleHistory(
    @MessageBody() data: { clientId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const history = await this.chatService.getMessages(data.clientId);
    client.emit('chat:history', history);
  }

  @SubscribeMessage('chat:send')
  async handleMessage(
    @MessageBody() payload: {
      clientId: number;
      senderId: number;
      text: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const message = await this.chatService.addMessage(payload);
    this.server.emit('chat:receive', message);
  }

  @SubscribeMessage('chat:seen')
  async handleSeen(
    @MessageBody() data: { clientId: number; viewerId: number },
  ) {
    const seenAt = new Date();
    await this.chatService.markAsSeen(data.clientId, data.viewerId, seenAt);
    this.server.emit('chat:seen', {
      clientId: data.clientId,
      viewerId: data.viewerId,
      seenAt,
    });
  }

  @SubscribeMessage('chat:typing')
  handleTyping(
    @MessageBody()
    payload: { clientId: number; senderId: number; isTyping: boolean },
  ) {
    this.server.emit('chat:typing', payload);
  }
}