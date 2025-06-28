export class RouteNotFoundException extends Error {
  constructor(eventName: string, eventType?: string) {
    const type = eventType ? `${eventType}` : '';
    super(`No route found for ${type} event: ${eventName}`);
  }
}
