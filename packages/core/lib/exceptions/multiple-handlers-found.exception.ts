export class MultipleHandlersFoundException extends Error {
  constructor(eventName?: string, routingMetadata?: unknown, handlerCount?: number) {
    const eventInfo = eventName ? ` for event '${eventName}'` : '';
    const routingInfo = routingMetadata ? ` with routing metadata '${JSON.stringify(routingMetadata)}'` : '';
    const countInfo = handlerCount ? ` (found ${handlerCount} handlers)` : '';
    super(`Multiple handlers found${eventInfo}${routingInfo}${countInfo}. Expected exactly one handler.`);
  }
}
