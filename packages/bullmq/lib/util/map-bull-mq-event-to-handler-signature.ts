import { EventHandlerSignature, Type } from '@event-driven-architecture/core';

import { BullMqEvent } from '../events';
import { mapBullMqEventToRoutingMetadata } from './map-bull-mq-event-to-routing-metadata';

export function mapBullMqEventToHandlerSignature(event: Type<BullMqEvent>): EventHandlerSignature {
  const instance = new event();
  return {
    event: event,
    routingMetadata: mapBullMqEventToRoutingMetadata(instance),
  };
}
