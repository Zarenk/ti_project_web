import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  OnGatewayConnection,
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

  async handleConnection(client: Socket) {
    const history = await this.chatService.getMessages();
    client.emit('chat:history', history);
  }

  @SubscribeMessage('chat:send')
  async handleMessage(@MessageBody() payload: { userId: number; text: string }) {
    const message = await this.chatService.addMessage(payload);
    this.server.emit('chat:receive', message);
  }
}