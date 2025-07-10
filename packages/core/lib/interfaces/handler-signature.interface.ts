import { HandlableSignature } from './handlable-signature.interface';

/**
 * Signature definition for registering handlers in the handler register.
 * Used to uniquely identify and route handlables to their appropriate handlers.
 *
 * @example
 * ```typescript
 * const signature: HandlerSignature = {
 *   handles: UserCreatedEvent,
 *   routingMetadata: { version: 1, region: 'us-east' }
 * };
 * ```
 */
export interface HandlerSignature {
  /**
   * The constructor/class of the handlable that this handler processes.
   * Used to match incoming handlables to their appropriate handlers.
   */
  handles: HandlableSignature;

  /**
   * Optional routing metadata used by event bus to route handlables to the correct handler.
   * Can be any object that helps differentiate between multiple handlers for the same handlable type.
   */
  routingMetadata?: unknown;
}
