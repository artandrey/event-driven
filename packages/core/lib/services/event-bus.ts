import { HandlerNotFoundException, MultipleHandlersFoundException, PublisherNotSetException } from '../exceptions';
import { defaultGetEventName } from '../helpers/default-get-event-name';
import { IEvent, IEventBus, IEventHandler, IEventPublisher, IHandlerRegister, Type } from '../interfaces';
import { IHandlerCallOptions } from '../interfaces/handler-call-options.interface';

export type EventHandlerType<TEvent extends IEvent = IEvent> = Type<IEventHandler<TEvent>>;

export class EventBus<TEvent extends IEvent = IEvent> implements IEventBus<TEvent> {
  protected _pubsub: IEventPublisher | null = null;

  constructor(private readonly handlersRegister: IHandlerRegister<IEventHandler<TEvent>>) {}

  get publisher(): IEventPublisher {
    if (!this._pubsub) {
      throw new PublisherNotSetException();
    }
    return this._pubsub;
  }

  set publisher(_publisher: IEventPublisher) {
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

  async synchronouslyConsumeByStrictlySingleHandler(event: TEvent, options?: IHandlerCallOptions): Promise<void> {
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

  async synchronouslyConsumeByMultipleHandlers(event: TEvent, options?: IHandlerCallOptions): Promise<void> {
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
