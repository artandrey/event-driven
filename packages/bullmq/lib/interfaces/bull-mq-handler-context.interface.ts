import { Job, Queue, Worker } from 'bullmq';

export interface BullMqHandlerContext<TData = unknown> {
  job: Job<TData>;
  worker: Worker;
  queue: Queue;
  token?: string;
}
