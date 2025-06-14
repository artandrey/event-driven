import { Type } from '../interfaces';
import { IHandlerRegister, IHandlerRetrievalOptions } from '../interfaces/handler-register.interface';
import { IEventHandlerSignature } from '../interfaces/handler-signature.interface';
import { ObjectHashMap } from '../util/object-hash-map';

export interface IHandlerKey {
  event: string;
  routingMetadata: unknown;
}

export class BaseHandlerRegister<T, TypeT extends Type<T> = Type<T>> implements IHandlerRegister<T, TypeT> {
  private handlers = new ObjectHashMap<IHandlerKey, Set<T>>();
  private scopedHandlers = new ObjectHashMap<IHandlerKey, Set<TypeT>>();
  private handlersSignatures: IEventHandlerSignature[] = [];

  public addHandler(handlerSignature: IEventHandlerSignature, instance: T): void {
    const handlerKey = this.handlerSignatureToHandlerKey(handlerSignature);
    const set = this.handlers.get(handlerKey) ?? new Set();
    this.handlers.set(handlerKey, set.add(instance));
    this.addHandlerSignature(handlerSignature);
  }

  public addScopedHandler(handlerSignature: IEventHandlerSignature, handler: TypeT): void {
    const handlerKey = this.handlerSignatureToHandlerKey(handlerSignature);
    const set = this.scopedHandlers.get(handlerKey) ?? new Set();
    this.scopedHandlers.set(handlerKey, set.add(handler));
    this.addHandlerSignature(handlerSignature);
  }

  private addHandlerSignature(signature: IEventHandlerSignature): void {
    this.handlersSignatures.push(signature);
  }

  public async get<E>(options: IHandlerRetrievalOptions<E>): Promise<T[] | undefined> {
    const handlerKey = this.handlerRetrievalOptionsToHandlerKey(options);
    const singletonHandlers = [...(this.handlers.get(handlerKey) ?? [])];

    const handlerTypes = this.scopedHandlers.get(handlerKey);

    if (!handlerTypes) return singletonHandlers;

    const scopedHandlers = await this.getScopedHandlers(handlerTypes, options.context);
    return [...singletonHandlers, ...scopedHandlers];
  }

  /**
   * Gets scoped handler instances with the provided context
   * This method should be overridden by subclasses to provide specific context handling
   * @param handlerTypes Set of handler types to resolve
   * @param context Optional context for scoped handlers
   * @returns A promise that resolves to an array of handler instances
   */
  protected async getScopedHandlers(handlerTypes: Set<TypeT>, context?: object): Promise<T[]> {
    const instances: T[] = [];
    handlerTypes.forEach((handlerType) => {
      instances.push(new handlerType(context));
    });
    return instances;
  }

  private getName<E>(event: E): string {
    const { constructor } = Object.getPrototypeOf(event);

    return constructor.name as string;
  }

  private handlerSignatureToHandlerKey(handlerSignature: IEventHandlerSignature): IHandlerKey {
    return {
      event: handlerSignature.event.name,
      routingMetadata: handlerSignature.routingMetadata,
    };
  }

  private handlerRetrievalOptionsToHandlerKey(options: IHandlerRetrievalOptions): IHandlerKey {
    return {
      event: this.getName(options.event),
      routingMetadata: options.routingMetadata,
    };
  }

  public getHandlerSignatures(): Readonly<IEventHandlerSignature[]> {
    return this.handlersSignatures;
  }
}
