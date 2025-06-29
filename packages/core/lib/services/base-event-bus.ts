import {
  HandlerNotFoundException,
  MultipleHandlersFailedException,
  MultipleHandlersFoundException,
  PublisherNotSetException,
} from '../exceptions';
import { defaultGetEventName } from '../helpers/default-get-event-name';
import { Event, EventBus, EventHandler, EventPublisher, HandlerRegister, Type } from '../interfaces';
import { HandlerCallOptions } from '../interfaces/handler-call-options.interface';

export type EventHandlerType<TEvent extends Event = Event> = Type<EventHandler<TEvent>>;

export class BaseEventBus<TEvent extends Event = Event> implements EventBus<TEvent> {
  protected _pubsub: EventPublisher<TEvent> | null = null;

  constructor(private readonly handlersRegister: HandlerRegister<EventHandler<TEvent>>) {}

  get publisher(): EventPublisher<TEvent> {
    if (!this._pubsub) {
      throw new PublisherNotSetException();
    }
    return this._pubsub;
  }

  set publisher(_publisher: EventPublisher<TEvent>) {
    this._pubsub = _publisher;
  }

  publish<T extends TEvent>(event: T) {
    if (!this._pubsub) {
      throw new PublisherNotSetException();
    }
    return this._pubsub.publish(event);
  }

  publishAll<T extends TEvent>(events: T[]) {
    if (!this._pubsub) {
      throw new PublisherNotSetException();
    }

    if (this._pubsub.publishAll) {
      return this._pubsub.publishAll(events);
    }
    return (events || []).map((event) => this._pubsub!.publish(event));
  }

  protected getEventName(event: TEvent) {
    return defaultGetEventName(event);
  }

  async synchronouslyConsumeByStrictlySingleHandler(event: TEvent, options?: HandlerCallOptions): Promise<void> {
    const handlers = await this.handlersRegister.get({
      event,
      context: options?.context,
      routingMetadata: options?.routingMetadata,
    });

    if (!handlers || handlers.length === 0) {
      throw new HandlerNotFoundException(this.getEventName(event), options?.routingMetadata);
    }
    if (handlers.length !== 1) {
      throw new MultipleHandlersFoundException(this.getEventName(event), options?.routingMetadata, handlers.length);
    }
    if (options?.context) {
      return await handlers[0].handle(event, options.context);
    }
    return await handlers[0].handle(event);
  }

  async synchronouslyConsumeByMultipleHandlers(event: TEvent, options?: HandlerCallOptions): Promise<void> {
    const handlers = await this.handlersRegister.get({
      event,
      context: options?.context,
      routingMetadata: options?.routingMetadata,
    });
    if (!handlers || handlers.length === 0) {
      throw new HandlerNotFoundException(this.getEventName(event), options?.routingMetadata);
    }

    const results = await Promise.allSettled(
      handlers.map((handler) => {
        if (options?.context) {
          return handler.handle(event, options.context);
        }
        return handler.handle(event);
      }),
    );

    const failures = results
      .map((result, index) => ({ result, index }))
      .filter(({ result }) => result.status === 'rejected')
      .map(({ result, index }) => ({
        index,
        error: (result as PromiseRejectedResult).reason,
      }));

    if (failures.length > 0) {
      throw new MultipleHandlersFailedException(failures, this.getEventName(event), options?.routingMetadata);
    }
  }
}
