import { Event } from './event.interface';
import { HandlerCallOptions } from './handler-call-options.interface';

/**
 * Result wrapper returned by synchronous handlable consumption methods.
 *
 * Contains the result returned by a handler after processing a handlable.
 * This allows the event bus to return structured results from handler execution.
 *
 * @template TResult - The type of result returned by the handler
 *
 * @example
 * ```typescript
 * const result: HandlingResult<number> = await eventBus.synchronouslyConsumeByStrictlySingleHandler(
 *   new CalculateOrderTotalTask({ items: [...] })
 * );
 * console.log('Order total:', result.result); // Access the actual result
 * ```
 */
export interface HandlingResult<TResult = unknown> {
  /**
   * The result returned by the handler after processing the handlable.
   * The type depends on what the specific handler returns.
   */
  result: TResult;
}

/**
 * Core interface for the event bus in the event-driven architecture.
 *
 * The EventBus is responsible for publishing handlables to external systems and
 * consuming handlables by routing them to appropriate handlers. It supports both
 * publishing (fire-and-forget) and synchronous consumption (with results).
 *
 * **Important**: Before publishing handlables, you must register a publisher using
 * the `setPublisher()` method. Attempting to publish without a registered publisher
 * will throw a `PublisherNotSetException`.
 *
 * @template TEvent - The event type this bus handles (must extend Event)
 * @template TResult - The type of results returned by handlers
 *
 * @example
 * ```typescript
 * // Setup
 * const eventBus = new BaseEventBus(handlerRegister);
 * eventBus.setPublisher(myPublisher);
 *
 * // Publishing (fire-and-forget)
 * eventBus.publish(new UserCreatedEvent({ userId: '123' }));
 * eventBus.publishAll([event1, event2]);
 *
 * // Synchronous consumption with results
 * const result = await eventBus.synchronouslyConsumeByStrictlySingleHandler(
 *   new CalculateOrderTotalTask({ orderId: '123', items: [...] })
 * );
 * console.log('Calculated total:', result.result);
 * ```
 *
 * @see {@link Publisher} for publisher interface
 * @see {@link HandlerRegister} for handler registration
 * @see {@link HandlingResult} for result structure
 */
export interface EventBus<TEvent extends Event = Event, TResult = unknown> {
  /**
   * Publishes an event to the configured publisher.
   * This is a fire-and-forget operation that forwards the event to external systems.
   *
   * @param event - The event to be published
   * @throws PublisherNotSetException when no publisher is registered
   *
   * @example
   * ```typescript
   * eventBus.publish(new UserCreatedEvent({ userId: '123' }));
   * ```
   */
  publish<T extends TEvent>(event: T): void;

  /**
   * Publishes multiple events to the configured publisher.
   * This is a fire-and-forget operation that forwards all events to external systems.
   *
   * @param events - The events to be published
   * @throws PublisherNotSetException when no publisher is registered
   *
   * @example
   * ```typescript
   * eventBus.publishAll([
   *   new UserCreatedEvent({ userId: '123' }),
   *   new EmailSentEvent({ userId: '123', email: 'user@example.com' })
   * ]);
   * ```
   */
  publishAll(events: TEvent[]): void;

  /**
   * Consumes an event by exactly one handler synchronously and returns the result.
   *
   * This method ensures strict single-handler consumption - if there are multiple
   * or no handlers available for this event type, an error will be thrown.
   * Unlike publishing, this method executes handlers locally and returns their results.
   *
   * @param event - The event to be consumed
   * @param options - Optional handler call options including routing metadata and context
   * @returns Promise that resolves to the result of handler execution
   * @throws HandlerNotFoundException when no handlers are found for the event
   * @throws MultipleHandlersFoundException when more than one handler is found
   *
   * @example
   * ```typescript
   * const result = await eventBus.synchronouslyConsumeByStrictlySingleHandler(
   *   new CalculateOrderTotalTask({ orderId: '123', items: [...] }),
   *   { routingMetadata: { version: 1 }, context: { requestId: 'req-456' } }
   * );
   * console.log('Order total:', result.result);
   * ```
   */
  synchronouslyConsumeByStrictlySingleHandler(
    event: TEvent,
    options?: HandlerCallOptions,
  ): Promise<HandlingResult<TResult>>;

  /**
   * Consumes an event by multiple handlers synchronously and returns all results.
   *
   * This method allows multiple handlers to process the same event. If there are no
   * handlers available for the event type, an error will be thrown. All handlers
   * are executed and their results are collected.
   *
   * @param event - The event to be consumed
   * @param options - Optional handler call options including routing metadata and context
   * @returns Promise that resolves to an array of results from all handler executions
   * @throws HandlerNotFoundException when no handlers are found for the event
   * @throws MultipleHandlersFailedException when multiple handlers fail during execution
   *
   * @example
   * ```typescript
   * const results = await eventBus.synchronouslyConsumeByMultipleHandlers(
   *   new UserCreatedEvent({ userId: '123' }),
   *   { routingMetadata: { version: 1 } }
   * );
   *
   * results.forEach((result, index) => {
   *   console.log(`Handler ${index} result:`, result.result);
   * });
   * ```
   */
  synchronouslyConsumeByMultipleHandlers(
    event: TEvent,
    options?: HandlerCallOptions,
  ): Promise<HandlingResult<TResult>[]>;
}
