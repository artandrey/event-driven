import { JobsOptions } from 'bullmq';
import { BullMqEvent, BullMqFanoutEvent, BullMqFlowEvent } from 'packages/bullmq/lib';

export interface CreatedJobEvent<TPayload extends object = object> {
  instance: BullMqEvent<TPayload>;
  class: new (payload: TPayload) => BullMqEvent<TPayload>;
  payload: TPayload;
  queueName: string;
  jobOptions: JobsOptions;
  name: string;
  toQueueAddOptions: () => [name: string, payload: TPayload, jobOptions: JobsOptions];
  toQueueAddBulkOptionsItem: () => {
    name: string;
    data: TPayload;
    opts: JobsOptions;
  };
}

export function createJobEvent<TPayload extends object = object>(
  name: string,
  payload: TPayload,
  queueName: string,
  jobOptions: JobsOptions,
): CreatedJobEvent<TPayload> {
  class EventClass extends BullMqEvent<TPayload> {
    constructor(p: TPayload) {
      super({ name, payload: p, queueName, jobOptions });
    }
  }

  return {
    instance: new EventClass(payload),
    payload,
    queueName,
    jobOptions,
    name,
    class: EventClass,
    toQueueAddOptions: () => [name, payload, jobOptions],
    toQueueAddBulkOptionsItem: () => ({
      name,
      data: payload,
      opts: jobOptions,
    }),
  };
}

export interface CreatedFlowEvent<TPayload extends object = object> {
  instance: BullMqFlowEvent<TPayload>;
  class: new (payload: TPayload) => BullMqFlowEvent<TPayload>;
  payload: TPayload;
  queueName: string;
  jobOptions: JobsOptions;
  flowName?: string;
  name: string;
  toFlowAddOptions: () => {
    name: string;
    opts: JobsOptions;
    children: BullMqFlowEvent<TPayload>[];
    data: TPayload;
    queueName: string;
  };
}

export function createFlowEvent<TPayload extends object = object>(
  name: string,
  payload: TPayload,
  queueName: string,
  jobOptions: JobsOptions,
  nestedFlowEvents: BullMqFlowEvent<TPayload>[],
  flowName?: string,
): CreatedFlowEvent<TPayload> {
  class EventClass extends BullMqFlowEvent<TPayload> {
    constructor(p: TPayload) {
      super({ name, payload: p, queueName, jobOptions, flowName: flowName, children: nestedFlowEvents });
    }
  }

  return {
    instance: new EventClass(payload),
    payload,
    queueName,
    jobOptions,
    flowName,
    class: EventClass,
    name,
    toFlowAddOptions: () => ({
      name,
      opts: jobOptions,
      children: nestedFlowEvents,
      data: payload,
      queueName,
    }),
  };
}

export interface CreatedFanoutEvent<TPayload extends object = object> {
  instance: BullMqFanoutEvent<TPayload>;
  class: new (payload: TPayload) => BullMqFanoutEvent<TPayload>;
  payload: TPayload;
  jobOptions: JobsOptions;
  name: string;
  toFanoutAddOptions: () => [name: string, payload: TPayload, jobOptions: JobsOptions];
}

export function createFanoutEvent<TPayload extends object = object>(
  name: string,
  payload: TPayload,
  jobOptions: JobsOptions,
): CreatedFanoutEvent<TPayload> {
  class EventClass extends BullMqFanoutEvent<TPayload> {
    constructor(p: TPayload) {
      super({ name, payload: p, jobOptions });
    }
  }

  return {
    instance: new EventClass(payload),
    payload,
    jobOptions,
    name,
    class: EventClass,
    toFanoutAddOptions: () => [name, payload, jobOptions],
  };
}
