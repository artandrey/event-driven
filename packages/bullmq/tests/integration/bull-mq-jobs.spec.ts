import { BaseHandlerRegister } from '@event-driven-architecture/core';
import { RedisContainer } from '@testcontainers/redis';
import { ConnectionOptions, Queue } from 'bullmq';
import {
  AtomicBullMqEventPublisher,
  BulkBullMqEventPublisher,
  BullMqEvent,
  EventsRegisterService,
  FlowRegisterService,
  QueueRegisterService,
  WorkerRegisterService,
  WorkerService,
} from 'packages/bullmq/lib';
import { BullMqEventConsumerService } from 'packages/bullmq/lib/services/event-consumer/bull-mq-event-consumer.service';
import { StartedTestContainer } from 'testcontainers';
import { afterEach, beforeEach, describe, expect } from 'vitest';

describe.each([
  {
    publisher: BulkBullMqEventPublisher,
  },
  {
    publisher: AtomicBullMqEventPublisher,
  },
])('BullMQ Jobs processing', ({ publisher }) => {
  let redisContainer: StartedTestContainer;
  let redisHost: string;
  let redisPort: number;

  let workerRegisterService: WorkerRegisterService;
  let queueRegisterService: QueueRegisterService;
  let eventsRegisterService: EventsRegisterService;
  let flowRegisterService: FlowRegisterService;

  const eventBus = {
    publish: vi.fn(),
    publishAll: vi.fn(),
    synchronouslyConsumeByStrictlySingleHandler: vi.fn(),
    synchronouslyConsumeByMultipleHandlers: vi.fn(),
  };

  const QUEUE_NAME = 'test-queue';

  class TestEvent extends BullMqEvent<object> {
    constructor(payload: object) {
      super({ queueName: QUEUE_NAME, name: 'test-event', jobOptions: { attempts: 3 }, payload });
    }
  }

  beforeEach(async () => {
    redisContainer = await new RedisContainer().start();

    redisHost = redisContainer.getHost();
    redisPort = redisContainer.getFirstMappedPort();

    workerRegisterService = new WorkerRegisterService();
    queueRegisterService = new QueueRegisterService();
    eventsRegisterService = new EventsRegisterService();
    flowRegisterService = new FlowRegisterService();

    const CONNECTION: ConnectionOptions = {
      host: redisHost,
      port: redisPort,
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

  afterEach(async () => {
    await Promise.all(workerRegisterService.getAll().map((worker) => worker.close()));
    await Promise.all(queueRegisterService.getAll().map((queue) => queue.close()));

    if (redisContainer) {
      await redisContainer.stop();
    }
  });

  it('should publish and consume event', async () => {
    eventsRegisterService.register(TestEvent);

    const eventPublisher = new publisher(queueRegisterService, flowRegisterService);

    const payload = {
      test: 'test',
    };

    eventPublisher.publish(new TestEvent(payload));
    await vi.waitFor(() => expect(eventBus.synchronouslyConsumeByStrictlySingleHandler).toHaveBeenCalled(), {
      timeout: 10000,
    });

    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[0][0]).toBeInstanceOf(TestEvent);
    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[0][0]).toEqual(new TestEvent(payload));
  });

  it('should publish and consume multiple events', async () => {
    eventsRegisterService.register(TestEvent);

    const eventPublisher = new publisher(queueRegisterService, flowRegisterService);

    eventPublisher.publishAll([new TestEvent({ test: 'test1' }), new TestEvent({ test: 'test2' })]);
    await vi.waitFor(() => expect(eventBus.synchronouslyConsumeByStrictlySingleHandler).toHaveBeenCalledTimes(2), {
      timeout: 10000,
    });

    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[0][0]).toBeInstanceOf(TestEvent);
    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[1][0]).toBeInstanceOf(TestEvent);

    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls.map((call) => call[0])).toContainEqual(
      new TestEvent({ test: 'test1' }),
    );
    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls.map((call) => call[0])).toContainEqual(
      new TestEvent({ test: 'test2' }),
    );
  });

  it('should consume event with context', async () => {
    eventsRegisterService.register(TestEvent);

    const eventPublisher = new publisher(queueRegisterService, flowRegisterService);

    eventPublisher.publish(new TestEvent({ test: 'test' }));

    await vi.waitFor(() => expect(eventBus.synchronouslyConsumeByStrictlySingleHandler).toHaveBeenCalled(), {
      timeout: 10000,
    });

    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[0][0]).toBeInstanceOf(TestEvent);
    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[0][0]).toEqual(
      new TestEvent({ test: 'test' }),
    );
    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[0][1].context).toBeDefined();
  });
});
