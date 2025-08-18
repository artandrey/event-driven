import { EventsRegisterService } from 'packages/bullmq/lib/services/register/events-register.service';

import { createTask } from '../../__fixtures__/create-task';
import { generateJobName } from '../../__fixtures__/generate-literals';
import { generateQueueName } from '../../__fixtures__/generate-literals';

describe('TasksRegisterService', () => {
  let eventsRegisterService: EventsRegisterService;

  beforeEach(() => {
    eventsRegisterService = new EventsRegisterService();
  });

  it('should add BullMqTask type to register', () => {
    const testTask = createTask(generateJobName(1), {}, generateQueueName(1), {});
    eventsRegisterService.register(testTask.class);
    expect(eventsRegisterService.getType({ queueName: generateQueueName(1), name: generateJobName(1) })).toBe(
      testTask.class,
    );
  });
});
