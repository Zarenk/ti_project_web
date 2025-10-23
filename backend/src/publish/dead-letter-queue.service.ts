import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DeadLetterQueueService {
  private readonly logger = new Logger(DeadLetterQueueService.name);
  private readonly messages: any[] = [];

  add(job: any, error: Error) {
    this.logger.error(`Sending job to DLQ: ${error.message}`, error.stack);
    this.messages.push({ job, error: error.message });
  }

  getAll() {
    return this.messages;
  }
}
