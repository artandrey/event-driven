import { BaseEventBus, BaseHandlerRegister, EventHandler } from '@event-driven-architecture/core';
import { BullMqFanoutTask } from 'packages/bullmq/lib';
import { HandlesBullMq } from 'packages/bullmq/lib/util';

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

  class QueueAHandler implements EventHandler<TestFanoutTask> {
    handle(task: TestFanoutTask): void {
      // Store result for assertion
      (task as any).handledBy = 'queue-a';
    }
  }

  class QueueBHandler implements EventHandler<TestFanoutTask> {
    handle(task: TestFanoutTask): void {
      // Store result for assertion
      (task as any).handledBy = 'queue-b';
    }
  }

  beforeEach(() => {
    handlerRegister = new BaseHandlerRegister();
    eventBus = new BaseEventBus(handlerRegister);
  });

  it('should route fanout task to correct handler based on routing metadata', async () => {
    // Register handlers with specific routing metadata for different queues
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

    // Call event bus with routing metadata for QUEUE_A
    const resultA = await eventBus.synchronouslyConsumeByStrictlySingleHandler(taskA, {
      routingMetadata: { queueName: QUEUE_A, name: JOB_NAME },
    });

    expect(resultA.isSuccess()).toBe(true);
    expect((taskA as any).handledBy).toBe('queue-a');

    // Call event bus with routing metadata for QUEUE_B
    const taskB = new TestFanoutTask({ data: 'test-payload' });
    taskB._setAssignedQueueName(QUEUE_B);
    const resultB = await eventBus.synchronouslyConsumeByStrictlySingleHandler(taskB, {
      routingMetadata: { queueName: QUEUE_B, name: JOB_NAME },
    });

    expect(resultB.isSuccess()).toBe(true);
    expect((taskB as any).handledBy).toBe('queue-b');
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
