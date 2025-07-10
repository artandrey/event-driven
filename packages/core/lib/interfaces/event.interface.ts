import { Handlable } from './handlable.interface';

/**
 * Interface for events in the event-driven system.
 * Events represent things that have happened in your application.
 * Extends the generic Handlable interface to specialize it for event semantics.
 *
 * @template TPayload - The type of data contained in the event payload (defaults to object)
 *
 * @example
 * ```typescript
 * interface UserCreatedEventPayload {
 *   userId: string;
 *   email: string;
 * }
 *
 * class UserCreatedEvent implements Event<UserCreatedEventPayload> {
 *   constructor(public readonly payload: UserCreatedEventPayload) {}
 * }
 * ```
 */
export interface Event<TPayload extends object = object> extends Handlable<TPayload> {}
