import { BULL_MQ_EVENT_ROUTING_METADATA_KEY } from '../util/map-bull-mq-event-to-routing-metadata';

export interface BullMqEventRoutingMetadataProperties {
  queueName: string;
  name: string;
}

export interface BullMqEventRoutingMetadata extends BullMqEventRoutingMetadataProperties {
  [BULL_MQ_EVENT_ROUTING_METADATA_KEY]: true;
}
