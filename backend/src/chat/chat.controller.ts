import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { ChatGateway } from './chat.gateway';
import { CurrentTenant } from 'src/tenancy/tenant-context.decorator';
import { TenantContext } from 'src/tenancy/tenant-context.interface';
import { JwtAuthGuard } from 'src/users/jwt-auth.guard';
import { TenantRequiredGuard } from 'src/common/guards/tenant-required.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Post()
  async create(
    @Body() dto: CreateChatDto,
    @Req() req: Request,
    @CurrentTenant() tenant: TenantContext | null,
    @CurrentTenant('userId') userId: number | null,
  ) {
    const message = await this.chatService.addMessage(
      { ...dto, senderId: userId ?? dto.senderId },
      req,
      tenant ?? undefined,
    );
    this.chatGateway.emitMessageToConversation(message, tenant ?? undefined);
    return message;
  }

  @Get('unanswered')
  async findUnanswered(
    @CurrentTenant() tenant: TenantContext | null,
  ): Promise<{ clientId: number; count: number }[]> {
    return this.chatService.getUnansweredMessages(tenant ?? undefined);
  }

  @Get(':clientId')
  findAll(
    @Param('clientId', ParseIntPipe) clientId: number,
    @CurrentTenant() tenant: TenantContext | null,
  ) {
    return this.chatService.getMessages(clientId, tenant ?? undefined);
  }
}
