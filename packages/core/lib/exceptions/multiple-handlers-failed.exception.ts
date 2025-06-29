export interface MultipleHandlersFailedExceptionFailure {
  index: number;
  error: unknown;
}

export class MultipleHandlersFailedException extends Error {
  public readonly failures: Array<MultipleHandlersFailedExceptionFailure>;

  constructor(failures: Array<MultipleHandlersFailedExceptionFailure>, eventName?: string, routingMetadata?: unknown) {
    const eventInfo = eventName ? ` for event '${eventName}'` : '';
    const routingInfo = routingMetadata ? ` with routing metadata '${JSON.stringify(routingMetadata)}'` : '';
    const failureCount = failures.length;

    super(`${failureCount} handler(s) failed${eventInfo}${routingInfo}. See 'failures' property for details.`);

    this.failures = failures;
    this.name = 'MultipleHandlersFailedException';
  }

  /**
   * Get all errors as an array
   */
  getErrors(): unknown[] {
    return this.failures.map(({ error }) => error);
  }
}
