import { Event } from './event.interface';
import { Handler } from './handler.interface';

export interface EventHandler<TEvent extends Event = Event, TContext = void> extends Handler<TEvent, void, TContext> {
  handle(event: TEvent, context: TContext): void | Promise<void>;
}
