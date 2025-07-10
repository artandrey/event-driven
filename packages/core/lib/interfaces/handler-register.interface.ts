import { Handlable } from './handlable.interface';
import { HandlerSignature } from './handler-signature.interface';
import { Handler } from './handler.interface';
import { Type } from './type.interface';

/**
 * Options for retrieving handlers from the handler register.
 * Used to specify criteria for finding appropriate handlers for a given handlable.
 *
 * @template H - The handlable type for which handlers are being retrieved
 *
 * @example
 * ```typescript
 * const options: HandlerRetrievalOptions<UserCreatedEvent> = {
 *   handlable: userCreatedEvent,
 *   routingMetadata: { version: 1 },
 *   context: { requestId: '123' }
 * };
 * ```
 */
export interface HandlerRetrievalOptions<H = unknown> {
  /**
   * The handlable instance for which handlers should be retrieved.
   * Used to match against registered handler signatures.
   */
  handlable: H;

  /**
   * Optional routing metadata used to filter handlers based on routing rules.
   * Must match the routingMetadata specified when the handler was registered.
   */
  routingMetadata?: unknown;

  /**
   * Optional context object that may be used for scoped handler instantiation.
   * Passed to scoped handlers during their creation and execution.
   */
  context?: object;
}

/**
 * Handler register service that manages handlers for handlables.
 * Responsible for storing handler registrations and retrieving handler instances based on handlable types and routing metadata.
 * Supports both singleton handlers (reused instances) and scoped handlers (created per invocation).
 *
 * @template T - The handler type (extends Handler<Handlable>)
 * @template TypeT - The constructor type for the handler
 *
 * @example
 * ```typescript
 * const register = new BaseHandlerRegister();
 *
 * // Register singleton handler
 * register.addHandler(
 *   { handles: UserCreatedEvent, routingMetadata: { v: 1 } },
 *   new UserCreatedEventHandler()
 * );
 *
 * // Register scoped handler
 * register.addScopedHandler(
 *   { handles: OrderProcessingTask },
 *   OrderProcessingTaskProcessor
 * );
 * ```
 */
export interface HandlerRegister<T extends Handler<Handlable> = Handler<Handlable>, TypeT extends Type<T> = Type<T>> {
  /**
   * Adds a singleton handler to the handlers registry.
   * The same handler instance will be reused for all matching handlables.
   *
   * @param handlerSignature - The signature that identifies when this handler should be used
   * @param instance - The handler instance to register
   */
  addHandler(handlerSignature: HandlerSignature, instance: T): void;

  /**
   * Adds a scoped handler to the registry.
   * A new handler instance will be created for each matching handlable.
   *
   * @param handlerSignature - The signature that identifies when this handler should be used
   * @param handler - The handler constructor/class to register
   */
  addScopedHandler(handlerSignature: HandlerSignature, handler: TypeT): void;

  /**
   * Retrieves handlers for a specific handlable based on the provided options.
   * Returns matching handlers that can process the given handlable.
   *
   * @template H - The type of handlable to get handlers for
   * @param options - Options specifying the handlable, routing metadata, and context
   * @returns A promise that resolves to an array of handlers or undefined if no handlers found
   */
  get<H>(options: HandlerRetrievalOptions<H>): Promise<T[] | undefined>;

  /**
   * Gets the signatures of all registered handlers.
   * Useful for introspection and debugging handler registrations.
   *
   * @returns A readonly array of all registered handler signatures
   */
  getHandlerSignatures(): Readonly<HandlerSignature[]>;
}
