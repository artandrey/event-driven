import { BaseEventBus, BaseHandlerRegister } from '@event-driven-architecture/core';
import { BullMqFanoutTask } from 'packages/bullmq/lib';
import { HandlesBullMq } from 'packages/bullmq/lib/util';

import { createTaskProcessor } from '../__fixtures__/task-processor';

describe('BullMQ Fanout handler routing', () => {
  let eventBus: BaseEventBus<BullMqFanoutTask>;
  let handlerRegister: BaseHandlerRegister;

  const QUEUE_A = 'queue-a';
  const QUEUE_B = 'queue-b';
  const JOB_NAME = 'test-job';

  interface TestPayload {
    data: string;
  }

  class TestFanoutTask extends BullMqFanoutTask<TestPayload> {
    constructor(payload: TestPayload) {
      super({ name: JOB_NAME, jobOptions: { attempts: 1 }, payload });
    }
  }

  const { processor: QueueAHandler, handleSpy: queueAHandleSpy } = createTaskProcessor<TestPayload, void>();
  const { processor: QueueBHandler, handleSpy: queueBHandleSpy } = createTaskProcessor<TestPayload, void>();

  beforeEach(() => {
    handlerRegister = new BaseHandlerRegister();
    eventBus = new BaseEventBus(handlerRegister);

    vi.resetAllMocks();
  });

  it('should route fanout task to correct handler based on routing metadata', async () => {
    handlerRegister.addHandler(
      HandlesBullMq(TestFanoutTask, { queueName: QUEUE_A, name: JOB_NAME }),
      new QueueAHandler(),
    );
    handlerRegister.addHandler(
      HandlesBullMq(TestFanoutTask, { queueName: QUEUE_B, name: JOB_NAME }),
      new QueueBHandler(),
    );

    const taskA = new TestFanoutTask({ data: 'test-payload' });
    taskA._setAssignedQueueName(QUEUE_A);

    const resultA = await eventBus.synchronouslyConsumeByStrictlySingleHandler(taskA, {
      routingMetadata: { queueName: QUEUE_A, name: JOB_NAME },
    });

    expect(resultA.isSuccess()).toBe(true);
    expect(queueAHandleSpy).toHaveBeenCalledWith(taskA);
    expect(queueBHandleSpy).not.toHaveBeenCalledWith(taskA);

    const taskB = new TestFanoutTask({ data: 'test-payload' });
    taskB._setAssignedQueueName(QUEUE_B);
    const resultB = await eventBus.synchronouslyConsumeByStrictlySingleHandler(taskB, {
      routingMetadata: { queueName: QUEUE_B, name: JOB_NAME },
    });

    expect(resultB.isSuccess()).toBe(true);
    expect(queueBHandleSpy).toHaveBeenCalledWith(taskB);
    expect(queueAHandleSpy).not.toHaveBeenCalledWith(taskB);
  });

  it('should fail to find handler when routing metadata does not match any registered handler', async () => {
    handlerRegister.addHandler(
      HandlesBullMq(TestFanoutTask, { queueName: QUEUE_A, name: JOB_NAME }),
      new QueueAHandler(),
    );

    const task = new TestFanoutTask({ data: 'test-payload' });

    // Call event bus with routing metadata for unregistered queue
    const result = await eventBus.synchronouslyConsumeByStrictlySingleHandler(task, {
      routingMetadata: { queueName: 'unregistered-queue', name: JOB_NAME },
    });

    expect(result.isError()).toBe(true);
    expect(result.getValueOrThrow).toThrow();
  });

  it('should fail when multiple handlers are registered for the same routing metadata', async () => {
    const metadata = { queueName: QUEUE_A, name: JOB_NAME };

    handlerRegister.addHandler(HandlesBullMq(TestFanoutTask, metadata), new QueueAHandler());
    handlerRegister.addHandler(HandlesBullMq(TestFanoutTask, metadata), new QueueBHandler());

    const task = new TestFanoutTask({ data: 'test-payload' });

    const result = await eventBus.synchronouslyConsumeByStrictlySingleHandler(task, {
      routingMetadata: metadata,
    });

    expect(result.isError()).toBe(true);
    expect(result.getValueOrThrow).toThrow();
  });
});
