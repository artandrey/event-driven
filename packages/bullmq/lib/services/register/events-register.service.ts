import { Type } from '@event-driven-architecture/core';

import { BullMqEvent } from '../../events/bull-mq.event';

export interface BullMqEventKey {
  queueName: string;
  name: string;
}

export class EventsRegisterService {
  private readonly keyClassTypeMap = new Map<string, Type<BullMqEvent>>();
  protected getKey(entity: BullMqEvent): BullMqEventKey {
    return {
      queueName: entity.queueName,
      name: entity.name,
    };
  }

  protected serializeKey(key: BullMqEventKey): string {
    return `${key.queueName}:${key.name}`;
  }

  getType(key: BullMqEventKey): Type<BullMqEvent> {
    const type = this.keyClassTypeMap.get(this.serializeKey(key));
    if (!type) {
      throw new Error(`Event type not found for name: ${key.name} and queue: ${key.queueName}`);
    }
    return type;
  }

  public register(eventType: Type<BullMqEvent>): void {
    const instance = new eventType();
    const key = this.getKey(instance);
    const serializedKey = this.serializeKey(key);
    this.keyClassTypeMap.set(serializedKey, eventType);
  }
}
