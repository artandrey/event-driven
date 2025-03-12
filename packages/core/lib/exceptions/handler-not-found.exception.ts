export class HandlerNotFoundException extends Error {
  constructor() {
    super('No handler found for the event');
  }
}
