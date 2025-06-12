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
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe.each([
  {
    publisher: BulkBullMqEventPublisher,
    flowName: 'flow-1',
  },
  {
    publisher: BulkBullMqEventPublisher,
    flowName: null,
  },
  {
    publisher: AtomicBullMqEventPublisher,
    flowName: 'flow-1',
  },
  {
    publisher: AtomicBullMqEventPublisher,
    flowName: null,
  },
])('BullMQ Flow Jobs processing', ({ publisher, flowName }) => {
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

  const QUEUE_1_NAME = 'main-queue';
  const QUEUE_2_NAME = 'sub-queue';

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

    queueRegisterService.add(new Queue(QUEUE_1_NAME, { connection: CONNECTION }));
    queueRegisterService.add(new Queue(QUEUE_2_NAME, { connection: CONNECTION }));

    if (flowName) {
      flowRegisterService.addNamed(flowName, new FlowProducer({ connection: CONNECTION }));
    } else {
      flowRegisterService.addSingleton(new FlowProducer({ connection: CONNECTION }));
    }

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
  }, 60000);

  afterEach(async () => {
    await Promise.all(workerRegisterService.getAll().map((w) => w.close()));
    await Promise.all(queueRegisterService.getAll().map((q) => q.close()));
    if (flowName) {
      await flowRegisterService.getNamed(flowName).close();
    } else {
      await flowRegisterService.getSingleton().close();
    }
    if (redisContainer) {
      await redisContainer.stop();
    }
  });

  it.each([
    {
      mainPayload: { test: 'test' },
      subPayload: { test: 'sub' },
      mainPayloadExpected: { test: 'test' },
      subPayloadExpected: { test: 'sub' },
    },
    {
      mainPayload: undefined,
      subPayload: undefined,
      mainPayloadExpected: {},
      subPayloadExpected: {},
    },
  ])(
    'should publish and consume flow events with sub events represented as bullmq events',
    async ({ mainPayload, subPayload, mainPayloadExpected, subPayloadExpected }) => {
      class TestSubEvent extends BullMqEvent {
        constructor(payload: object) {
          super(QUEUE_2_NAME, 'test-sub-event', { attempts: 3 }, payload);
        }
      }

      class TestFlowEvent extends BullMqFlowEvent {
        constructor(mainPayload: object, subPayload: object) {
          super(QUEUE_1_NAME, 'test-flow-event', { attempts: 3 }, mainPayload, [new TestSubEvent(subPayload)], {
            flowName: flowName,
          });
        }
      }

      eventsRegisterService.register(TestFlowEvent);
      eventsRegisterService.register(TestSubEvent);

      const eventPublisher = new publisher(queueRegisterService, flowRegisterService);

      eventPublisher.publish(new TestFlowEvent(mainPayload, subPayload));
      await vi.waitFor(() => expect(eventBus.synchronouslyConsumeByStrictlySingleHandler).toHaveBeenCalled(), {
        timeout: 10000,
      });

      expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[0][0]).toBeInstanceOf(TestSubEvent);
      expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[0][0].payload).toEqual(subPayloadExpected);

      expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[1][0]).toBeInstanceOf(TestFlowEvent);

      expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[1][0].payload).toEqual(
        mainPayloadExpected,
      );

      expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[0][1].context).toMatchObject({
        queue: { name: QUEUE_2_NAME },
      });
      expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[1][1].context).toMatchObject({
        queue: { name: QUEUE_1_NAME },
      });
    },
  );

  it.each([
    {
      mainPayload: { test: 'test' },
      subPayload: { test: 'sub' },
      mainPayloadExpected: { test: 'test' },
      subPayloadExpected: { test: 'sub' },
    },
    {
      mainPayload: undefined,
      subPayload: undefined,
      mainPayloadExpected: {},
      subPayloadExpected: {},
    },
  ])(
    'should publish and consume flow events with sub events represented as bullmq flow events',
    async ({ mainPayload, subPayload, mainPayloadExpected, subPayloadExpected }) => {
      class TestSubFlowEvent extends BullMqFlowEvent {
        constructor(payload: object) {
          super(QUEUE_2_NAME, 'test-sub-event', { attempts: 3 }, payload, [], {
            flowName: flowName,
          });
        }
      }

      class TestMainFlowEvent extends BullMqFlowEvent {
        constructor(mainPayload: object, subPayload: object) {
          super(QUEUE_1_NAME, 'test-flow-event', { attempts: 3 }, mainPayload, [new TestSubFlowEvent(subPayload)], {
            flowName: flowName,
          });
        }
      }

      eventsRegisterService.register(TestMainFlowEvent);
      eventsRegisterService.register(TestSubFlowEvent);

      const eventPublisher = new publisher(queueRegisterService, flowRegisterService);

      eventPublisher.publish(new TestMainFlowEvent(mainPayload, subPayload));

      await vi.waitFor(() => expect(eventBus.synchronouslyConsumeByStrictlySingleHandler).toHaveBeenCalled(), {
        timeout: 10000,
      });
      expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[0][0].payload).toEqual(subPayloadExpected);
      expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[0][0]).toBeInstanceOf(TestSubFlowEvent);
      expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[0][1].context).toMatchObject({
        queue: { name: QUEUE_2_NAME },
      });

      expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[1][0]).toBeInstanceOf(TestMainFlowEvent);
      expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[1][0].payload).toEqual(
        mainPayloadExpected,
      );
      expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[1][1].context).toMatchObject({
        queue: { name: QUEUE_1_NAME },
      });
    },
  );
});
