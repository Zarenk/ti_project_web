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
    @MessageBody()
    payload: {
      clientId: number;
      senderId: number;
      text: string;
      file?: string; // optional attachment from client
    },
    @ConnectedSocket() client: Socket,
  ) {
    const { clientId, senderId, text, file } = payload;
    // Persist only required fields. Extra data such as files are ignored by the
    // database but still propagated to listeners so UIs can handle them if
    // needed.
    const message = await this.chatService.addMessage({
      clientId,
      senderId,
      text,
    });
    this.server.emit('chat:receive', { ...message, file });
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