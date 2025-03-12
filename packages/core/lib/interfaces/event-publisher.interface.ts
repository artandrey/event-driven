import { IEvent } from './event.interface';

export interface IEventPublisher<TEvent extends IEvent = IEvent> {
  /**
   * Publishes an event.
   * @param event The event to be published
   */
  publish<E extends TEvent>(event: E): void;
  /**
   * Publishes all events.
   * @param events The events to be published
   */
  publishAll<E extends TEvent>(events: E[]): void;
}
