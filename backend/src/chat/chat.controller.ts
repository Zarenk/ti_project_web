import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  create(@Body() dto: CreateChatDto) {
    return this.chatService.addMessage(dto);
  }

  @Get('unanswered')
  findUnanswered() {
    return this.chatService.getUnansweredMessages();
  }

  @Get(':clientId')
  findAll(@Param('clientId', ParseIntPipe) clientId: number) {
    return this.chatService.getMessages(clientId);
  }
}
