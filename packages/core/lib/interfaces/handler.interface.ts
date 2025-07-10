import { Handlable } from './handlable.interface';

export interface Handler<THandlable extends Handlable, TResult = unknown, TContext = unknown> {
  handle(handlable: THandlable, context?: TContext): TResult | Promise<TResult>;
}
