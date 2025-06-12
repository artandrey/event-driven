import { JobsOptions } from 'bullmq';

import { BullMqEvent } from './bull-mq.event';

export class BullMqFlowEvent<TPayload extends object = object> extends BullMqEvent<TPayload> {
  public readonly children: BullMqEvent<TPayload>[];

  constructor(
    queueName: string,
    name: string,
    jobOptions: Readonly<JobsOptions>,
    payload: TPayload | null,
    children: BullMqEvent<TPayload>[],
  ) {
    super(queueName, name, jobOptions, payload);
    this.children = children;
  }
}
