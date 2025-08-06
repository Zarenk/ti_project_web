import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { ChatGateway } from './chat.gateway';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Post()
  async create(@Body() dto: CreateChatDto) {
    const message = await this.chatService.addMessage(dto);
    this.chatGateway.server.emit('chat:receive', message);
    return message;
  }

  @Get('unanswered')
  async findUnanswered(): Promise<{ clientId: number; count: number }[]> {
    return this.chatService.getUnansweredMessages();
  }

  @Get(':clientId')
  findAll(@Param('clientId', ParseIntPipe) clientId: number) {
    return this.chatService.getMessages(clientId);
  }
}
