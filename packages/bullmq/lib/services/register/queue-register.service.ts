import { Queue } from 'bullmq';

import { QueueNotFoundException } from '../../exceptions';
import { EntityRegisterService } from './entity-register.service';

export class QueueRegisterService extends EntityRegisterService<Queue, string> {
  protected getKey(entity: Queue): string {
    return entity.name;
  }

  protected serializeKey(key: string): string {
    return key;
  }

  protected override createNotFoundException(key: string): Error {
    return new QueueNotFoundException(key);
  }
}
