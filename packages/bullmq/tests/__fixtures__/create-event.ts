import { JobsOptions } from 'bullmq';

import { BullMqFanoutTask, BullMqFlowTask } from '../../lib';
import { BullMqTask } from '../../lib/tasks/bull-mq.task';

export interface CreatedJobEvent<TPayload extends object = object> {
  instance: BullMqTask<TPayload>;
  class: new (payload: TPayload) => BullMqTask<TPayload>;
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
  class EventClass extends BullMqTask<TPayload> {
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
  instance: BullMqTask<TPayload>;
  class: new (payload: TPayload) => BullMqTask<TPayload>;
  payload: TPayload;
  queueName: string;
  jobOptions: JobsOptions;
  flowName?: string;
  name: string;
  toFlowAddOptions: () => {
    name: string;
    opts: JobsOptions;
    children: BullMqFlowTask<TPayload>[];
    data: TPayload;
    queueName: string;
  };
}

export function createFlowEvent<TPayload extends object = object>(
  name: string,
  payload: TPayload,
  queueName: string,
  jobOptions: JobsOptions,
  nestedFlowEvents: BullMqFlowTask<TPayload>[],
  flowName?: string,
): CreatedFlowEvent<TPayload> {
  class EventClass extends BullMqFlowTask<TPayload> {
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
  instance: BullMqFanoutTask<TPayload>;
  class: new (payload: TPayload) => BullMqFanoutTask<TPayload>;
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
  class EventClass extends BullMqFanoutTask<TPayload> {
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
