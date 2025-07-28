/**
 * Result wrapper returned by synchronous handlable consumption methods.
 *
 * Contains the result returned by a handler after processing a handlable.
 * This allows the event bus to return structured results from handler execution.
 *
 * @template TValue - The type of value returned by the handler
 *
 * @example
 * ```typescript
 * const result: HandlingResult<number> = await eventBus.synchronouslyConsumeByStrictlySingleHandler(
 *   new CalculateOrderTotalTask({ items: [...] })
 * );
 * console.log('Order total:', result.result); // Access the actual result
 * ```
 */
export abstract class HandlingResult<TValue = unknown, TError = unknown> {
  /**
   * The result returned by the handler after processing the handlable.
   * The type depends on what the specific handler returns.
   */
  public readonly value: TValue | null;

  /**
   * The error thrown by the handler or system during processing the handlable.
   */
  public readonly error: TError | null;

  protected constructor(value: TValue | null, error: TError | null) {
    this.value = value;
    this.error = error;
  }

  public static success<TValue = unknown>(value: TValue): SuccessfulHandlingResult<TValue> {
    return new SuccessfulHandlingResult<TValue>(value);
  }

  public static error<TError = unknown>(error: TError): FailedHandlingResult<TError> {
    return new FailedHandlingResult<TError>(error);
  }

  public abstract getValueOrThrow(): TValue;
  public abstract getValueOrNull(): TValue | null;
  public abstract getErrorOrNull(): TError | null;
  public abstract isSuccess(): boolean;
  public abstract isError(): boolean;
}

export class SuccessfulHandlingResult<TValue = unknown> extends HandlingResult<TValue, never> {
  constructor(value: TValue) {
    super(value, null);
  }

  public getValueOrThrow(): TValue {
    return this.value!;
  }

  public getValueOrNull(): TValue | null {
    return this.value;
  }

  public getErrorOrNull(): null {
    return null;
  }

  public isSuccess(): true {
    return true;
  }

  public isError(): false {
    return false;
  }
}

export class FailedHandlingResult<TError = unknown> extends HandlingResult<never, TError> {
  constructor(error: TError) {
    super(null, error);
  }

  public getValueOrThrow(): never {
    throw this.error;
  }

  public getValueOrNull(): null {
    return null;
  }

  public getErrorOrNull(): TError | null {
    return this.error;
  }

  public isSuccess(): false {
    return false;
  }

  public isError(): true {
    return true;
  }
}
