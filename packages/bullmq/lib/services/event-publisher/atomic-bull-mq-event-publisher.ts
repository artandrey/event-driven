import { BullMqEvent } from '../../events/bull-mq.event';
import { FanoutRouter } from '../fanout-router/fanout-router';
import { FlowRegisterService } from '../register';
import { QueueRegisterService } from '../register/queue-register.service';
import { BaseBullMQEventPublisher } from './base-bull-mq-event-publisher';

/**
 * This implementation adds each job individually.
 * This is less efficient than the bulk implementation.
 * But in case one job will be failed to be be added, other jobs will be added successfully.
 */
export class AtomicBullMqEventPublisher extends BaseBullMQEventPublisher {
  constructor(
    queueRegisterService: QueueRegisterService,
    flowRegisterService: FlowRegisterService,
    fanoutRouter: FanoutRouter,
  ) {
    super(queueRegisterService, flowRegisterService, fanoutRouter);
  }

  publishAll<E extends BullMqEvent<object>>(events: E[]): void {
    for (const event of events) {
      this.publish(event);
    }
  }
}
