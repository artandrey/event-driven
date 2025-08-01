import {
  HandlerNotFoundException,
  HandlerThrownException,
  MultipleHandlersFoundException,
  PublisherNotSetException,
} from '../exceptions';
import { EventBus, Handlable, Handler, HandlerCallOptions, HandlerRegister, Publisher, Type } from '../interfaces';
import { HandlingResult } from '../util/handling-result';

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

  public async synchronouslyConsumeByStrictlySingleHandler(handlable: THandlable, options?: HandlerCallOptions) {
    const handlers = await this.handlersRegister.get({
      handlable: handlable,
      context: options?.context,
      routingMetadata: options?.routingMetadata,
    });

    if (!handlers || handlers.length === 0) {
      return HandlingResult.error(
        new HandlerNotFoundException(this.getHandlableName(handlable), options?.routingMetadata),
      );
    }
    if (handlers.length !== 1) {
      return HandlingResult.error(
        new MultipleHandlersFoundException(this.getHandlableName(handlable), options?.routingMetadata, handlers.length),
      );
    }
    try {
      if (options?.context) {
        return HandlingResult.success((await handlers[0].handle(handlable, options.context)) as TResult);
      }
      return HandlingResult.success((await handlers[0].handle(handlable)) as TResult);
    } catch (error) {
      return HandlingResult.error(
        new HandlerThrownException(this.getHandlableName(handlable), options?.routingMetadata, error),
      );
    }
  }

  public async synchronouslyConsumeByMultipleHandlers(handlable: THandlable, options?: HandlerCallOptions) {
    const handlers = await this.handlersRegister.get({
      handlable: handlable,
      context: options?.context,
      routingMetadata: options?.routingMetadata,
    });
    if (!handlers || handlers.length === 0) {
      return [
        HandlingResult.error(new HandlerNotFoundException(this.getHandlableName(handlable), options?.routingMetadata)),
      ];
    }

    const results = await Promise.allSettled(
      handlers.map((handler) => {
        if (options?.context) {
          return handler.handle(handlable, options.context);
        }
        return handler.handle(handlable);
      }),
    );

    return results.map((result) => {
      if (result.status === 'rejected') {
        return HandlingResult.error(
          new HandlerThrownException(this.getHandlableName(handlable), options?.routingMetadata, result.reason),
        );
      }
      return HandlingResult.success(result.value as TResult);
    });
  }

  private getHandlableName(handlable: THandlable): string {
    return handlable.constructor.name;
  }
}
