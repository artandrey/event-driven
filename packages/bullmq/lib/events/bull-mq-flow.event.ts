import { BullMqEvent, BullMqEventOptions } from './bull-mq.event';

export interface BullMqFlowEventOptions<TPayload extends object = object> extends BullMqEventOptions<TPayload> {
  /**
   * Children jobs that belong to this flow job.
   */
  children?: BullMqEvent<TPayload>[];
  /**
   * The name of the flow producer to use. When omitted, the default (singleton) flow producer will be used.
   */
  flowName?: string;
  /**
   * Optional key prefix that will be added to the job id.
   */
  prefix?: string;
}

export class BullMqFlowEvent<TPayload extends object = object> extends BullMqEvent<TPayload> {
  protected readonly _children: BullMqEvent<TPayload>[] | null;
  protected readonly _flowName: string | null;
  protected readonly _prefix: string | undefined;

  constructor(options: BullMqFlowEventOptions<TPayload>) {
    super(options);

    this._children = options.children ?? null;
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
