import { BaseEventBus, BaseHandlerRegister } from '@event-driven-architecture/core';
import { BullMqFanoutTask } from 'packages/bullmq/lib';
import { HandlesBullMq } from 'packages/bullmq/lib/util';

import { createFanoutTask } from '../__fixtures__/create-task';
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

  const testFanoutTask = createFanoutTask<TestPayload>(JOB_NAME, { data: 'test' }, { attempts: 1 });

  const { processor: QueueAHandler, handleSpy: queueAHandleSpy } = createTaskProcessor<TestPayload, void>();
  const { processor: QueueBHandler, handleSpy: queueBHandleSpy } = createTaskProcessor<TestPayload, void>();

  beforeEach(() => {
    handlerRegister = new BaseHandlerRegister();
    eventBus = new BaseEventBus(handlerRegister);

    vi.resetAllMocks();
  });

  it('should route fanout task to correct handler based on routing metadata', async () => {
    handlerRegister.addHandler(
      HandlesBullMq(testFanoutTask.class, { queueName: QUEUE_A, name: JOB_NAME }),
      new QueueAHandler(),
    );
    handlerRegister.addHandler(
      HandlesBullMq(testFanoutTask.class, { queueName: QUEUE_B, name: JOB_NAME }),
      new QueueBHandler(),
    );

    const taskA = createFanoutTask<TestPayload>(JOB_NAME, { data: 'test-payload' }, { attempts: 1 });
    taskA.instance._setAssignedQueueName(QUEUE_A);

    const resultA = await eventBus.synchronouslyConsumeByStrictlySingleHandler(taskA.instance, {
      routingMetadata: { queueName: QUEUE_A, name: JOB_NAME },
    });

    expect(resultA.isSuccess()).toBe(true);
    expect(queueAHandleSpy).toHaveBeenCalledWith(taskA.instance);
    expect(queueBHandleSpy).not.toHaveBeenCalledWith(taskA.instance);

    const taskB = createFanoutTask<TestPayload>(JOB_NAME, { data: 'test-payload' }, { attempts: 1 });
    taskB.instance._setAssignedQueueName(QUEUE_B);
    const resultB = await eventBus.synchronouslyConsumeByStrictlySingleHandler(taskB.instance, {
      routingMetadata: { queueName: QUEUE_B, name: JOB_NAME },
    });

    expect(resultB.isSuccess()).toBe(true);
    expect(queueBHandleSpy).toHaveBeenCalledWith(taskB.instance);
    expect(queueAHandleSpy).not.toHaveBeenCalledWith(taskB.instance);
  });

  it('should fail to find handler when routing metadata does not match any registered handler', async () => {
    handlerRegister.addHandler(
      HandlesBullMq(testFanoutTask.class, { queueName: QUEUE_A, name: JOB_NAME }),
      new QueueAHandler(),
    );

    const task = createFanoutTask<TestPayload>(JOB_NAME, { data: 'test-payload' }, { attempts: 1 });

    // Call event bus with routing metadata for unregistered queue
    const result = await eventBus.synchronouslyConsumeByStrictlySingleHandler(task.instance, {
      routingMetadata: { queueName: 'unregistered-queue', name: JOB_NAME },
    });

    expect(result.isError()).toBe(true);
    expect(result.getValueOrThrow).toThrow();
  });

  it('should fail when multiple handlers are registered for the same routing metadata', async () => {
    const metadata = { queueName: QUEUE_A, name: JOB_NAME };

    handlerRegister.addHandler(HandlesBullMq(testFanoutTask.class, metadata), new QueueAHandler());
    handlerRegister.addHandler(HandlesBullMq(testFanoutTask.class, metadata), new QueueBHandler());

    const task = createFanoutTask<TestPayload>(JOB_NAME, { data: 'test-payload' }, { attempts: 1 });

    const result = await eventBus.synchronouslyConsumeByStrictlySingleHandler(task.instance, {
      routingMetadata: metadata,
    });

    expect(result.isError()).toBe(true);
    expect(result.getValueOrThrow).toThrow();
  });
});
