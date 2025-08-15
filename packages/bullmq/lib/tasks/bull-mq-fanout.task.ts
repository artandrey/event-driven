import { BullMqBaseTask, BullMqBaseTaskOptions } from './bull-mq-base.task';

export interface BullMqFanoutTaskOptions<TPayload extends object = object> extends BullMqBaseTaskOptions<TPayload> {}

export class BullMqFanoutTask<TPayload extends object = object> extends BullMqBaseTask<TPayload> {
  private readonly _assignedQueueName: string | null = null;

  constructor(options: BullMqFanoutTaskOptions<TPayload>) {
    super(options);
  }

  public get $assignedQueueName(): string | null {
    return this._assignedQueueName;
  }
}
