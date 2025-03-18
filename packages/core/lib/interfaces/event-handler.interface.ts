import { IEvent } from './event.interface';

export enum EventHandlerScope {
  SINGLETON = 'singleton',
  SCOPED = 'scoped',
}

export type EventSignature = new (...args: any[]) => IEvent;
export type EventOption =
  | EventSignature
  | {
      event: EventSignature;
      metadata?: unknown;
    };

export interface EventHandlerProviderOptions {
  scope?: EventHandlerScope;
}

export interface IEventHandler<TEvent extends IEvent = IEvent, TContext = void> {
  handle(event: TEvent, context: TContext): void;
}
