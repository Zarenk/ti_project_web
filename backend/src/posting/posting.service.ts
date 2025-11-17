import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class PostingService {
  private validatePayload(payload: unknown) {
    if (!payload) {
      throw new BadRequestException('Payload is required');
    }
  }

  async post(payload: unknown) {
    this.validatePayload(payload);
    // TODO: implement POST intent handling
  }

  async cogs(payload: unknown) {
    this.validatePayload(payload);
    // TODO: implement COGS intent handling
  }

  async payment(payload: unknown) {
    this.validatePayload(payload);
    // TODO: implement PAYMENT intent handling
  }

  async adjust(payload: unknown) {
    this.validatePayload(payload);
    // TODO: implement ADJUST intent handling
  }

  async note(payload: unknown) {
    this.validatePayload(payload);
    // TODO: implement NOTE intent handling
  }
}
