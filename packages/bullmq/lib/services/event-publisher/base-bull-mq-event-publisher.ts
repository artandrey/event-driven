import { IEventPublisher } from '@event-driven-architecture/core';

import { BullMqEvent } from '../../events/bull-mq.event';
import { QueueRegisterService } from '../register/queue-register.service';

export abstract class BaseBullMQEventPublisher implements IEventPublisher<BullMqEvent> {
  constructor(protected readonly queueRegisterService: QueueRegisterService) {}

  publish<E extends BullMqEvent<object>>(event: E): void {
    this.queueRegisterService.get(event.queueName).add(event.name, event._serialize(), event.jobOptions);
  }

  abstract publishAll<E extends BullMqEvent<object>>(events: E[]): void;
}
