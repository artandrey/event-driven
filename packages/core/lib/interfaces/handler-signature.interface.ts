import { EventSignature } from './event-handler.interface';

export interface EventHandlerSignature {
  /**
   * The class of an event that this handler processes.
   */
  event: EventSignature;
  /**
   * Optional routing metadata used by event bus to route events to the correct handler.
   */
  routingMetadata?: unknown;
}
