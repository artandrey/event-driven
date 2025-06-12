import { IEvent } from '@event-driven-architecture/core';
import { JobsOptions } from 'bullmq';

export abstract class BullMqEvent<TPayload extends object = object> implements IEvent<TPayload> {
  constructor(
    private readonly _queueName: string,
    private readonly _name: string,
    private readonly _jobOptions: Readonly<JobsOptions>,
    private readonly _payload: TPayload | null,
  ) {}

  public get $queueName(): string {
    return this._queueName;
  }

  public get $name(): string {
    return this._name;
  }

  public get $jobOptions(): Readonly<JobsOptions> {
    return this._jobOptions;
  }

  public get $payload(): TPayload {
    if (this._payload === null) {
      throw new Error('Payload is null');
    }
    return this._payload;
  }

  public _serialize(): object {
    return this.$payload;
  }

  public _deserialize(data: object): TPayload {
    return data as TPayload;
  }
}
