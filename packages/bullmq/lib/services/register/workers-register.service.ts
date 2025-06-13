import { Worker } from 'bullmq';

import { EntityRegisterService } from './entity-register.service';

export class WorkerRegisterService extends EntityRegisterService<Worker, string> {
  protected getKey(entity: Worker): string {
    return entity.name;
  }

  protected serializeKey(key: string): string {
    return key;
  }
}
