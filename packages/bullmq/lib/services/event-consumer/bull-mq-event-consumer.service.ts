import { EventBus, HandlerRegister, Type } from '@event-driven-architecture/core';
import { FlowJob, Job, Processor, WorkerOptions } from 'bullmq';

import { BullMqFanoutEvent, BullMqFlowEvent } from '../../events';
import { BullMqEvent } from '../../events/bull-mq.event';
import { BullMqHandlerContext } from '../../interfaces/bull-mq-handler-context.interface';
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

export class BullMqEventConsumerService {
  constructor(
    private readonly workerRegisterService: WorkerRegisterService,
    private readonly queueRegisterService: QueueRegisterService,
    private readonly eventsRegisterService: EventsRegisterService,
    private readonly consumerOptions: BullMqEventConsumerOptions[],
    private readonly workerService: WorkerService,
    private readonly eventBus: EventBus,
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
        this.eventsRegisterService.register(handlerSignature.event as Type<BullMqEvent>);
      });
  }

  private handleJob: Processor = async (job: Job, token?: string) => {
    const event = this.mapJobToEvent(job);
    await this.eventBus.synchronouslyConsumeByStrictlySingleHandler(event, {
      context: this.createBullMqHandlerContext(job, token),
      routingMetadata: mapBullMqEventToRoutingMetadata(event),
    });
  };

  private mapJobToEvent(job: Job | FlowJob): BullMqEvent | BullMqFlowEvent {
    const EventClass = this.eventsRegisterService.getType({
      queueName: job.queueName,
      name: job.name,
    });

    if (!EventClass) {
      throw new Error(`Event type not found for queue: ${job.queueName}, name: ${job.name}`);
    }

    const eventInstance = Object.create(EventClass.prototype);

    Object.assign(eventInstance, {
      _queueName: job.queueName,
      _name: job.name,
      _jobOptions: job.opts,
    });

    if (eventInstance instanceof BullMqFlowEvent) {
      (eventInstance as any)._prefix = (job as FlowJob).prefix;
      (eventInstance as any)._children = null;
    }

    if (eventInstance instanceof BullMqFanoutEvent) {
      (eventInstance as any)._assignedQueueName = (job as Job).queueName;
    }

    eventInstance._payload = eventInstance._deserialize(job.data);

    return eventInstance;
  }

  private createBullMqHandlerContext(job: Job, token?: string): BullMqHandlerContext {
    return {
      job,
      worker: this.workerRegisterService.get(job.queueName),
      queue: this.queueRegisterService.get(job.queueName),
      token,
    };
  }
}
