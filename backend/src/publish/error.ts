import { HttpException } from '@nestjs/common';

export class TransientError extends HttpException {
  constructor(message: string, status = 503) {
    super(message, status);
  }
}

export class PermanentError extends HttpException {
  constructor(message: string, status = 400) {
    super(message, status);
  }
}
