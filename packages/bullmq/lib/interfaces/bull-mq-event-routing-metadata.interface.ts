import { BULL_MQ_EVENT_ROUTING_METADATA_KEY } from '../util/map-bull-mq-event-to-routing-metadata';

export interface BullMqEventRoutingMetadata {
  [BULL_MQ_EVENT_ROUTING_METADATA_KEY]: true;
  queueName: string;
  name: string;
}
