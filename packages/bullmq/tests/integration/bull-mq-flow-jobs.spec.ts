import { BaseHandlerRegister } from '@event-driven-architecture/core';
import { HandlingResult } from '@event-driven-architecture/core';
import { ConnectionOptions, FlowProducer, Queue } from 'bullmq';
import {
  AtomicBullMqEventPublisher,
  BulkBullMqEventPublisher,
  BullMqFlowTask,
  BullMqTask,
  EventsRegisterService,
  FlowRegisterService,
  QueueRegisterService,
  WorkerRegisterService,
  WorkerService,
} from 'packages/bullmq/lib';
import { BullMqEventConsumerService } from 'packages/bullmq/lib/services/event-consumer/bull-mq-event-consumer.service';
import { FanoutRouter } from 'packages/bullmq/lib/services/fanout-router/fanout-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { withRedisContainer } from '../__fixtures__/redis-fixture';

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

  const QUEUE_1_NAME = 'main-queue';
  const QUEUE_2_NAME = 'sub-queue';

  // Dedicated Redis instance per test.
  const getConnectionOptions = withRedisContainer();

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

    queueRegisterService.add(new Queue(QUEUE_1_NAME, { connection: CONNECTION }));
    queueRegisterService.add(new Queue(QUEUE_2_NAME, { connection: CONNECTION }));

    if (flowName) {
      flowRegisterService.addNamed(flowName, new FlowProducer({ connection: CONNECTION }));
    } else {
      flowRegisterService.setDefault(new FlowProducer({ connection: CONNECTION }));
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
      new BaseHandlerRegister(),
    );

    eventConsumer.init();
    vi.resetAllMocks();
  }, 60000);

  beforeEach(() => {
    eventBus.synchronouslyConsumeByStrictlySingleHandler.mockResolvedValue(HandlingResult.success(undefined));
  });

  afterEach(async () => {
    await Promise.all(workerRegisterService.getAll().map((w) => w.close()));
    await Promise.all(queueRegisterService.getAll().map((q) => q.close()));
    if (flowName) {
      await flowRegisterService.getNamed(flowName).close();
    } else {
      await flowRegisterService.getDefault().close();
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
      class TestSubEvent extends BullMqTask {
        constructor(payload: object) {
          super({ queueName: QUEUE_2_NAME, name: 'test-sub-event', jobOptions: { attempts: 3 }, payload });
        }
      }

      class TestFlowEvent extends BullMqFlowTask {
        constructor(mainPayload: object, subPayload: object) {
          super({
            queueName: QUEUE_1_NAME,
            name: 'test-flow-event',
            jobOptions: { attempts: 3 },
            payload: mainPayload,
            children: [new TestSubEvent(subPayload)],
            flowName: flowName ?? undefined,
          });
        }
      }

      eventsRegisterService.register(TestFlowEvent);
      eventsRegisterService.register(TestSubEvent);

      const eventPublisher = new publisher(queueRegisterService, flowRegisterService, fanoutRouter);

      eventPublisher.publish(new TestFlowEvent(mainPayload, subPayload));
      await vi.waitFor(() => expect(eventBus.synchronouslyConsumeByStrictlySingleHandler).toHaveBeenCalledTimes(2), {
        timeout: 10000,
      });

      const calls = eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls;

      expect(calls.map((c) => c[0])).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ _name: 'test-sub-event', _payload: subPayloadExpected }),
          expect.objectContaining({ _name: 'test-flow-event', _payload: mainPayloadExpected }),
        ]),
      );

      const subCall = calls.find((c) => c[0] instanceof TestSubEvent);
      const mainCall = calls.find((c) => c[0] instanceof TestFlowEvent);

      expect(subCall?.[1].context).toMatchObject({ queue: { name: QUEUE_2_NAME } });
      expect(mainCall?.[1].context).toMatchObject({ queue: { name: QUEUE_1_NAME } });
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
      class TestSubFlowEvent extends BullMqFlowTask {
        constructor(payload: object) {
          super({
            queueName: QUEUE_2_NAME,
            name: 'test-sub-event',
            jobOptions: { attempts: 3 },
            payload,
            flowName: flowName ?? undefined,
          });
        }
      }

      class TestMainFlowEvent extends BullMqFlowTask {
        constructor(mainPayload: object, subPayload: object) {
          super({
            queueName: QUEUE_1_NAME,
            name: 'test-flow-event',
            jobOptions: { attempts: 3 },
            payload: mainPayload,
            children: [new TestSubFlowEvent(subPayload)],
            flowName: flowName ?? undefined,
          });
        }
      }

      eventsRegisterService.register(TestMainFlowEvent);
      eventsRegisterService.register(TestSubFlowEvent);

      const eventPublisher = new publisher(queueRegisterService, flowRegisterService, fanoutRouter);

      eventPublisher.publish(new TestMainFlowEvent(mainPayload, subPayload));

      await vi.waitFor(() => expect(eventBus.synchronouslyConsumeByStrictlySingleHandler).toHaveBeenCalledTimes(2), {
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
