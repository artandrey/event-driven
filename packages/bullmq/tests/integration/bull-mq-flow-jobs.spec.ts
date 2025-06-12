import { RedisContainer } from '@testcontainers/redis';
import { ConnectionOptions, FlowProducer, Queue } from 'bullmq';
import {
  AtomicBullMqEventPublisher,
  BulkBullMqEventPublisher,
  BullMqEvent,
  BullMqFlowEvent,
  EventsRegisterService,
  FlowRegisterService,
  QueueRegisterService,
  WorkerRegisterService,
  WorkerService,
} from 'packages/bullmq/lib';
import { BullMqEventConsumerService } from 'packages/bullmq/lib/services/event-consumer/bull-mq-event-consumer.service';
import { StartedTestContainer } from 'testcontainers';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

describe.each([
  {
    publisher: BulkBullMqEventPublisher,
  },
  {
    publisher: AtomicBullMqEventPublisher,
  },
])('BullMQ Flow Jobs processing', ({ publisher }) => {
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

  const QUEUE_1_NAME = 'main-queue';
  const QUEUE_2_NAME = 'sub-queue';

  class TestSubEvent extends BullMqEvent {
    constructor(payload: object) {
      super(QUEUE_2_NAME, 'test-sub-event', { attempts: 3 }, payload);
    }
  }

  class TestFlowEvent extends BullMqFlowEvent {
    constructor(mainPayload: object, subPayload: object) {
      super(QUEUE_1_NAME, 'test-flow-event', { attempts: 3 }, mainPayload, [new TestSubEvent(subPayload)]);
    }
  }

  beforeEach(async () => {
    workerRegisterService = new WorkerRegisterService();
    queueRegisterService = new QueueRegisterService();
    eventsRegisterService = new EventsRegisterService();
    flowRegisterService = new FlowRegisterService();

    const CONNECTION: ConnectionOptions = {
      host: redisHost,
      port: redisPort,
    };

    queueRegisterService.add(new Queue(QUEUE_1_NAME, { connection: CONNECTION }));
    queueRegisterService.add(new Queue(QUEUE_2_NAME, { connection: CONNECTION }));
    flowRegisterService.addSingleton(new FlowProducer({ connection: CONNECTION }));

    const eventConsumer = new BullMqEventConsumerService(
      workerRegisterService,
      queueRegisterService,
      eventsRegisterService,
      [
        {
          queueName: QUEUE_1_NAME,
          workerOptions: {
            connection: CONNECTION,
          },
        },
        {
          queueName: QUEUE_2_NAME,
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
    eventsRegisterService.register(TestFlowEvent);
    eventsRegisterService.register(TestSubEvent);

    const eventPublisher = new publisher(queueRegisterService, flowRegisterService);

    const mainPayload = {
      test: 'test',
    };

    const subPayload = {
      test: 'sub',
    };

    eventPublisher.publish(new TestFlowEvent(mainPayload, subPayload));
    await vi.waitFor(() => expect(eventBus.synchronouslyConsumeByStrictlySingleHandler).toHaveBeenCalled(), {
      timeout: 10000,
    });

    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[0][0]).toBeInstanceOf(TestSubEvent);
    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[0][0]).toMatchObject(
      new TestSubEvent(subPayload),
    );

    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[1][0]).toBeInstanceOf(TestFlowEvent);
    const testFlowEventInstance = new TestFlowEvent(mainPayload, subPayload);
    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[1][0].payload).toEqual(
      testFlowEventInstance.payload,
    );
    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[1][0].$children).not.toBeDefined();

    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[0][1].context).toMatchObject({
      queue: { name: QUEUE_2_NAME },
    });
    expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[1][1].context).toMatchObject({
      queue: { name: QUEUE_1_NAME },
    });
  });
});
