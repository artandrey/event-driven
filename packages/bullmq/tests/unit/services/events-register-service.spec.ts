import { EventsRegisterService } from 'packages/bullmq/lib/services/register/events-register.service';

import { BullMqTask } from '../../../lib/tasks/bull-mq.task';

describe('EventsRegisterService', () => {
  let eventsRegisterService: EventsRegisterService;

  beforeEach(() => {
    eventsRegisterService = new EventsRegisterService();
  });

  it('should add BullMqEvent type to register', () => {
    class TestEvent extends BullMqTask {
      constructor(payload: object) {
        super({ queueName: 'test', name: 'test', jobOptions: {}, payload });
      }
    }
    eventsRegisterService.register(TestEvent);
    expect(eventsRegisterService.getType({ queueName: 'test', name: 'test' })).toBe(TestEvent);
  });
});
