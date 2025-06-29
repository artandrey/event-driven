import { Event } from './event.interface';

/**
 * Defines the scope of an event handler instance lifecycle.
 */
export enum EventHandlerScope {
  /**
   * Handler instance is created once and reused across all event handling calls.
   */
  SINGLETON = 'singleton',
  /**
   * Handler instance is created for each event handling call.
   */
  SCOPED = 'scoped',
}

/**
 * Type signature for event constructors that create Event instances.
 */
export type EventSignature = new (...args: any[]) => Event;

/**
 * Interface for event handlers that process specific event types.
 * @template TEvent - event this handler processes
 * @template TContext - context passed to the handler
 */
export interface EventHandler<TEvent extends Event = Event, TContext = unknown> {
  /**
   * Handles the given event with optional context.
   * @param event The event to be handled
   * @param context Optional context information for related to the event
   * @returns Promise that resolves when handling is complete, or void for synchronous handling
   */
  handle(event: TEvent, context?: TContext): void | Promise<void>;
}
