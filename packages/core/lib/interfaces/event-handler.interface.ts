import { IEvent } from './event.interface';

export type EventSignature = new (...args: any[]) => IEvent;

export interface IEventHandler<TEvent extends IEvent = IEvent, TContext = void> {
  handle(event: TEvent, context: TContext): void;
}
