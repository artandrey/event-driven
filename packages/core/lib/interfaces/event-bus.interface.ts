import { IEvent } from './event.interface';
import { IHandlerCallOptions } from './handler-call-options.interface';

export interface IEventBus<TEvent extends IEvent = IEvent> {
  /**
   * Publishes an event.
   * @param event The event to be published
   */
  publish<T extends TEvent>(event: T): void;
  /**
   * Publishes all events.
   * @param events The events to be published
   */
  publishAll(events: TEvent[]): void;

  /**
   * Consumes an event by exactly one handler. If there are multiple or none handlers available
   * for this event type, an error will be thrown. This ensures strict single-handler
   * consumption of events.
   * @param event The event to be consumed
   * @param options Optional handler call options
   * @throws Error when more than one handler is found for the event
   * @returns Promise that resolves when the event is handled
   */
  synchronouslyConsumeByStrictlySingleHandler(event: TEvent, options?: IHandlerCallOptions): Promise<void>;
  /**
   * Consumes an event by multiple handlers. If there are no handlers available for the event type,
   * an error will be thrown.
   * @param event The event to be consumed
   * @param options Optional handler call options
   * @throws Error when no handlers are found for the event
   * @returns Promise that resolves when all handlers are executed
   */
  synchronouslyConsumeByMultipleHandlers(event: TEvent, options?: IHandlerCallOptions): Promise<void>;
}
