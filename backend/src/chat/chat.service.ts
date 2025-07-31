import { Injectable } from '@nestjs/common';

interface Message {
  userId: number;
  text: string;
  createdAt: Date;
}

@Injectable()
export class ChatService {
  private messages: Message[] = [];

  addMessage(message: { userId: number; text: string }): Message {
    const msg = { ...message, createdAt: new Date() };
    this.messages.push(msg);
    return msg;
  }

  getMessages() {
    return this.messages;
  }
}