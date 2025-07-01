import { HandlerNotFoundException, MultipleHandlersFoundException, PublisherNotSetException } from '../exceptions';
import { defaultGetEventName } from '../helpers/default-get-event-name';
import { Event, EventBus, EventHandler, EventPublisher, HandlerRegister, Type } from '../interfaces';
import { HandlerCallOptions } from '../interfaces/handler-call-options.interface';

export type EventHandlerType<TEvent extends Event = Event> = Type<EventHandler<TEvent>>;

export class BaseEventBus<TEvent extends Event = Event> implements EventBus<TEvent> {
  protected _publisher: EventPublisher<TEvent> | null = null;

  constructor(private readonly handlersRegister: HandlerRegister<EventHandler<TEvent>>) {}

  get publisher(): EventPublisher<TEvent> {
    if (!this._publisher) {
      throw new PublisherNotSetException();
    }
    return this._publisher;
  }

  public setPublisher(publisher: EventPublisher<TEvent>) {
    this._publisher = publisher;
  }

  public publish<T extends TEvent>(event: T) {
    if (!this._publisher) {
      throw new PublisherNotSetException();
    }
    return this._publisher.publish(event);
  }

  public publishAll<T extends TEvent>(events: T[]) {
    if (!this._publisher) {
      throw new PublisherNotSetException();
    }

    return this._publisher.publishAll(events);
  }

  protected getEventName(event: TEvent) {
    return defaultGetEventName(event);
  }

  public async synchronouslyConsumeByStrictlySingleHandler(event: TEvent, options?: HandlerCallOptions): Promise<void> {
    const handlers = await this.handlersRegister.get({
      event,
      context: options?.context,
      routingMetadata: options?.routingMetadata,
    });

    if (!handlers || handlers.length === 0) {
      throw new HandlerNotFoundException();
    }
    if (handlers.length !== 1) {
      throw new MultipleHandlersFoundException();
    }
    return handlers[0].handle(event);
  }

  public async synchronouslyConsumeByMultipleHandlers(event: TEvent, options?: HandlerCallOptions): Promise<void> {
    const handlers = await this.handlersRegister.get({
      event,
      context: options?.context,
      routingMetadata: options?.routingMetadata,
    });
    if (!handlers || handlers.length === 0) {
      throw new HandlerNotFoundException();
    }
    return handlers.forEach((handler) => handler.handle(event));
  }
}
