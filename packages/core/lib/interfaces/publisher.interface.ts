import { Handlable } from './handlable.interface';

/**
 * Interface for publishing handlables to external systems.
 *
 * Publishers are responsible for forwarding handlables (events, tasks, etc.) to external
 * message brokers, queues, or other systems. They implement the outbound communication
 * pattern in the event-driven architecture.
 *
 * Publishers must be registered with the EventBus using `setPublisher()` before any
 * publishing operations can be performed.
 *
 * @template THandlable - The type of handlable this publisher can handle (defaults to any Handlable)
 *
 * @example
 * ```typescript
 * // Custom publisher implementation
 * class RabbitMQPublisher implements Publisher {
 *   constructor(private connection: Connection) {}
 *
 *   publish<T extends Handlable>(handlable: T): void {
 *     const routingKey = this.getRoutingKey(handlable);
 *     this.connection.send(routingKey, JSON.stringify(handlable));
 *   }
 *
 *   publishAll(handlables: Handlable[]): void {
 *     const batch = handlables.map(h => ({
 *       routingKey: this.getRoutingKey(h),
 *       payload: JSON.stringify(h)
 *     }));
 *     this.connection.sendBatch(batch);
 *   }
 * }
 *
 * // Register with event bus
 * const eventBus = new BaseEventBus(handlerRegister);
 * eventBus.setPublisher(new RabbitMQPublisher(connection));
 * ```
 *
 * @see {@link EventBus} for event bus integration
 * @see {@link Handlable} for handlable types
 */
export interface Publisher<THandlable extends Handlable = Handlable> {
  /**
   * Publishes a single handlable to the external system.
   *
   * @param handlable - The handlable to be published
   *
   * @example
   * ```typescript
   * publisher.publish(new UserCreatedEvent({ userId: '123' }));
   * publisher.publish(new OrderProcessingTask({ orderId: 'order-456' }));
   * ```
   */
  publish<T extends THandlable>(handlable: T): void;

  /**
   * Publishes multiple handlables to the external system in a batch operation.
   *
   * @param handlables - The handlables to be published
   *
   * @example
   * ```typescript
   * publisher.publishAll([
   *   new UserCreatedEvent({ userId: '123' }),
   *   new EmailSentEvent({ userId: '123', email: 'user@example.com' }),
   *   new OrderProcessingTask({ orderId: 'order-456' })
   * ]);
   * ```
   */
  publishAll(handlables: THandlable[]): void;
}
