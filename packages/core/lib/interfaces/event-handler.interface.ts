import { Event } from './event.interface';

export enum EventHandlerScope {
  SINGLETON = 'singleton',
  SCOPED = 'scoped',
}

export type EventSignature = new (...args: any[]) => Event;

export interface EventHandler<TEvent extends Event = Event, TContext = void> {
  handle(event: TEvent, context: TContext): void;
}
