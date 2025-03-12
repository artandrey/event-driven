import { Type } from '../interfaces';
import { EventOption } from '../interfaces/event-handler.interface';
import { IHandlerRegister } from '../interfaces/handler-register.interface';
import { IEventHandlerSignature } from '../interfaces/handler-signature.interface';

export class BaseHandlerRegister<T, TypeT extends Type<T> = Type<T>> implements IHandlerRegister<T, TypeT> {
  private handlers = new Map<string, Set<T>>();
  private scopedHandlers = new Map<string, Set<TypeT>>();
  private handlersSignatures: IEventHandlerSignature[] = [];

  addHandler(handlerKey: string, instance: T): void {
    const set = this.handlers.get(handlerKey) ?? new Set();
    this.handlers.set(handlerKey, set.add(instance));
  }

  addScopedHandler(handlerKey: string, handler: TypeT): void {
    const set = this.scopedHandlers.get(handlerKey) ?? new Set();
    this.scopedHandlers.set(handlerKey, set.add(handler));
  }

  addHandlerSignature(signature: IEventHandlerSignature): void {
    this.handlersSignatures.push(signature);
  }

  async get<E>(event: E, context?: object): Promise<T[] | undefined> {
    const eventName = this.getName(event);

    const handlerKey = this.buildHandlerKey(eventName);
    const singletonHandlers = [...(this.handlers.get(handlerKey) ?? [])];

    const handlerTypes = this.scopedHandlers.get(handlerKey);
    if (!handlerTypes) return singletonHandlers;

    const scopedHandlers = await this.getScopedHandlers(handlerTypes, context);
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

  getName<E>(event: E): string {
    const { constructor } = Object.getPrototypeOf(event);

    return constructor.name as string;
  }

  getHandlerSignatures(): Readonly<IEventHandlerSignature[]> {
    return this.handlersSignatures;
  }

  private buildHandlerKey(eventName: string): string;
  private buildHandlerKey(eventOptions: EventOption): string;
  private buildHandlerKey(event: EventOption | string): string {
    if (typeof event === 'string') {
      return event;
    }
    if (typeof event === 'function') {
      return event.name;
    }
    return event.event.name;
  }
}
