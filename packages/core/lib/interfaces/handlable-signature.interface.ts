import { Handlable } from './handlable.interface';

/**
 * Type signature for handlable constructors.
 *
 * Represents the constructor signature of a handlable class. This type is used
 * throughout the system to identify and instantiate handlable types, particularly
 * in handler registration and routing.
 *
 * The signature captures the constructor pattern that creates handlable instances,
 * allowing the system to match incoming handlables with their registered handlers
 * based on their constructor type.
 *
 * @example
 * ```typescript
 * // Define a handlable class
 * class UserCreatedEvent implements Event<{ userId: string }> {
 *   constructor(public readonly payload: { userId: string }) {}
 * }
 *
 * // The signature for this handlable
 * const signature: HandlableSignature = UserCreatedEvent;
 *
 * // Used in handler registration
 * const handlerSignature: HandlerSignature = {
 *   handles: UserCreatedEvent, // This is a HandlableSignature
 *   routingMetadata: { version: 1 }
 * };
 * ```
 *
 * @see {@link Handlable} for the base handlable interface
 * @see {@link HandlerSignature} for handler registration signatures
 */
export type HandlableSignature = new (...args: any[]) => Handlable;
