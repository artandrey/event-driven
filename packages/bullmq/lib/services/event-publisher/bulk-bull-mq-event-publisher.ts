import { BullMqEvent } from '../../events/bull-mq.event';
import { QueueRegisterService } from '../register/queue-register.service';
import { BaseBullMQEventPublisher } from './base-bull-mq-event-publisher';

/**
 * This implementation utilizes the `addBulk` method of the `Queue` class.
 * This is more efficient than adding each job individually.
 * But in that case, if one job will be failed to be be added, other jobs will be also failed to be added.
 * Also, if repeat option is provided in the job options, it will be ignored due to the `addBulk` method behaviour.
 */
export class BulkBullMqEventPublisher extends BaseBullMQEventPublisher {
  constructor(queueRegisterService: QueueRegisterService) {
    super(queueRegisterService);
  }

  publishAll<E extends BullMqEvent<object>>(events: E[]): void {
    const eventQueueNameEventsMap = events.reduce((acc, event) => {
      acc.set(event.queueName, [...(acc.get(event.queueName) || []), event]);
      return acc;
    }, new Map<string, E[]>());

    for (const [queueName, events] of eventQueueNameEventsMap.entries()) {
      this.queueRegisterService
        .get(queueName)
        .addBulk(events.map((event) => ({ name: event.name, data: event.payload, opts: event.jobOptions })));
    }
  }
}
