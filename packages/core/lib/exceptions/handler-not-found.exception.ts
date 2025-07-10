export class HandlerNotFoundException extends Error {
  constructor(eventName?: string, routingMetadata?: unknown) {
    const eventInfo = eventName ? ` for event '${eventName}'` : '';
    const routingInfo = routingMetadata ? ` with routing metadata '${JSON.stringify(routingMetadata)}'` : '';
    super(`No handler found${eventInfo}${routingInfo}`);
  }
}
