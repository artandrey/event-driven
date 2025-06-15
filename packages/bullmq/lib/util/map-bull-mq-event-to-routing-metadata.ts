import { BullMqEvent } from '../events';
import { BullMqEventRoutingMetadata } from '../interfaces/bull-mq-event-routing-metadata.interface';

export const BULL_MQ_EVENT_ROUTING_METADATA_KEY = Symbol('BULL_MQ_EVENT_ROUTING_METADATA_KEY');

export function isBullMqEventRoutingMetadata(metadata: unknown): metadata is BullMqEventRoutingMetadata {
  if (metadata && typeof metadata === 'object' && (metadata as any)[BULL_MQ_EVENT_ROUTING_METADATA_KEY] === true) {
    return true;
  }
  return false;
}

export function mapBullMqEventToRoutingMetadata(event: BullMqEvent): BullMqEventRoutingMetadata {
  return {
    [BULL_MQ_EVENT_ROUTING_METADATA_KEY]: true,
    queueName: event.$queueName,
    name: event.$name,
  };
}
