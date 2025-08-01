import { BaseException } from './base.exception';

export class PublisherNotSetException extends BaseException('PublisherNotSetException') {
  constructor() {
    super(
      'Publisher is not set. Please set a publisher using eventBus.setPublisher(yourPublisher) before publishing events.',
    );
  }
}
