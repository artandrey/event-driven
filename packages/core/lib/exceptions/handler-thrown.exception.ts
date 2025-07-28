import { BaseException } from './base.exception';

export class HandlerThrownException extends BaseException('HandlerThrownException') {
  private readonly _originalError: unknown;

  constructor(eventName: string, routingMetadata: unknown, error: unknown) {
    super(`Handler thrown an error for event ${eventName} with routing metadata ${routingMetadata}`);
    this._originalError = error;
  }

  public get originalError(): unknown {
    return this._originalError;
  }
}
