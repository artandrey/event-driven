import { Handlable } from './handlable.interface';

export interface Handler<THandlable extends Handlable, TResult = unknown, TContext = void> {
  handle(handlable: THandlable, context: TContext): TResult | Promise<TResult>;
}
