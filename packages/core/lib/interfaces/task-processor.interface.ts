import { Handler } from './handler.interface';
import { Task } from './task.interface';

/**
 * Interface for task processors in the event-driven architecture.
 *
 * A TaskProcessor specializes the generic Handler interface for processing Tasks.
 * Unlike EventHandlers which typically return void, TaskProcessors are designed to
 * return results from their processing. Tasks represent work that needs to be done,
 * and TaskProcessors perform that work and return the outcome.
 *
 * @template TTask - The specific task type this processor handles (must extend Task)
 * @template TResult - The type of result returned by the processor (defaults to unknown)
 * @template TContext - The type of context object passed to the processor (defaults to unknown)
 *
 * @example
 * ```typescript
 * // Basic task processor
 * interface CalculateOrderTotalTask extends Task<{ items: OrderItem[] }> {}
 *
 * class OrderTotalProcessor implements TaskProcessor<CalculateOrderTotalTask, number> {
 *   handle(task: CalculateOrderTotalTask): number {
 *     return task.payload.items.reduce((sum, item) => sum + item.price, 0);
 *   }
 * }
 *
 * // Async task processor with context
 * interface ProcessPaymentTask extends Task<{ amount: number; userId: string }> {}
 *
 * class PaymentProcessor implements TaskProcessor<ProcessPaymentTask, PaymentResult, RequestContext> {
 *   async handle(task: ProcessPaymentTask, context?: RequestContext): Promise<PaymentResult> {
 *     const payment = await this.paymentService.processPayment(
 *       task.payload.amount,
 *       task.payload.userId,
 *       context?.requestId
 *     );
 *     return { paymentId: payment.id, status: payment.status };
 *   }
 * }
 * ```
 *
 * @see {@link Handler} for the base handler interface
 * @see {@link Task} for task definitions
 * @see {@link EventHandler} for event-specific handlers
 */
export interface TaskProcessor<TTask extends Task = Task, TResult = unknown, TContext = unknown>
  extends Handler<TTask, TResult, TContext> {
  /**
   * Processes the given task with optional context and returns a result.
   *
   * @param task - The task to be processed
   * @param context - Optional context information for scoped processing
   * @returns The result of processing the task (can be synchronous or asynchronous)
   */
  handle(task: TTask, context?: TContext): TResult | Promise<TResult>;
}
