import { HandlableSignature } from './handlable-signature.interface';

export interface HandlerSignature {
  handles: HandlableSignature;
  routingMetadata?: unknown;
}
