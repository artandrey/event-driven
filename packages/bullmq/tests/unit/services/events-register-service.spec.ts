import { EventsRegisterService } from 'packages/bullmq/lib/services/register/events-register.service';

import { createTask } from '../../__fixtures__/create-task';

describe('TasksRegisterService', () => {
  let eventsRegisterService: EventsRegisterService;

  beforeEach(() => {
    eventsRegisterService = new EventsRegisterService();
  });

  it('should add BullMqTask type to register', () => {
    const testTask = createTask('test', {}, 'test', {});
    eventsRegisterService.register(testTask.class);
    expect(eventsRegisterService.getType({ queueName: 'test', name: 'test' })).toBe(testTask.class);
  });
});
