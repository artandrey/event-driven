import { JobsOptions } from 'bullmq';

import { BullMqEvent } from './bull-mq.event';

export interface BullMqFlowPublishingOptions {
  /**
   * The name of the flow to publish the event to.
   * If null, the event will be published to the default (singleton) flow.
   */
  flowName?: string;
  /**
   * The prefix of the job options.
   */
  prefix?: string;
}

export class BullMqFlowEvent<TPayload extends object = object> extends BullMqEvent<TPayload> {
  protected readonly _children: BullMqEvent<TPayload>[] | null;
  protected readonly _flowName: string | null;
  protected readonly _prefix: string | undefined;
  constructor(
    queueName: string,
    name: string,
    jobOptions: Readonly<JobsOptions>,
    payload: TPayload | null,
    children: BullMqEvent<TPayload>[],
    options: BullMqFlowPublishingOptions = {},
  ) {
    super(queueName, name, jobOptions, payload);
    this._children = children ?? null;
    this._flowName = options.flowName ?? null;
    this._prefix = options.prefix;
  }

  get $children(): BullMqEvent<TPayload>[] | null {
    return this._children;
  }

  get $flowName(): string | null {
    return this._flowName;
  }

  get $prefix(): string | undefined {
    return this._prefix;
  }
}
