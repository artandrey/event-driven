import { Event } from './event.interface';

export interface EventPublisher<TEvent extends Event = Event> {
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
