export class WorkerNotFoundException extends Error {
  constructor(workerName: string) {
    super(`Worker not found: ${workerName}`);
  }
}
