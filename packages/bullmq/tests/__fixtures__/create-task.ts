import { JobsOptions } from 'bullmq';

import { BullMqFanoutTask, BullMqFlowTask } from '../../lib';
import { BullMqTask } from '../../lib/tasks/bull-mq.task';

export interface CreatedTask<TPayload extends object = object> {
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

export function createTask<TPayload extends object = object>(
  name: string,
  payload: TPayload,
  queueName: string,
  jobOptions: JobsOptions,
): CreatedTask<TPayload> {
  class TaskClass extends BullMqTask<TPayload> {
    constructor(p: TPayload) {
      super({ name, payload: p, queueName, jobOptions });
    }
  }

  return {
    instance: new TaskClass(payload),
    payload,
    queueName,
    jobOptions,
    name,
    class: TaskClass,
    toQueueAddOptions: () => [name, payload, jobOptions],
    toQueueAddBulkOptionsItem: () => ({
      name,
      data: payload,
      opts: jobOptions,
    }),
  };
}

export interface CreatedFlowTask<TPayload extends object = object> {
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

export function createFlowTask<TPayload extends object = object>(
  name: string,
  payload: TPayload,
  queueName: string,
  jobOptions: JobsOptions,
  nestedFlowEvents: BullMqFlowTask<TPayload>[],
  flowName?: string,
): CreatedFlowTask<TPayload> {
  class FlowTaskClass extends BullMqFlowTask<TPayload> {
    constructor(p: TPayload) {
      super({ name, payload: p, queueName, jobOptions, flowName: flowName, children: nestedFlowEvents });
    }
  }

  return {
    instance: new FlowTaskClass(payload),
    payload,
    queueName,
    jobOptions,
    flowName,
    class: FlowTaskClass,
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

export interface CreatedFanoutTask<TPayload extends object = object> {
  instance: BullMqFanoutTask<TPayload>;
  class: new (payload: TPayload) => BullMqFanoutTask<TPayload>;
  payload: TPayload;
  jobOptions: JobsOptions;
  name: string;
  toFanoutAddOptions: () => [name: string, payload: TPayload, jobOptions: JobsOptions];
}

export function createFanoutTask<TPayload extends object = object>(
  name: string,
  payload: TPayload,
  jobOptions: JobsOptions,
): CreatedFanoutTask<TPayload> {
  class FanoutTaskClass extends BullMqFanoutTask<TPayload> {
    constructor(p: TPayload) {
      super({ name, payload: p, jobOptions });
    }
  }

  return {
    instance: new FanoutTaskClass(payload),
    payload,
    jobOptions,
    name,
    class: FanoutTaskClass,
    toFanoutAddOptions: () => [name, payload, jobOptions],
  };
}
