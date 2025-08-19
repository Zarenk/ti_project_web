import { Injectable } from '@nestjs/common';

export interface PublishLog {
  externalId: string;
  response: string;
}

@Injectable()
export class PublishLogService {
  private readonly logs: PublishLog[] = [];

  create(log: PublishLog) {
    this.logs.push(log);
  }

  all() {
    return this.logs;
  }
}
