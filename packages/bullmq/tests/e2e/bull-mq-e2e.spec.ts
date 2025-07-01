import {
  BaseEventBus,
  BaseHandlerRegister,
  EventBus,
  EventHandler,
  HandlerRegister,
} from '@event-driven-architecture/core';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { ConnectionOptions, Queue } from 'bullmq';
import {
  AtomicBullMqEventPublisher,
  BulkBullMqEventPublisher,
  BullMqEvent,
  BullMqEventConsumerService,
  EventsRegisterService,
  FanoutRouter,
  FlowRegisterService,
  QueueRegisterService,
  WorkerRegisterService,
  WorkerService,
} from 'packages/bullmq/lib';
import { HandlesBullMq } from 'packages/bullmq/lib/util';

describe.each([
  {
    publisher: AtomicBullMqEventPublisher,
  },
  {
    publisher: BulkBullMqEventPublisher,
  },
])('BullMQ E2E', ({ publisher }) => {
  let redisContainer: StartedRedisContainer;
  let connectionUrl: string;

  let workerRegisterService: WorkerRegisterService;
  let queueRegisterService: QueueRegisterService;
  let eventsRegisterService: EventsRegisterService;
  let flowRegisterService: FlowRegisterService;
  let eventBus: EventBus;
  let handlerRegister: HandlerRegister;
  let eventConsumer: BullMqEventConsumerService;
  let fanoutRouter: FanoutRouter;
  const QUEUE_NAME = 'queue';
  const JOB_NAME = 'job';

  beforeEach(async () => {
    redisContainer = await new RedisContainer('redis:7.2').start();

    connectionUrl = redisContainer.getConnectionUrl();
    workerRegisterService = new WorkerRegisterService();
    queueRegisterService = new QueueRegisterService();
    eventsRegisterService = new EventsRegisterService();
    flowRegisterService = new FlowRegisterService();
    handlerRegister = new BaseHandlerRegister();
    eventBus = new BaseEventBus(handlerRegister);
    fanoutRouter = new FanoutRouter();

    const CONNECTION: ConnectionOptions = {
      url: connectionUrl,
    };

    queueRegisterService.add(new Queue(QUEUE_NAME, { connection: CONNECTION }));

    eventConsumer = new BullMqEventConsumerService(
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
      handlerRegister,
    );
  }, 60000);

  afterEach(async () => {
    await Promise.all(workerRegisterService.getAll().map((w) => w.close()));
    await Promise.all(queueRegisterService.getAll().map((q) => q.close()));

    if (redisContainer) {
      await redisContainer.stop();
    }
  });

  it('should publish and consume event', async () => {
    const handlerSpy = vi.fn();

    class TestEvent extends BullMqEvent {
      constructor(payload: object) {
        super({
          name: JOB_NAME,
          queueName: QUEUE_NAME,
          payload,
        });
      }
    }

    class TestHandler implements EventHandler<TestEvent> {
      handle(event: TestEvent) {
        handlerSpy(event);
      }
    }

    handlerRegister.addHandler(HandlesBullMq(TestEvent), new TestHandler());
    eventConsumer.init();

    const eventPublisher = new publisher(queueRegisterService, flowRegisterService, fanoutRouter);
    // later replace with BaseEventBus<BullMqEvent>
    (eventBus as any).publisher = eventPublisher;

    eventBus.publish(new TestEvent({ test: 'test' }));

    await vi.waitFor(
      () => {
        expect(handlerSpy).toHaveBeenCalledTimes(1);
        expect(handlerSpy.mock.calls[0][0]).toBeInstanceOf(TestEvent);
        expect(handlerSpy.mock.calls[0][0].payload).toEqual({ test: 'test' });
      },
      { timeout: 10000 },
    );
  });
});
