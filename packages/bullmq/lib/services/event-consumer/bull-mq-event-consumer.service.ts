import { EventBus, HandlerRegister, Type } from '@event-driven-architecture/core';
import { FlowJob, Job, Processor, WorkerOptions } from 'bullmq';

import { BullMqHandlerContext } from '../../interfaces/bull-mq-handler-context.interface';
import { BullMqFanoutTask, BullMqFlowTask } from '../../tasks';
import { BullMqTask } from '../../tasks/bull-mq.task';
import {
  isBullMqEventRoutingMetadata,
  mapBullMqEventToRoutingMetadata,
} from '../../util/map-bull-mq-event-to-routing-metadata';
import { EventsRegisterService } from '../register/events-register.service';
import { QueueRegisterService } from '../register/queue-register.service';
import { WorkerRegisterService } from '../register/workers-register.service';
import { WorkerService } from '../worker/worker.service';

export interface BullMqEventConsumerOptions {
  queueName: string;
  workerOptions: WorkerOptions;
}

export class BullMqEventConsumerService<THandlable extends BullMqTask = BullMqTask> {
  constructor(
    private readonly workerRegisterService: WorkerRegisterService,
    private readonly queueRegisterService: QueueRegisterService,
    private readonly eventsRegisterService: EventsRegisterService,
    private readonly consumerOptions: BullMqEventConsumerOptions[],
    private readonly workerService: WorkerService,
    private readonly eventBus: EventBus<THandlable>,
    private readonly handlerRegisterService: HandlerRegister,
  ) {}

  public init() {
    this.consumerOptions.forEach((consumerOptions) => {
      this.workerService.createWorker(consumerOptions.queueName, this.handleJob, consumerOptions.workerOptions);
    });

    this.handlerRegisterService
      .getHandlerSignatures()
      .filter((handlerSignature) => isBullMqEventRoutingMetadata(handlerSignature.routingMetadata))
      .forEach((handlerSignature) => {
        this.eventsRegisterService.register(handlerSignature.handles as Type<BullMqTask>);
      });
  }

  private handleJob: Processor = async (job: Job, token?: string) => {
    const event = this.mapJobToEvent(job);
    const result = await this.eventBus.synchronouslyConsumeByStrictlySingleHandler(event, {
      context: this.createBullMqHandlerContext(job, token),
      routingMetadata: mapBullMqEventToRoutingMetadata(event),
    });

    return result.getValueOrThrow();
  };

  private mapJobToEvent(job: Job | FlowJob): THandlable {
    const EventClass = this.eventsRegisterService.getType({
      queueName: job.queueName,
      name: job.name,
    });

    if (!EventClass) {
      throw new Error(`Event type not found for queue: ${job.queueName}, name: ${job.name}`);
    }

    const eventInstance = Object.create(EventClass.prototype) as THandlable;

    Object.assign(eventInstance, {
      _queueName: job.queueName,
      _name: job.name,
      _jobOptions: job.opts,
    });

    if (eventInstance instanceof BullMqFlowTask) {
      eventInstance._setFlowRuntimeMetadata({
        prefix: (job as FlowJob).prefix,
        children: null,
      });
    }

    if (eventInstance instanceof BullMqFanoutTask) {
      eventInstance._setAssignedQueueName((job as Job).queueName);
    }

    eventInstance._setPayload(eventInstance._deserialize(job.data));

    return eventInstance;
  }

  private createBullMqHandlerContext(job: Job, token?: string): BullMqHandlerContext {
    const worker = this.workerRegisterService.get(job.queueName);
    const queue = this.queueRegisterService.get(job.queueName);

    return {
      job,
      worker,
      queue,
      token,
    };
  }
}
