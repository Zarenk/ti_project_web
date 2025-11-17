import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NewsletterService {
  constructor(private prisma: PrismaService) {}

  create(email: string) {
    return this.prisma.newsletterSubscriber.create({ data: { email } });
  }
}
