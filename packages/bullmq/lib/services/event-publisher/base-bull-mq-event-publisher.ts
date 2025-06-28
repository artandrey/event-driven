import { EventPublisher } from '@event-driven-architecture/core';
import { FlowJob, FlowProducer, JobsOptions } from 'bullmq';

import { BullMqFanoutEvent } from '../../events/bull-mq-fanout.event';
import { BullMqFlowEvent } from '../../events/bull-mq-flow.event';
import { BullMqEvent } from '../../events/bull-mq.event';
import { FanoutQueueRoute, FanoutRouter } from '../fanout-router/fanout-router';
import { FlowRegisterService, QueueRegisterService } from '../register';

export abstract class BaseBullMQEventPublisher implements EventPublisher<BullMqEvent> {
  constructor(
    protected readonly queueRegisterService: QueueRegisterService,
    protected readonly flowRegisterService: FlowRegisterService,
    protected readonly fanoutRouter: FanoutRouter,
  ) {}

  publish<E extends BullMqEvent<object>>(event: E): void {
    if (event instanceof BullMqFlowEvent) {
      this.getCorrespondFlowProducer(event).add(this.mapFlowEventToFlowJob(event));
    } else if (event instanceof BullMqFanoutEvent) {
      const route = this.fanoutRouter.getRoute(event.constructor);
      if (route) {
        route.queues.forEach((queueRoute) => {
          const jobOptions = this.resolveJobOptions(event, queueRoute);
          this.queueRegisterService.get(queueRoute.name).add(event.$name, event._serialize(), jobOptions);
        });
      } else {
        throw new Error(`No route found for event: ${event.$name}`);
      }
    } else {
      this.queueRegisterService.get(event.$queueName).add(event.$name, event._serialize(), event.$jobOptions);
    }
  }

  abstract publishAll<E extends BullMqEvent<object>>(events: E[]): void;

  protected resolveJobOptions(event: BullMqFanoutEvent, queueRoute: FanoutQueueRoute): JobsOptions | undefined {
    if (!('jobOptions' in queueRoute)) {
      return event.$jobOptions;
    }

    if (queueRoute.jobOptionsStrategy === 'rewrite') {
      return queueRoute.jobOptions;
    } else {
      return {
        ...event.$jobOptions,
        ...queueRoute.jobOptions,
      };
    }
  }

  protected mapFlowEventToFlowJob(event: BullMqFlowEvent<object>): FlowJob {
    return {
      name: event.$name,
      data: event._serialize(),
      queueName: event.$queueName,
      prefix: event.$prefix,
      opts: event.$jobOptions,
      children: event.$children?.map((child) => {
        if (child instanceof BullMqFlowEvent) {
          return this.mapFlowEventToFlowJob(child);
        } else {
          return this.mapEventToFlowJob(child);
        }
      }),
    };
  }

  protected getCorrespondFlowProducer(event: BullMqFlowEvent<object>): FlowProducer {
    if (event.$flowName) {
      return this.flowRegisterService.getNamed(event.$flowName);
    } else {
      return this.flowRegisterService.getDefault();
    }
  }

  protected mapEventToFlowJob(event: BullMqEvent<object>): FlowJob {
    return {
      name: event.$name,
      data: event._serialize(),
      queueName: event.$queueName,
      opts: event.$jobOptions,
    };
  }
}
