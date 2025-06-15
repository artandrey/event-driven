export interface HandlerCallOptions<TContext extends object = object> {
  context?: TContext;
  routingMetadata?: unknown;
}
