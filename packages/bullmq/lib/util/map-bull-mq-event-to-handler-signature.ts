import { HandlerSignature, Type } from '@event-driven-architecture/core';

import { BullMqEventRoutingMetadataProperties } from '../interfaces/bull-mq-event-routing-metadata.interface';
import { BullMqFanoutTask, BullMqTask } from '../tasks';
import { mapBullMqEventToRoutingMetadata } from './map-bull-mq-event-to-routing-metadata';

export function mapBullMqEventToHandlerSignature(
  fanoutTask: Type<BullMqFanoutTask>,
  routingMetadata: BullMqEventRoutingMetadataProperties,
): HandlerSignature;
export function mapBullMqEventToHandlerSignature(
  task: Type<BullMqTask>,
  routingMetadata?: BullMqEventRoutingMetadataProperties,
): HandlerSignature;
export function mapBullMqEventToHandlerSignature(
  taskOrFanoutTask: Type<BullMqTask> | Type<BullMqFanoutTask>,
  routingMetadata?: BullMqEventRoutingMetadataProperties,
): HandlerSignature {
  const instance = new taskOrFanoutTask();
  if (instance instanceof BullMqFanoutTask) {
    return {
      handles: taskOrFanoutTask,
      routingMetadata: routingMetadata,
    };
  }

  if (routingMetadata) {
    return {
      handles: taskOrFanoutTask,
      routingMetadata: routingMetadata,
    };
  }

  return {
    handles: taskOrFanoutTask,
    routingMetadata: mapBullMqEventToRoutingMetadata(instance),
  };
}
