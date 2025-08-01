import { Event } from './event.interface';
import { Handler } from './handler.interface';

/**
 * Interface for event handlers that process specific event types.
 * Extends the generic Handler interface and specializes it for Event processing.
 * Supports both synchronous and asynchronous handling.
 *
 * @template TEvent - The specific event type this handler processes
 * @template TContext - Optional context object passed to the handler (defaults to unknown)
 *
 * @example
 * ```typescript
 * class UserCreatedEventHandler implements EventHandler<UserCreatedEvent> {
 *   handle(event: UserCreatedEvent, context?: unknown): void {
 *     console.log('User created:', event.payload.userId);
 *   }
 * }
 * ```
 */
export interface EventHandler<TEvent extends Event = Event, TContext = unknown>
  extends Handler<TEvent, void, TContext> {
  /**
   * Handles the given event with optional context.
   *
   * @param event - The event to be handled
   * @param context - Optional context information related to the event
   * @returns Promise that resolves when handling is complete, or void for synchronous handling
   */
  handle(event: TEvent, context?: TContext): void | Promise<void>;
}
