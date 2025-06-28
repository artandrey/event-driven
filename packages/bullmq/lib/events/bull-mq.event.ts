import { BullMqBaseEvent, BullMqBaseEventOptions } from './bull-mq-base.event';

export interface BullMqEventOptions<TPayload extends object = object> extends BullMqBaseEventOptions<TPayload> {
  /** The queue name where the job should be published */
  queueName: string;
}

export abstract class BullMqEvent<TPayload extends object = object> extends BullMqBaseEvent<TPayload> {
  protected readonly _queueName: string;

  constructor(options: BullMqEventOptions<TPayload>) {
    super(options);
    this._queueName = options.queueName;
  }

  public get $queueName(): string {
    return this._queueName;
  }
}
