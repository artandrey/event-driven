import { BullMqTask, BullMqTaskOptions } from './bull-mq.task';

export interface BullMqFlowTaskOptions<TPayload extends object = object> extends BullMqTaskOptions<TPayload> {
  /**
   * Children jobs that belong to this flow job.
   */
  children?: BullMqTask<any>[];
  /**
   * The name of the flow producer to use. When omitted, the default (singleton) flow producer will be used.
   */
  flowName?: string;
  /**
   * Optional key prefix that will be added to the job id.
   */
  prefix?: string;
}

export interface BullMqFlowRuntimeMetadata {
  prefix?: string;
  children?: BullMqTask<any>[] | null;
}

export class BullMqFlowTask<TPayload extends object = object> extends BullMqTask<TPayload> {
  protected _children: BullMqTask<any>[] | null;
  protected _flowName: string | null;
  protected _prefix: string | undefined;

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

  public _setFlowRuntimeMetadata(options: BullMqFlowRuntimeMetadata): void {
    if (options.prefix !== undefined) {
      this._prefix = options.prefix;
    }
    if (options.children !== undefined) {
      this._children = options.children;
    }
  }
}
