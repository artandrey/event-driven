import { IEventHandler } from './event-handler.interface';
import { IEvent } from './event.interface';
import { IEventHandlerSignature } from './handler-signature.interface';
import { Type } from './type.interface';

export interface IHandlerRetrievalOptions<E = unknown> {
  event: E;
  routingMetadata?: unknown;
  context?: object;
}

/**
 * Handler register service that manages event handlers.
 * Responsible for storing handlers and retrieving handler signatures.
 * @template T The handler type
 * @template TypeT The handler class type
 */
export interface IHandlerRegister<T = IEventHandler<IEvent>, TypeT extends Type<T> = Type<T>> {
  /**
   * Adds a handler to the handlers map
   * @param handlerSignature The handler signature to store the handler under
   * @param instance The handler instance
   */
  addHandler(handlerSignature: IEventHandlerSignature, instance: T): void;

  /**
   * Adds a scoped handler to the scopedHandlers map
   * @param handlerSignature The handler signature to store the handler under
   * @param handler The handler type
   */
  addScopedHandler(handlerSignature: IEventHandlerSignature, handler: TypeT): void;

  /**
   * Gets handlers for a specific event.
   * @param event The event to get handlers for
   * @param context Optional context for scoped handlers
   * @returns A promise that resolves to an array of handlers or undefined
   */
  get<E>(options: IHandlerRetrievalOptions<E>): Promise<T[] | undefined>;

  /**
   * Gets the signatures of all registered handlers.
   * @returns A readonly array of handler signatures
   */
  getHandlerSignatures(): Readonly<IEventHandlerSignature[]>;
}
