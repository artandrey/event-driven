/**
 * Options that can be passed when calling event handlers.
 * @template TContext - context object passed to handlers
 */
export interface HandlerCallOptions<TContext extends object = object> {
  /**
   * Optional context object passed to event handlers during execution.
   */
  context?: TContext;
  /**
   * Optional routing metadata used by message routing systems to determine
   * how events should be routed to handlers.
   */
  routingMetadata?: unknown;
}
