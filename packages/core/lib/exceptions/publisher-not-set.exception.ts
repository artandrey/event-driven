export class PublisherNotSetException extends Error {
  constructor() {
    super('Publisher is not set');
  }
}
