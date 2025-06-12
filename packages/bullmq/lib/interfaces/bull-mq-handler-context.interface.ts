import { Job, Queue, Worker } from 'bullmq';

export interface BullMqHandlerContext {
  job: Job;
  worker: Worker;
  queue: Queue;
  token?: string;
}
