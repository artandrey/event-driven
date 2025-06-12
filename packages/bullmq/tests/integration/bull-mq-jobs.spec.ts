import { RedisContainer } from '@testcontainers/redis';
import { ConnectionOptions, Queue } from 'bullmq';
import {
  AtomicBullMqEventPublisher,
  BulkBullMqEventPublisher,
  BullMqEvent,
  EventsRegisterService,
  QueueRegisterService,
  WorkerRegisterService,
  WorkerService,
} from 'packages/bullmq/lib';
import { BullMqEventConsumerService } from 'packages/bullmq/lib/services/event-consumer/bull-mq-event-consumer.service';
import { StartedTestContainer } from 'testcontainers';
import { afterAll, beforeAll, describe, expect } from 'vitest';

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

  const eventBus = {
    publish: vi.fn(),
    publishAll: vi.fn(),
    synchronouslyConsumeByStrictlySingleHandler: vi.fn(),
    synchronouslyConsumeByMultipleHandlers: vi.fn(),
  };

  const QUEUE_NAME = 'test-queue';

  class TestEvent extends BullMqEvent<object> {
    constructor(payload: object) {
      super(QUEUE_NAME, 'test-event', { attempts: 3 }, payload);
    }
  }

  beforeAll(async () => {
    redisContainer = await new RedisContainer().start();

    redisHost = redisContainer.getHost();
    redisPort = redisContainer.getFirstMappedPort();
  }, 60000);

  afterAll(async () => {
    await Promise.all(queueRegisterService.getAll().map((queue) => queue.close()));
    await Promise.all(workerRegisterService.getAll().map((worker) => worker.close()));

    if (redisContainer) {
      await redisContainer.stop();
    }
  });

  beforeEach(async () => {
    workerRegisterService = new WorkerRegisterService();
    queueRegisterService = new QueueRegisterService();
    eventsRegisterService = new EventsRegisterService();

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
    );

    eventConsumer.init();
    vi.resetAllMocks();
  });

  it('should publish and consume event', async () => {
    eventsRegisterService.register(TestEvent);

    const eventPublisher = new publisher(queueRegisterService);

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

    const eventPublisher = new publisher(queueRegisterService);

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

    const eventPublisher = new publisher(queueRegisterService);

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
