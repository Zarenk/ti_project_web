import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, OnGatewayConnection } from '@nestjs/websockets';
import { Server } from 'socket.io';
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

  handleConnection() {
    const history = this.chatService.getMessages();
    this.server.emit('chat:history', history);
  }

  @SubscribeMessage('chat:send')
  handleMessage(@MessageBody() payload: { userId: number; text: string }) {
    const message = this.chatService.addMessage(payload);
    this.server.emit('chat:receive', message);
  }
}