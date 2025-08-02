import { BullMqBaseTask, BullMqBaseTaskOptions } from './bull-mq-base.task';

export interface BullMqTaskOptions<TPayload extends object = object> extends BullMqBaseTaskOptions<TPayload> {
  /** The queue name where the job should be published */
  queueName: string;
}

export abstract class BullMqTask<TPayload extends object = object> extends BullMqBaseTask<TPayload> {
  protected readonly _queueName: string;

  constructor(options: BullMqTaskOptions<TPayload>) {
    super(options);
    this._queueName = options.queueName;
  }

  public get $queueName(): string {
    return this._queueName;
  }
}
