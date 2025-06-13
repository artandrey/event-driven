import { Processor, Worker, WorkerOptions } from 'bullmq';

import { WorkerRegisterService } from '../register/workers-register.service';

export class WorkerService {
  constructor(private readonly workerRegisterService: WorkerRegisterService) {}

  public createWorker(queueName: string, processor: Processor, workerOptions: WorkerOptions) {
    const worker = new Worker(queueName, processor, workerOptions);

    this.workerRegisterService.add(worker);
  }
}
