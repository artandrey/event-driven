import { IEventPublisher } from '@event-driven-architecture/core';
import { FlowJob } from 'bullmq';

import { BullMqFlowEvent } from '../../events/bull-mq-flow.event';
import { BullMqEvent } from '../../events/bull-mq.event';
import { FlowRegisterService, QueueRegisterService } from '../register';

export abstract class BaseBullMQEventPublisher implements IEventPublisher<BullMqEvent> {
  constructor(
    protected readonly queueRegisterService: QueueRegisterService,
    protected readonly flowRegisterService: FlowRegisterService,
  ) {}

  publish<E extends BullMqEvent<object>>(event: E): void {
    if (event instanceof BullMqFlowEvent) {
      if (event.$flowName) {
        this.flowRegisterService.getNamed(event.$flowName).add(this.mapFlowEventToFlowJob(event));
      } else {
        this.flowRegisterService.getSingleton().add(this.mapFlowEventToFlowJob(event));
      }
    } else {
      this.queueRegisterService.get(event.queueName).add(event.name, event._serialize(), event.jobOptions);
    }
  }

  abstract publishAll<E extends BullMqEvent<object>>(events: E[]): void;

  protected mapFlowEventToFlowJob(event: BullMqFlowEvent<object>): FlowJob {
    return {
      name: event.name,
      data: event._serialize(),
      queueName: event.queueName,
      prefix: event.$prefix,
      opts: event.jobOptions,
      children: event.$children?.map((child) => {
        if (child instanceof BullMqFlowEvent) {
          return this.mapFlowEventToFlowJob(child);
        } else {
          return this.mapEventToFlowJob(child);
        }
      }),
    };
  }

  protected mapEventToFlowJob(event: BullMqEvent<object>): FlowJob {
    return {
      name: event.name,
      data: event._serialize(),
      queueName: event.queueName,
      opts: event.jobOptions,
    };
  }
}
