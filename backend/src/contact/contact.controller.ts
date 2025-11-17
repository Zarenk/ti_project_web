import { Body, Controller, Post } from '@nestjs/common';
import { ContactService } from './contact.service';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

class ContactDto {
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsString()
  @IsNotEmpty()
  asunto!: string;

  @IsString()
  @IsNotEmpty()
  mensaje!: string;
}

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  async send(@Body() dto: ContactDto) {
    await this.contactService.sendContactEmail(dto);
    return { ok: true };
  }
}
