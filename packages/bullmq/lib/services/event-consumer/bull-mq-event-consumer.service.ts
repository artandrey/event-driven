import { IEventBus } from '@event-driven-architecture/core';
import { Job, Processor, WorkerOptions } from 'bullmq';

import { BullMqEvent } from '../../events/bull-mq.event';
import { BullMqHandlerContext } from '../../interfaces/bull-mq-handler-context.interface';
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
    private readonly eventBus: IEventBus,
  ) {}

  public init() {
    this.consumerOptions.forEach((consumerOptions) => {
      this.workerService.createWorker(consumerOptions.queueName, this.handleJob, consumerOptions.workerOptions);
    });
  }

  private handleJob: Processor = async (job: Job, token?: string) => {
    const event = this.mapJobToEvent(job);
    this.eventBus.synchronouslyConsumeByStrictlySingleHandler(event, {
      context: this.createBullMqHandlerContext(job, token),
    });
  };

  private mapJobToEvent(job: Job): BullMqEvent {
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
