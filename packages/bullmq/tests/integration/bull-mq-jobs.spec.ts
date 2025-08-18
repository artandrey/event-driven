import { BaseHandlerRegister, HandlingResult } from '@event-driven-architecture/core';
import { ConnectionOptions, Queue } from 'bullmq';
import {
  AtomicBullMqEventPublisher,
  BulkBullMqEventPublisher,
  EventsRegisterService,
  FlowRegisterService,
  QueueRegisterService,
  WorkerRegisterService,
  WorkerService,
} from 'packages/bullmq/lib';
import { BullMqEventConsumerService } from 'packages/bullmq/lib/services/event-consumer/bull-mq-event-consumer.service';
import { FanoutRouter } from 'packages/bullmq/lib/services/fanout-router/fanout-router';
import { afterEach, beforeEach, describe, expect } from 'vitest';

import { createTask } from '../__fixtures__/create-task';
import { withRedisContainer } from '../__fixtures__/redis-fixture';

describe.each([
  {
    publisher: BulkBullMqEventPublisher,
  },
  {
    publisher: AtomicBullMqEventPublisher,
  },
])('BullMQ Jobs processing', ({ publisher }) => {
  let workerRegisterService: WorkerRegisterService;
  let queueRegisterService: QueueRegisterService;
  let eventsRegisterService: EventsRegisterService;
  let flowRegisterService: FlowRegisterService;
  let fanoutRouter: FanoutRouter;
  const eventBus = {
    publish: vi.fn(),
    publishAll: vi.fn(),
    synchronouslyConsumeByStrictlySingleHandler: vi.fn(),
    synchronouslyConsumeByMultipleHandlers: vi.fn(),
  };

  const QUEUE_NAME = 'test-queue';

  const getConnectionOptions = withRedisContainer();

  const testTask = createTask('test-task', {}, QUEUE_NAME, { attempts: 3 });

  beforeEach(async () => {
    workerRegisterService = new WorkerRegisterService();
    queueRegisterService = new QueueRegisterService();
    eventsRegisterService = new EventsRegisterService();
    flowRegisterService = new FlowRegisterService();
    fanoutRouter = FanoutRouter.create();
    const CONNECTION: ConnectionOptions = {
      host: getConnectionOptions().host,
      port: getConnectionOptions().port,
    };

    queueRegisterService.add(new Queue(QUEUE_NAME, { connection: CONNECTION }));

    const eventConsumer = new BullMqEventConsumerService(
      workerRegisterService,
      queueRegisterService,
      eventsRegisterService,
      [
        {
          queueName: QUEUE_NAME,
          workerOptions: {
            connection: CONNECTION,
          },
        },
      ],
      new WorkerService(workerRegisterService),
      eventBus,
      new BaseHandlerRegister(),
    );

    eventConsumer.init();
    vi.resetAllMocks();
  }, 60000);

  beforeEach(() => {
    eventBus.synchronouslyConsumeByStrictlySingleHandler.mockResolvedValue(HandlingResult.success(undefined));
  });

  afterEach(async () => {
    await Promise.all(workerRegisterService.getAll().map((worker) => worker.close()));
    await Promise.all(queueRegisterService.getAll().map((queue) => queue.close()));
  });

  it('should publish and consume task', async () => {
    eventsRegisterService.register(testTask.class);

    const eventPublisher = new publisher(queueRegisterService, flowRegisterService, fanoutRouter);

    const payload = {
      test: 'test',
    };
    const taskInstance = createTask('test-task', payload, QUEUE_NAME, { attempts: 3 });

    eventPublisher.publish(taskInstance.instance);
    await vi.waitFor(() => expect(eventBus.synchronouslyConsumeByStrictlySingleHandler).toHaveBeenCalled(), {
      timeout: 10000,
    });

    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[0][0]).toBeInstanceOf(testTask.class);
    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[0][0]).toMatchObject(taskInstance.instance);
  });

  it('should publish and consume multiple tasks', async () => {
    eventsRegisterService.register(testTask.class);

    const eventPublisher = new publisher(queueRegisterService, flowRegisterService, fanoutRouter);

    const task1 = createTask('test-task', { test: 'test1' }, QUEUE_NAME, { attempts: 3 });
    const task2 = createTask('test-task', { test: 'test2' }, QUEUE_NAME, { attempts: 3 });

    eventPublisher.publishAll([task1.instance, task2.instance]);
    await vi.waitFor(() => expect(eventBus.synchronouslyConsumeByStrictlySingleHandler).toHaveBeenCalledTimes(2), {
      timeout: 10000,
    });

    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[0][0]).toBeInstanceOf(testTask.class);
    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[1][0]).toBeInstanceOf(testTask.class);

    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls.map((call) => call[0])).toEqual(
      expect.arrayContaining([expect.objectContaining({ _payload: { test: 'test1' } })]),
    );
    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls.map((call) => call[0])).toEqual(
      expect.arrayContaining([expect.objectContaining({ _payload: { test: 'test2' } })]),
    );
  });

  it('should consume task with context', async () => {
    eventsRegisterService.register(testTask.class);

    const eventPublisher = new publisher(queueRegisterService, flowRegisterService, fanoutRouter);

    const taskInstance = createTask('test-task', { test: 'test' }, QUEUE_NAME, { attempts: 3 });
    eventPublisher.publish(taskInstance.instance);

    await vi.waitFor(() => expect(eventBus.synchronouslyConsumeByStrictlySingleHandler).toHaveBeenCalled(), {
      timeout: 10000,
    });

    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[0][0]).toBeInstanceOf(testTask.class);
    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[0][0]).toMatchObject(taskInstance.instance);
    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[0][1].context).toBeDefined();
  });
});
