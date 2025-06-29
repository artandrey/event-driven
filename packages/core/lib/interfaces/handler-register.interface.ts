import { EventHandler } from './event-handler.interface';
import { Event } from './event.interface';
import { EventHandlerSignature } from './handler-signature.interface';
import { Type } from './type.interface';

/**
 * Options for retrieving handlers from the handler register.
 * @template E - event for which handlers are being retrieved
 */
export interface HandlerRetrievalOptions<E = unknown> {
  /**
   * The event instance for which handlers should be retrieved.
   */
  event: E;
  /**
   * Optional routing metadata used to filter handlers based on routing rules.
   */
  routingMetadata?: unknown;
  /**
   * Optional context object that may be used for scoped handler instantiation.
   */
  context?: object;
}

/**
 * Handler register service that manages event handlers.
 * Responsible for storing handlers and retrieving handler instances and signatures.
 * @template T - handler type
 */
export interface HandlerRegister<T extends EventHandler<Event> = EventHandler<Event>, TypeT extends Type<T> = Type<T>> {
  /**
   * Adds a handler to the handlers map
   * @param handlerSignature The handler signature to store the handler under
   * @param instance The handler instance
   */
  addHandler(handlerSignature: EventHandlerSignature, instance: T): void;

  /**
   * Adds a scoped handler to the scopedHandlers map
   * @param handlerSignature The handler signature to store the handler under
   * @param handler The handler type
   */
  addScopedHandler(handlerSignature: EventHandlerSignature, handler: TypeT): void;

  /**
   * Gets handlers for a specific event.
   * @param event The event to get handlers for
   * @param context Optional context for scoped handlers
   * @returns A promise that resolves to an array of handlers or undefined
   */
  get<E>(options: HandlerRetrievalOptions<E>): Promise<T[] | undefined>;

  /**
   * Gets the signatures of all registered handlers.
   * @returns A readonly array of handler signatures
   */
  getHandlerSignatures(): Readonly<EventHandlerSignature[]>;
}
