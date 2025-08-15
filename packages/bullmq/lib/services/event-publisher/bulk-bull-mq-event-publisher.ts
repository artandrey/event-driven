import { JobsOptions } from 'bullmq';

import { BullMqBaseTask, BullMqFlowTask } from '../../tasks';
import { BullMqFanoutTask } from '../../tasks/bull-mq-fanout.task';
import { BullMqTask } from '../../tasks/bull-mq.task';
import { FanoutRouter } from '../fanout-router/fanout-router';
import { FlowRegisterService } from '../register';
import { QueueRegisterService } from '../register/queue-register.service';
import { BaseBullMQEventPublisher } from './base-bull-mq-event-publisher';

export interface QueuePublishable {
  name: string;
  data: object;
  opts: JobsOptions | undefined;
}

/**
 * This implementation utilizes the `addBulk` method of the `Queue` class.
 * This is more efficient than adding each job individually.
 * But in that case, if one job will be failed to be be added, other jobs will be also failed to be added.
 * Also, if repeat option is provided in the job options, it will be ignored due to the `addBulk` method behaviour.
 */
export class BulkBullMqEventPublisher extends BaseBullMQEventPublisher {
  constructor(
    queueRegisterService: QueueRegisterService,
    flowRegisterService: FlowRegisterService,
    fanoutRouter: FanoutRouter,
  ) {
    super(queueRegisterService, flowRegisterService, fanoutRouter);
  }

  publishAll<E extends BullMqBaseTask<object>>(events: E[]): void {
    const eventTypeEventsMap = events.reduce(
      (acc, event) => {
        if (event instanceof BullMqFanoutTask) {
          acc.fanout.push(event);
        } else if (event instanceof BullMqFlowTask) {
          acc.flow.push(event);
        } else if (event instanceof BullMqTask) {
          acc.queue.push(event);
        } else {
          throw new Error(`Unexpected event type: ${event.constructor.name}`);
        }
        return acc;
      },
      {
        fanout: [] as BullMqFanoutTask[],
        flow: [] as BullMqFlowTask[],
        queue: [] as BullMqTask[],
      },
    );

    this.publishFlowEvents(eventTypeEventsMap.flow);
    this.publishQueueEvents(eventTypeEventsMap.queue, eventTypeEventsMap.fanout);
  }

  private publishFlowEvents(events: BullMqFlowTask[]): void {
    const eventFlowNameEventsMap = events.reduce((acc, event) => {
      acc.set(event.$flowName, [...(acc.get(event.$flowName) || []), event]);
      return acc;
    }, new Map<string | null, BullMqFlowTask[]>());

    for (const events of eventFlowNameEventsMap.values()) {
      const flowProducer = this.getCorrespondFlowProducer(events[0]);
      flowProducer.addBulk(events.map((event) => this.mapFlowEventToFlowJob(event)));
    }
  }

  publishQueueEvents(queueEvents: BullMqTask<object>[], fanoutEvents: BullMqFanoutTask<object>[]): void {
    const queueQueuePublishableMap = new Map<string, QueuePublishable[]>();

    queueEvents.forEach((event) => {
      const queueName = event.$queueName;
      const publishable = {
        name: event.$name,
        data: event._serialize(),
        opts: event.$jobOptions,
      };

      if (queueQueuePublishableMap.has(queueName)) {
        queueQueuePublishableMap.get(queueName)?.push(publishable);
      } else {
        queueQueuePublishableMap.set(queueName, [publishable]);
      }
    });

    fanoutEvents.forEach((event) => {
      const route = this.fanoutRouter.getRoute(event.constructor);
      if (!route) {
        throw new Error(`No route found for fanout event: ${event.$name}`);
      }

      route.queues.forEach((queueRoute) => {
        const jobOptions = this.resolveJobOptions(event, queueRoute);
        const publishable = {
          name: event.$name,
          data: event._serialize(),
          opts: jobOptions,
        };

        if (queueQueuePublishableMap.has(queueRoute.name)) {
          queueQueuePublishableMap.get(queueRoute.name)?.push(publishable);
        } else {
          queueQueuePublishableMap.set(queueRoute.name, [publishable]);
        }
      });
    });

    for (const [queueName, publishables] of queueQueuePublishableMap.entries()) {
      this.queueRegisterService.get(queueName).addBulk(publishables);
    }
  }
}
