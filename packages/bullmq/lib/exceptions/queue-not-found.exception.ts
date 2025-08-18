export class QueueNotFoundException extends Error {
  constructor(queueName: string) {
    super(`Queue not found: ${queueName}`);
  }
}
