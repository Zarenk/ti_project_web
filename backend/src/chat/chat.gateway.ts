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
    @MessageBody() data: { userId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const history = await this.chatService.getMessages(data.userId);
    client.emit('chat:history', history);
  }

  @SubscribeMessage('chat:send')
  async handleMessage(
    @MessageBody() payload: { userId: number; text: string },
    @ConnectedSocket() client: Socket,
  ) {
    const message = await this.chatService.addMessage(payload);
    client.emit('chat:receive', message);
  }
}