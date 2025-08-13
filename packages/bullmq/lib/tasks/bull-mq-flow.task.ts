import { BullMqTask, BullMqTaskOptions } from './bull-mq.task';

export interface BullMqFlowTaskOptions<TPayload extends object = object> extends BullMqTaskOptions<TPayload> {
  /**
   * Children jobs that belong to this flow job.
   */
  children?: BullMqTask<TPayload>[];
  /**
   * The name of the flow producer to use. When omitted, the default (singleton) flow producer will be used.
   */
  flowName?: string;
  /**
   * Optional key prefix that will be added to the job id.
   */
  prefix?: string;
}

export class BullMqFlowTask<TPayload extends object = object> extends BullMqTask<TPayload> {
  protected readonly _children: BullMqTask<TPayload>[] | null;
  protected readonly _flowName: string | null;
  protected readonly _prefix: string | undefined;

  constructor(options: BullMqFlowTaskOptions<TPayload>) {
    super(options);

    this._children = options.children ?? null;
    this._flowName = options.flowName ?? null;
    this._prefix = options.prefix;
  }

  get $children(): BullMqTask<TPayload>[] | null {
    return this._children;
  }

  get $flowName(): string | null {
    return this._flowName;
  }

  get $prefix(): string | undefined {
    return this._prefix;
  }
}
