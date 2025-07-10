import { HandlerNotFoundException, MultipleHandlersFoundException, PublisherNotSetException } from '../exceptions';
import { EventBus, HandlerRegister, Publisher, Type } from '../interfaces';
import { HandlingResult } from '../interfaces/event-bus.interface';
import { Handlable } from '../interfaces/handlable.interface';
import { HandlerCallOptions } from '../interfaces/handler-call-options.interface';
import { Handler } from '../interfaces/handler.interface';

export type EventHandlerType<THandlable extends Handlable = Handlable> = Type<Handler<THandlable>>;

export class BaseEventBus<THandlable extends Handlable = Handlable, TResult = unknown>
  implements EventBus<THandlable, TResult>
{
  protected _publisher: Publisher<THandlable> | null = null;

  constructor(private readonly handlersRegister: HandlerRegister<Handler<THandlable>>) {}

  get publisher(): Publisher<THandlable> {
    if (!this._publisher) {
      throw new PublisherNotSetException();
    }
    return this._publisher;
  }

  public setPublisher(publisher: Publisher<THandlable>) {
    this._publisher = publisher;
  }

  public publish<T extends THandlable>(handlable: T) {
    if (!this._publisher) {
      throw new PublisherNotSetException();
    }
    return this._publisher.publish(handlable);
  }

  public publishAll<T extends THandlable>(handlables: T[]) {
    if (!this._publisher) {
      throw new PublisherNotSetException();
    }

    return this._publisher.publishAll(handlables);
  }

  public async synchronouslyConsumeByStrictlySingleHandler(
    handlable: THandlable,
    options?: HandlerCallOptions,
  ): Promise<HandlingResult<TResult>> {
    const handlers = await this.handlersRegister.get({
      handlable: handlable,
      context: options?.context,
      routingMetadata: options?.routingMetadata,
    });

    if (!handlers || handlers.length === 0) {
      throw new HandlerNotFoundException();
    }
    if (handlers.length !== 1) {
      throw new MultipleHandlersFoundException();
    }
    return {
      result: (await handlers[0].handle(handlable)) as TResult,
    };
  }

  public async synchronouslyConsumeByMultipleHandlers(
    handlable: THandlable,
    options?: HandlerCallOptions,
  ): Promise<HandlingResult<TResult>[]> {
    const handlers = await this.handlersRegister.get({
      handlable: handlable,
      context: options?.context,
      routingMetadata: options?.routingMetadata,
    });
    if (!handlers || handlers.length === 0) {
      throw new HandlerNotFoundException();
    }
    return handlers.map((handler) => ({
      result: handler.handle(handlable),
    })) as HandlingResult<TResult>[];
  }
}
