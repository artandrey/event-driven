import { BaseEventBus, BaseHandlerRegister, HandlerRegister } from '@event-driven-architecture/core';
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

import { createTask } from '../__fixtures__/create-task';
import { withRedisContainer } from '../__fixtures__/redis-fixture';
import { createTaskProcessor } from '../__fixtures__/task-processor';

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

  it('should publish and process task', async () => {
    const result = 'completion-result';

    const testTask = createTask(JOB_NAME, { test: 'test' }, QUEUE_NAME, {});

    const { processor: TestTaskProcessor, handleSpy } = createTaskProcessor<object, any>();
    handleSpy.mockResolvedValue(result);

    handlerRegister.addHandler(HandlesBullMq(testTask.class), new TestTaskProcessor());
    eventConsumer.init();

    const eventPublisher = new publisher(queueRegisterService, flowRegisterService, fanoutRouter);
    eventBus.setPublisher(eventPublisher);

    const jobCompletionSpy = vi.fn();
    workerRegisterService.get(QUEUE_NAME).on('completed', jobCompletionSpy);

    eventBus.publish(testTask.instance);

    await vi.waitFor(
      () => {
        expect(handleSpy).toHaveBeenCalledTimes(1);
        expect(handleSpy.mock.calls[0][0]).toBeInstanceOf(testTask.class);
        expect(handleSpy.mock.calls[0][0].payload).toEqual({ test: 'test' });
        expect(jobCompletionSpy).toHaveBeenCalledTimes(1);
        expect(jobCompletionSpy.mock.calls[0][1]).toEqual(result);
      },
      { timeout: 10000 },
    );
  });
});
