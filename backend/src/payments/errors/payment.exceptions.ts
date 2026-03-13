import {
  NotFoundException,
  ConflictException,
  GatewayTimeoutException,
  BadRequestException,
} from '@nestjs/common';

export class PaymentNotFoundException extends NotFoundException {
  constructor(identifier: string) {
    super(`Orden de pago no encontrada: ${identifier}`);
  }
}

export class PaymentAlreadyProcessedException extends ConflictException {
  constructor(code: string) {
    super(`La orden de pago ${code} ya fue procesada`);
  }
}

export class PaymentProviderTimeoutException extends GatewayTimeoutException {
  constructor(provider: string) {
    super(`El proveedor de pagos ${provider} no respondió a tiempo`);
  }
}

export class PaymentInvalidTransitionException extends BadRequestException {
  constructor(from: string, event: string) {
    super(
      `Transición de pago inválida: estado "${from}" no permite el evento "${event}"`,
    );
  }
}
