import { BullMqTask, BullMqTaskOptions } from './bull-mq.task';

export class BullMqFanoutTask<TPayload extends object = object> extends BullMqTask<TPayload> {
  private readonly _assignedQueueName: string | null = null;

  constructor(options: Omit<BullMqTaskOptions<TPayload>, 'queueName'> & { queueName?: string }) {
    // TODO: Consider removing fallback queue name from options
    super({ ...options, queueName: options.queueName || '__fanout__' });
  }

  public get $assignedQueueName(): string | null {
    return this._assignedQueueName;
  }
}
