/**
 * Enumeration defining the lifecycle scope of handler instances.
 *
 * The scope determines how and when handler instances are created and reused
 * during handlable processing. This affects performance, memory usage, and
 * state management within handlers.
 *
 * @example
 * ```typescript
 * // Register a singleton handler (reused instance)
 * handlerRegister.addHandler(
 *   { handles: UserCreatedEvent, routingMetadata: { scope: HandlerScope.SINGLETON } },
 *   new UserCreatedEventHandler()
 * );
 *
 * // Register a scoped handler (new instance per invocation)
 * handlerRegister.addScopedHandler(
 *   { handles: OrderProcessingTask },
 *   OrderProcessingTaskProcessor
 * );
 * ```
 */
export enum HandlerScope {
  /**
   * Handler instance is created once and reused across all handlable processing calls.
   *
   * This is memory efficient and provides better performance for stateless handlers.
   * Use SINGLETON when your handler doesn't maintain per-request state and can
   * safely handle concurrent processing.
   *
   * @example
   * ```typescript
   * // Singleton handlers should be stateless
   * class StatelessEventHandler implements EventHandler<MyEvent> {
   *   handle(event: MyEvent): void {
   *     // No instance state - safe for concurrent use
   *     this.logEvent(event.payload);
   *   }
   * }
   * ```
   */
  SINGLETON = 'singleton',

  /**
   * Handler instance is created for each handlable processing call.
   *
   * This provides isolation between processing calls and allows handlers to
   * maintain per-request state. Use SCOPED when your handler needs to maintain
   * state during processing or when you need per-request dependency injection.
   *
   * @example
   * ```typescript
   * // Scoped handlers can maintain per-request state
   * class StatefulTaskProcessor implements TaskProcessor<MyTask, Result> {
   *   private processingStartTime: Date;
   *
   *   handle(task: MyTask): Result {
   *     this.processingStartTime = new Date();
   *     // Process task with instance state
   *     return this.calculateResult(task.payload);
   *   }
   * }
   * ```
   */
  SCOPED = 'scoped',
}
