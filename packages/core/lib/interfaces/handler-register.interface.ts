import { IEventHandler } from './event-handler.interface';
import { IEvent } from './event.interface';
import { IEventHandlerSignature } from './handler-signature.interface';
import { Type } from './type.interface';

/**
 * Handler register service that manages event handlers.
 * Responsible for storing handlers and retrieving handler signatures.
 * @template T The handler type
 * @template TypeT The handler class type
 */
export interface IHandlerRegister<T = IEventHandler<IEvent>, TypeT extends Type<T> = Type<T>> {
  /**
   * Adds a handler to the handlers map
   * @param handlerKey The key to store the handler under
   * @param instance The handler instance
   */
  addHandler(handlerKey: string, instance: T): void;

  /**
   * Adds a scoped handler to the scopedHandlers map
   * @param handlerKey The key to store the handler under
   * @param handler The handler type
   */
  addScopedHandler(handlerKey: string, handler: TypeT): void;

  /**
   * Adds a handler signature to the handlersSignatures array
   * @param signature The handler signature to add
   */
  addHandlerSignature(signature: IEventHandlerSignature): void;

  /**
   * Gets handlers for a specific event.
   * @param event The event to get handlers for
   * @param context Optional context for scoped handlers
   * @returns A promise that resolves to an array of handlers or undefined
   */
  get<E>(event: E, context?: object): Promise<T[] | undefined>;

  /**
   * Gets the name of an event.
   * @param event The event to get the name for
   * @returns The name of the event
   */
  getName<E>(event: E): string;

  /**
   * Gets the signatures of all registered handlers.
   * @returns A readonly array of handler signatures
   */
  getHandlerSignatures(): Readonly<IEventHandlerSignature[]>;
}
