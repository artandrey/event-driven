import { Handlable } from './handlable.interface';

export interface Publisher<THandlable extends Handlable = Handlable> {
  /**
   * Publishes a handlable.
   * @param handlable The handlable to be published
   */
  publish<T extends THandlable>(handlable: T): void;
  /**
   * Publishes all handlables.
   * @param handlables The handlables to be published
   */
  publishAll(handlables: THandlable[]): void;
}
