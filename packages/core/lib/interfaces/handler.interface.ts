import { Handlable } from './handlable.interface';

/**
 * Generic interface for processing handlables in the event-driven architecture.
 *
 * A Handler defines the contract for processing any type of handlable (events, tasks, or custom handlables).
 * Handlers can optionally return results and receive context information for scoped processing.
 * Both synchronous and asynchronous processing are supported.
 *
 * @template THandlable - The specific type of handlable this handler processes (must extend Handlable)
 * @template TResult - The type of result returned by the handler (defaults to unknown)
 * @template TContext - The type of context object passed to the handler (defaults to unknown)
 *
 * @example
 * ```typescript
 * // Synchronous handler
 * class UserCreatedHandler implements Handler<UserCreatedEvent, void> {
 *   handle(event: UserCreatedEvent): void {
 *     console.log('User created:', event.payload.userId);
 *   }
 * }
 *
 * // Asynchronous handler with result
 * class OrderTotalCalculator implements Handler<CalculateOrderTask, number> {
 *   async handle(task: CalculateOrderTask): Promise<number> {
 *     const total = await this.calculateTotal(task.payload.items);
 *     return total;
 *   }
 * }
 *
 * // Handler with context
 * class AuditEventHandler implements Handler<AuditEvent, void, RequestContext> {
 *   handle(event: AuditEvent, context?: RequestContext): void {
 *     console.log('Audit event', event.payload, 'from request', context?.requestId);
 *   }
 * }
 * ```
 *
 * @see {@link EventHandler} for event-specific handlers
 * @see {@link TaskProcessor} for task-specific handlers
 */
export interface Handler<THandlable extends Handlable, TResult = unknown, TContext = unknown> {
  /**
   * Processes the given handlable with optional context.
   *
   * @param handlable - The handlable to be processed
   * @param context - Optional context information for scoped processing
   * @returns The result of processing (can be synchronous or asynchronous)
   */
  handle(handlable: THandlable, context?: TContext): TResult | Promise<TResult>;
}
