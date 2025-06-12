import { BullMqEvent } from 'packages/bullmq/lib/events/bull-mq.event';
import { EventsRegisterService } from 'packages/bullmq/lib/services/register/events-register.service';

describe.only('EventsRegisterService', () => {
  let eventsRegisterService: EventsRegisterService;

  beforeEach(() => {
    eventsRegisterService = new EventsRegisterService();
  });

  it('should add BullMqEvent type to register', () => {
    class TestEvent extends BullMqEvent {
      constructor(payload: object) {
        super({ queueName: 'test', name: 'test', jobOptions: {}, payload });
      }
    }
    eventsRegisterService.register(TestEvent);
    expect(eventsRegisterService.getType({ queueName: 'test', name: 'test' })).toBe(TestEvent);
  });
});
