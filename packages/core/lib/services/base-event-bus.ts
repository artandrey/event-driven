import {
  HandlerNotFoundException,
  MultipleHandlersFailedException,
  MultipleHandlersFoundException,
  PublisherNotSetException,
} from '../exceptions';
import { EventBus, Handlable, Handler, HandlerCallOptions, HandlerRegister, Publisher, Type } from '../interfaces';
import { HandlingResult } from '../interfaces/event-bus.interface';

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
      throw new HandlerNotFoundException(this.getHandlableName(handlable), options?.routingMetadata);
    }
    if (handlers.length !== 1) {
      throw new MultipleHandlersFoundException(
        this.getHandlableName(handlable),
        options?.routingMetadata,
        handlers.length,
      );
    }
    if (options?.context) {
      return { result: (await handlers[0].handle(handlable, options.context)) as TResult };
    }
    return { result: (await handlers[0].handle(handlable)) as TResult };
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
      throw new HandlerNotFoundException(this.getHandlableName(handlable), options?.routingMetadata);
    }

    const results = await Promise.allSettled(
      handlers
        .map((handler) => {
          if (options?.context) {
            return handler.handle(handlable, options.context);
          }
          return handler.handle(handlable);
        })
        .map((result) => ({ result: result as TResult })),
    );

    const failures = results
      .map((result, index) => ({ result, index }))
      .filter(({ result }) => result.status === 'rejected')
      .map(({ result, index }) => ({
        index,
        error: (result as PromiseRejectedResult).reason,
      }));

    if (failures.length > 0) {
      throw new MultipleHandlersFailedException(failures, this.getHandlableName(handlable), options?.routingMetadata);
    }

    return handlers.map((handler) => ({
      result: handler.handle(handlable),
    })) as HandlingResult<TResult>[];
  }

  private getHandlableName(handlable: THandlable): string {
    return handlable.constructor.name;
  }
}
