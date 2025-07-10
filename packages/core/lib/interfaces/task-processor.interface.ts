import { Handler } from './handler.interface';
import { Task } from './task.interface';

export interface TaskProcessor<TTask extends Task = Task, TResult = unknown, TContext = unknown>
  extends Handler<TTask, TResult, TContext> {
  handle(task: TTask, context?: TContext): TResult | Promise<TResult>;
}
