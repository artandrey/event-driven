import { BaseException } from './base.exception';

export class HandlerNotFoundException extends BaseException('HandlerNotFoundException') {
  constructor(eventName?: string, routingMetadata?: unknown) {
    const eventInfo = eventName ? ` for event '${eventName}'` : '';
    const routingInfo = routingMetadata ? ` with routing metadata '${JSON.stringify(routingMetadata)}'` : '';
    super(`No handler found${eventInfo}${routingInfo}`);
  }
}
