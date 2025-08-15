import { BaseEventBus, BaseHandlerRegister, HandlerRegister, TaskProcessor } from '@event-driven-architecture/core';
import { ConnectionOptions, Queue } from 'bullmq';
import {
  AtomicBullMqEventPublisher,
  BulkBullMqEventPublisher,
  BullMqEventConsumerService,
  BullMqTask,
  EventsRegisterService,
  FanoutRouter,
  FlowRegisterService,
  QueueRegisterService,
  WorkerRegisterService,
  WorkerService,
} from 'packages/bullmq/lib';
import { HandlesBullMq } from 'packages/bullmq/lib/util';

import { withRedisContainer } from '../__fixtures__/redis-fixture';

describe.each([
  {
    publisher: AtomicBullMqEventPublisher,
  },
  {
    publisher: BulkBullMqEventPublisher,
  },
])('BullMQ E2E', ({ publisher }) => {
  let workerRegisterService: WorkerRegisterService;
  let queueRegisterService: QueueRegisterService;
  let eventsRegisterService: EventsRegisterService;
  let flowRegisterService: FlowRegisterService;
  let eventBus: BaseEventBus<BullMqTask>;
  let handlerRegister: HandlerRegister;
  let eventConsumer: BullMqEventConsumerService;
  let fanoutRouter: FanoutRouter;
  const QUEUE_NAME = 'queue';
  const JOB_NAME = 'job';

  // Dedicated Redis instance per test.
  const getConnectionOptions = withRedisContainer();

  beforeEach(async () => {
    workerRegisterService = new WorkerRegisterService();
    queueRegisterService = new QueueRegisterService();
    eventsRegisterService = new EventsRegisterService();
    flowRegisterService = new FlowRegisterService();
    handlerRegister = new BaseHandlerRegister();
    eventBus = new BaseEventBus(handlerRegister);
    fanoutRouter = FanoutRouter.create();

    const CONNECTION: ConnectionOptions = {
      host: getConnectionOptions().host,
      port: getConnectionOptions().port,
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
  });

  it('should publish and process event', async () => {
    const result = 'completion-result';

    class TestEvent extends BullMqTask {
      constructor(payload: object) {
        super({
          name: JOB_NAME,
          queueName: QUEUE_NAME,
          payload,
        });
      }
    }

    class TestHandler implements TaskProcessor<TestEvent> {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      handle(event: TestEvent): any {
        return result;
      }
    }

    const handlerSpy = vi.spyOn(TestHandler.prototype, 'handle').mockReturnValue(result);

    handlerRegister.addHandler(HandlesBullMq(TestEvent), new TestHandler());
    eventConsumer.init();

    const eventPublisher = new publisher(queueRegisterService, flowRegisterService, fanoutRouter);
    eventBus.setPublisher(eventPublisher);

    const jobCompletionSpy = vi.fn();
    workerRegisterService.get(QUEUE_NAME).on('completed', jobCompletionSpy);

    eventBus.publish(new TestEvent({ test: 'test' }));

    await vi.waitFor(
      () => {
        expect(handlerSpy).toHaveBeenCalledTimes(1);
        expect(handlerSpy.mock.calls[0][0]).toBeInstanceOf(TestEvent);
        expect(handlerSpy.mock.calls[0][0].payload).toEqual({ test: 'test' });
        expect(jobCompletionSpy).toHaveBeenCalledTimes(1);
        expect(jobCompletionSpy.mock.calls[0][1]).toEqual(result);
      },
      { timeout: 10000 },
    );
  });
});
