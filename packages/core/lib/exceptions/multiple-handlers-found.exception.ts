export class MultipleHandlersFoundException extends Error {
  constructor() {
    super('More than one handler found for the event');
  }
}
