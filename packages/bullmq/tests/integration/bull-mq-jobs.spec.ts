import { BaseHandlerRegister } from '@event-driven-architecture/core';
import { HandlingResult } from '@event-driven-architecture/core';
import { ConnectionOptions, Queue } from 'bullmq';
import {
  AtomicBullMqEventPublisher,
  BulkBullMqEventPublisher,
  BullMqTask,
  EventsRegisterService,
  FlowRegisterService,
  QueueRegisterService,
  WorkerRegisterService,
  WorkerService,
} from 'packages/bullmq/lib';
import { BullMqEventConsumerService } from 'packages/bullmq/lib/services/event-consumer/bull-mq-event-consumer.service';
import { FanoutRouter } from 'packages/bullmq/lib/services/fanout-router/fanout-router';
import { afterEach, beforeEach, describe, expect } from 'vitest';

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

  class TestEvent extends BullMqTask<object> {
    constructor(payload: object) {
      super({ queueName: QUEUE_NAME, name: 'test-event', jobOptions: { attempts: 3 }, payload });
    }
  }

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

  it('should publish and consume event', async () => {
    eventsRegisterService.register(TestEvent);

    const eventPublisher = new publisher(queueRegisterService, flowRegisterService, fanoutRouter);

    const payload = {
      test: 'test',
    };

    eventPublisher.publish(new TestEvent(payload));
    await vi.waitFor(() => expect(eventBus.synchronouslyConsumeByStrictlySingleHandler).toHaveBeenCalled(), {
      timeout: 10000,
    });

    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[0][0]).toBeInstanceOf(TestEvent);
    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[0][0]).toMatchObject(new TestEvent(payload));
  });

  it('should publish and consume multiple events', async () => {
    eventsRegisterService.register(TestEvent);

    const eventPublisher = new publisher(queueRegisterService, flowRegisterService, fanoutRouter);

    eventPublisher.publishAll([new TestEvent({ test: 'test1' }), new TestEvent({ test: 'test2' })]);
    await vi.waitFor(() => expect(eventBus.synchronouslyConsumeByStrictlySingleHandler).toHaveBeenCalledTimes(2), {
      timeout: 10000,
    });

    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[0][0]).toBeInstanceOf(TestEvent);
    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[1][0]).toBeInstanceOf(TestEvent);

    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls.map((call) => call[0])).toEqual(
      expect.arrayContaining([expect.objectContaining({ _payload: { test: 'test1' } })]),
    );
    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls.map((call) => call[0])).toEqual(
      expect.arrayContaining([expect.objectContaining({ _payload: { test: 'test2' } })]),
    );
  });

  it('should consume event with context', async () => {
    eventsRegisterService.register(TestEvent);

    const eventPublisher = new publisher(queueRegisterService, flowRegisterService, fanoutRouter);

    eventPublisher.publish(new TestEvent({ test: 'test' }));

    await vi.waitFor(() => expect(eventBus.synchronouslyConsumeByStrictlySingleHandler).toHaveBeenCalled(), {
      timeout: 10000,
    });

    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[0][0]).toBeInstanceOf(TestEvent);
    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[0][0]).toMatchObject(
      new TestEvent({ test: 'test' }),
    );
    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[0][1].context).toBeDefined();
  });
});
