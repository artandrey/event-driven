import { BaseEventBus, BaseHandlerRegister } from '@event-driven-architecture/core';
import { BullMqFanoutTask } from 'packages/bullmq/lib';
import { HandlesBullMq } from 'packages/bullmq/lib/util';

import { createFanoutTask } from '../__fixtures__/create-task';
import { generateJobName, generateQueueName } from '../__fixtures__/generate-literals';
import { TestPayload, generatePayload } from '../__fixtures__/generate-pyaload';
import { createTaskProcessor } from '../__fixtures__/task-processor';

describe('BullMQ Fanout handler routing', () => {
  let eventBus: BaseEventBus<BullMqFanoutTask>;
  let handlerRegister: BaseHandlerRegister;

  const testFanoutTask = createFanoutTask<TestPayload>(generateJobName(1), generatePayload(1), { attempts: 1 });

  const { processor: QueueAHandler, handleSpy: queueAHandleSpy } = createTaskProcessor<TestPayload, void>();
  const { processor: QueueBHandler, handleSpy: queueBHandleSpy } = createTaskProcessor<TestPayload, void>();

  beforeEach(() => {
    handlerRegister = new BaseHandlerRegister();
    eventBus = new BaseEventBus(handlerRegister);

    vi.resetAllMocks();
  });

  it('should route fanout task to correct handler based on routing metadata', async () => {
    handlerRegister.addHandler(
      HandlesBullMq(testFanoutTask.class, { queueName: generateQueueName(1), name: generateJobName(1) }),
      new QueueAHandler(),
    );
    handlerRegister.addHandler(
      HandlesBullMq(testFanoutTask.class, { queueName: generateQueueName(2), name: generateJobName(1) }),
      new QueueBHandler(),
    );

    const taskA = createFanoutTask<TestPayload>(generateJobName(1), generatePayload(1), { attempts: 1 });
    taskA.instance._setAssignedQueueName(generateQueueName(1));

    const resultA = await eventBus.synchronouslyConsumeByStrictlySingleHandler(taskA.instance, {
      routingMetadata: { queueName: generateQueueName(1), name: generateJobName(1) },
    });

    expect(resultA.isSuccess()).toBe(true);
    expect(queueAHandleSpy).toHaveBeenCalledWith(taskA.instance);
    expect(queueBHandleSpy).not.toHaveBeenCalledWith(taskA.instance);

    const taskB = createFanoutTask<TestPayload>(generateJobName(1), generatePayload(2), { attempts: 1 });
    taskB.instance._setAssignedQueueName(generateQueueName(2));
    const resultB = await eventBus.synchronouslyConsumeByStrictlySingleHandler(taskB.instance, {
      routingMetadata: { queueName: generateQueueName(2), name: generateJobName(1) },
    });

    expect(resultB.isSuccess()).toBe(true);
    expect(queueBHandleSpy).toHaveBeenCalledWith(taskB.instance);
    expect(queueAHandleSpy).not.toHaveBeenCalledWith(taskB.instance);
  });

  it('should fail to find handler when routing metadata does not match any registered handler', async () => {
    handlerRegister.addHandler(
      HandlesBullMq(testFanoutTask.class, { queueName: generateQueueName(1), name: generateJobName(1) }),
      new QueueAHandler(),
    );

    const task = createFanoutTask<TestPayload>(generateJobName(1), generatePayload(1), { attempts: 1 });

    // Call event bus with routing metadata for unregistered queue
    const result = await eventBus.synchronouslyConsumeByStrictlySingleHandler(task.instance, {
      routingMetadata: { queueName: generateQueueName(3), name: generateJobName(1) },
    });

    expect(result.isError()).toBe(true);
    expect(result.getValueOrThrow).toThrow();
  });

  it('should fail when multiple handlers are registered for the same routing metadata', async () => {
    const metadata = { queueName: generateQueueName(1), name: generateJobName(1) };

    handlerRegister.addHandler(HandlesBullMq(testFanoutTask.class, metadata), new QueueAHandler());
    handlerRegister.addHandler(HandlesBullMq(testFanoutTask.class, metadata), new QueueBHandler());

    const task = createFanoutTask<TestPayload>(generateJobName(1), generatePayload(1), { attempts: 1 });

    const result = await eventBus.synchronouslyConsumeByStrictlySingleHandler(task.instance, {
      routingMetadata: metadata,
    });

    expect(result.isError()).toBe(true);
    expect(result.getValueOrThrow).toThrow();
  });
});
