export class EventTypeNotFoundException extends Error {
  constructor(name: string, queueName: string) {
    super(`Event type not found for name: ${name} and queue: ${queueName}`);
  }
}
