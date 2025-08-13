import { Task } from '@event-driven-architecture/core';
import { JobsOptions } from 'bullmq';

export interface BullMqBaseTaskOptions<TPayload extends object = object> {
  /** The job name (will be mapped to the event name) */
  name: string;
  /** BullMQ job options */
  jobOptions?: Readonly<JobsOptions>;
  /** Payload data */
  payload: TPayload | null;
}

export abstract class BullMqBaseTask<TPayload extends object = object> implements Task<TPayload> {
  protected readonly _name: string;
  protected readonly _jobOptions: Readonly<JobsOptions> | undefined;
  protected readonly _payload: TPayload | null;

  constructor(options: BullMqBaseTaskOptions<TPayload>) {
    this._name = options.name;
    this._jobOptions = options.jobOptions;
    this._payload = options.payload;
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
