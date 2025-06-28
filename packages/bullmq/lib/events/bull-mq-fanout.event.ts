import { BullMqEvent, BullMqEventOptions } from './bull-mq.event';

export class BullMqFanoutEvent<TPayload extends object = object> extends BullMqEvent<TPayload> {
  private readonly _assignedQueueName: string | null = null;

  constructor(options: Omit<BullMqEventOptions<TPayload>, 'queueName'> & { queueName?: string }) {
    // Provide a dummy queue name since fanout events don't use a specific queue
    super({ ...options, queueName: options.queueName || '__fanout__' });
  }

  public get $assignedQueueName(): string | null {
    return this._assignedQueueName;
  }
}
