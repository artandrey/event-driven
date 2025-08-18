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

import { generateJobName, generateQueueName } from '../__fixtures__/generate-literals';
import { generatePayload } from '../__fixtures__/generate-pyaload';
import { withRedisContainer } from '../__fixtures__/redis-fixture';

describe.each([
  {
    publisher: BulkBullMqEventPublisher,
    flowName: generateJobName(1),
  },
  {
    publisher: BulkBullMqEventPublisher,
    flowName: null,
  },
  {
    publisher: AtomicBullMqEventPublisher,
    flowName: generateJobName(1),
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

    queueRegisterService.add(new Queue(generateQueueName(1), { connection: CONNECTION }));
    queueRegisterService.add(new Queue(generateQueueName(2), { connection: CONNECTION }));

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
          queueName: generateQueueName(1),
          workerOptions: {
            connection: CONNECTION,
          },
        },
        {
          queueName: generateQueueName(2),
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
      mainPayload: generatePayload(1),
      subPayload: generatePayload(2),
      mainPayloadExpected: generatePayload(1),
      subPayloadExpected: generatePayload(2),
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
          super({ queueName: generateQueueName(2), name: generateJobName(1), jobOptions: { attempts: 3 }, payload });
        }
      }

      class TestFlowEvent extends BullMqFlowTask {
        constructor(mainPayload: object, subPayload: object) {
          super({
            queueName: generateQueueName(1),
            name: generateJobName(2),
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
          expect.objectContaining({ _name: generateJobName(1), _payload: subPayloadExpected }),
          expect.objectContaining({ _name: generateJobName(2), _payload: mainPayloadExpected }),
        ]),
      );

      const subCall = calls.find((c) => c[0] instanceof TestSubEvent);
      const mainCall = calls.find((c) => c[0] instanceof TestFlowEvent);

      expect(subCall?.[1].context).toMatchObject({ queue: { name: generateQueueName(2) } });
      expect(mainCall?.[1].context).toMatchObject({ queue: { name: generateQueueName(1) } });
    },
  );

  it.each([
    {
      mainPayload: generatePayload(1),
      subPayload: generatePayload(2),
      mainPayloadExpected: generatePayload(1),
      subPayloadExpected: generatePayload(2),
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
            queueName: generateQueueName(2),
            name: generateJobName(1),
            jobOptions: { attempts: 3 },
            payload,
            flowName: flowName ?? undefined,
          });
        }
      }

      class TestMainFlowEvent extends BullMqFlowTask {
        constructor(mainPayload: object, subPayload: object) {
          super({
            queueName: generateQueueName(1),
            name: generateJobName(2),
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
        queue: { name: generateQueueName(2) },
      });

      expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[1][0]).toBeInstanceOf(TestMainFlowEvent);
      expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[1][0].payload).toEqual(
        mainPayloadExpected,
      );
      expect(eventBus.synchronouslyConsumeByStrictlySingleHandler.mock.calls[1][1].context).toMatchObject({
        queue: { name: generateQueueName(1) },
      });
    },
  );
});
