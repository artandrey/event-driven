import { Handlable } from './handlable.interface';

/**
 * Interface for tasks in the event-driven architecture.
 *
 * Tasks represent work that needs to be done in your application. Unlike Events which
 * represent things that have already happened, Tasks are actionable items that require
 * processing and typically return results. Tasks extend the generic Handlable interface
 * to specialize it for work-oriented semantics.
 *
 * Tasks are processed by TaskProcessors, which can return results indicating the outcome
 * of the work performed.
 *
 * @template TPayload - The type of data contained in the task payload (defaults to object)
 *
 * @example
 * ```typescript
 * // Define a task payload
 * interface CalculateOrderTotalPayload {
 *   orderId: string;
 *   items: Array<{ price: number; quantity: number }>;
 * }
 *
 * // Create a task implementation
 * class CalculateOrderTotalTask implements Task<CalculateOrderTotalPayload> {
 *   constructor(public readonly payload: CalculateOrderTotalPayload) {}
 * }
 *
 * // Usage
 * const task = new CalculateOrderTotalTask({
 *   orderId: 'order-123',
 *   items: [{ price: 10.99, quantity: 2 }]
 * });
 * ```
 *
 * @see {@link Handlable} for the base handlable interface
 * @see {@link TaskProcessor} for task processing
 * @see {@link Event} for event-specific handlables
 */
export interface Task<TPayload extends object = object> extends Handlable<TPayload> {}
