import { IEvent } from '@event-driven-architecture/core';
import { JobsOptions } from 'bullmq';

export interface BullMqEventOptions<TPayload extends object = object> {
  /** The queue name where the job should be published */
  queueName: string;
  /** The job name (will be mapped to the event name) */
  name: string;
  /** BullMQ job options */
  jobOptions?: Readonly<JobsOptions>;
  /** Payload data */
  payload: TPayload | null;
}

export abstract class BullMqEvent<TPayload extends object = object> implements IEvent<TPayload> {
  protected readonly _queueName: string;
  protected readonly _name: string;
  protected readonly _jobOptions: Readonly<JobsOptions> | undefined;
  protected readonly _payload: TPayload | null;

  constructor(options: BullMqEventOptions<TPayload>) {
    this._queueName = options.queueName;
    this._name = options.name;
    this._jobOptions = options.jobOptions;
    this._payload = options.payload;
  }

  public get $queueName(): string {
    return this._queueName;
  }

  public get $name(): string {
    return this._name;
  }

  public get $jobOptions(): Readonly<JobsOptions> | undefined {
    return this._jobOptions;
  }

  public get payload(): TPayload {
    if (this._payload === null) {
      throw new Error('Payload is null');
    }
    return this._payload;
  }

  public _serialize(): object {
    return this.payload;
  }

  public _deserialize(data: object): TPayload {
    return data as TPayload;
  }
}
