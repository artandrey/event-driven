import { HandlerSignature, Type } from '@event-driven-architecture/core';

import { BullMqTask } from '../tasks';
import { mapBullMqEventToRoutingMetadata } from './map-bull-mq-event-to-routing-metadata';

export function mapBullMqEventToHandlerSignature(event: Type<BullMqTask>): HandlerSignature {
  const instance = new event();
  return {
    handles: event,
    routingMetadata: mapBullMqEventToRoutingMetadata(instance),
  };
}
