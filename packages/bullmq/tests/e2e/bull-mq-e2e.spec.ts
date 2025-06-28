import {
  BaseEventBus,
  BaseHandlerRegister,
  EventBus,
  EventHandler,
  HandlerRegister,
} from '@event-driven-architecture/core';
import { RedisContainer } from '@testcontainers/redis';
import { Queue } from 'bullmq';
import {
  AtomicBullMqEventPublisher,
  BulkBullMqEventPublisher,
  BullMqEvent,
  BullMqEventConsumerService,
  EventsRegisterService,
  FlowRegisterService,
  QueueRegisterService,
  WorkerRegisterService,
  WorkerService,
} from 'packages/bullmq/lib';
import { HandlesBullMq } from 'packages/bullmq/lib/util';
import { StartedTestContainer } from 'testcontainers';
import { ConnectionOptions } from 'tls';

describe.each([
  {
    publisher: AtomicBullMqEventPublisher,
  },
  {
    publisher: BulkBullMqEventPublisher,
  },
])('BullMQ E2E', ({ publisher }) => {
  let redisContainer: StartedTestContainer;
  let redisHost: string;
  let redisPort: number;

  let workerRegisterService: WorkerRegisterService;
  let queueRegisterService: QueueRegisterService;
  let eventsRegisterService: EventsRegisterService;
  let flowRegisterService: FlowRegisterService;
  let eventBus: EventBus;
  let handlerRegister: HandlerRegister;
  let eventConsumer: BullMqEventConsumerService;

  const QUEUE_NAME = 'queue';
  const JOB_NAME = 'job';

  beforeEach(async () => {
    redisContainer = await new RedisContainer().start();

    redisHost = redisContainer.getHost();
    redisPort = redisContainer.getFirstMappedPort();
    workerRegisterService = new WorkerRegisterService();
    queueRegisterService = new QueueRegisterService();
    eventsRegisterService = new EventsRegisterService();
    flowRegisterService = new FlowRegisterService();
    handlerRegister = new BaseHandlerRegister();
    eventBus = new BaseEventBus(handlerRegister);

    const CONNECTION: ConnectionOptions = {
      host: redisHost,
      port: redisPort,
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

    const eventPublisher = new publisher(queueRegisterService, flowRegisterService);
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
