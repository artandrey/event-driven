export class PublisherNotSetException extends Error {
  constructor() {
    super(
      'Publisher is not set. Please set a publisher using eventBus.publisher = yourPublisher before publishing events.',
    );
  }
}
