import { EventSignature } from './event-handler.interface';

export interface IEventHandlerSignature {
  event: EventSignature;
  metadata?: unknown;
}
