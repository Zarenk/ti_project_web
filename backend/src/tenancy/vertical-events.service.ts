import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { BusinessVertical } from 'src/types/business-vertical.enum';

export interface VerticalChangedEvent {
  organizationId?: number | null;
  companyId?: number | null;
  previousVertical: BusinessVertical;
  newVertical: BusinessVertical;
}

export interface VerticalConfigInvalidatedEvent {
  organizationId?: number | null;
  companyId: number;
}

@Injectable()
export class VerticalEventsService {
  private readonly emitter = new EventEmitter();

  emitChanged(payload: VerticalChangedEvent): void {
    this.emitter.emit('vertical.changed', payload);
  }

  onChanged(listener: (payload: VerticalChangedEvent) => void): void {
    this.emitter.on('vertical.changed', listener);
  }

  offChanged(listener: (payload: VerticalChangedEvent) => void): void {
    this.emitter.off('vertical.changed', listener);
  }

  emitConfigInvalidated(payload: VerticalConfigInvalidatedEvent): void {
    this.emitter.emit('vertical.config.invalidated', payload);
  }

  onConfigInvalidated(
    listener: (payload: VerticalConfigInvalidatedEvent) => void,
  ): void {
    this.emitter.on('vertical.config.invalidated', listener);
  }

  offConfigInvalidated(
    listener: (payload: VerticalConfigInvalidatedEvent) => void,
  ): void {
    this.emitter.off('vertical.config.invalidated', listener);
  }
}
