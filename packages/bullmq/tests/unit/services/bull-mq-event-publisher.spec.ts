import {
  AtomicBullMqEventPublisher,
  BaseBullMQEventPublisher,
  BulkBullMqEventPublisher,
  FanoutRouter,
  FlowRegisterService,
  QueueRegisterService,
} from 'packages/bullmq/lib';

import { createFlowProducerMock } from '../../__fixtures__/create-flow-prducer-mock';
import { createQueueMock } from '../../__fixtures__/create-queue-mock';
import { createFanoutTask, createFlowTask, createTask } from '../../__fixtures__/create-task';
import { generateJobName, generateQueueName } from '../../__fixtures__/generate-literals';
import { generatePayload } from '../../__fixtures__/generate-pyaload';
import { randomBullMqJobOptions } from '../../__fixtures__/random-bull-mq-options';

describe.each([
  [
    (
      queueRegisterService: QueueRegisterService,
      flowRegisterService: FlowRegisterService,
      fanoutRouter: FanoutRouter,
    ) => new AtomicBullMqEventPublisher(queueRegisterService, flowRegisterService, fanoutRouter),
    'AtomicBullMqEventPublisher',
  ],
  [
    (
      queueRegisterService: QueueRegisterService,
      flowRegisterService: FlowRegisterService,
      fanoutRouter: FanoutRouter,
    ) => new BulkBullMqEventPublisher(queueRegisterService, flowRegisterService, fanoutRouter),
    'BulkBullMqEventPublisher',
  ],
])('BullMqEventPublisher', (EventPublisher, eventPublisherName) => {
  const queueRegisterService = vi.mockObject(new QueueRegisterService());
  const flowRegisterService = vi.mockObject(new FlowRegisterService());
  const fanoutRouter = vi.mockObject(FanoutRouter.create());

  afterEach(() => {
    vi.clearAllMocks();
  });

  const eventPublisher: BaseBullMQEventPublisher = EventPublisher(
    queueRegisterService,
    flowRegisterService,
    fanoutRouter,
  );

  describe(`${eventPublisherName} single instance publish`, () => {
    it('should publish queue event', () => {
      const jobOptions = randomBullMqJobOptions();

      const { instance: testEvent, toQueueAddOptions: testEventToQueueAddOptions } = createTask(
        generateJobName(1),
        generatePayload(1),
        generateQueueName(1),
        jobOptions,
      );

      const queue = createQueueMock();

      queueRegisterService.get.mockReturnValue(queue);

      eventPublisher.publish(testEvent);

      expect(queue.add).toHaveBeenCalledWith(...testEventToQueueAddOptions());
    });

    it('should publish unnamed flow event', () => {
      const jobOptions = randomBullMqJobOptions();

      const { instance: testEvent, toFlowAddOptions: testEventToFlowAddOptions } = createFlowTask(
        generateJobName(1),
        generatePayload(1),
        generateQueueName(1),
        jobOptions,
        [],
      );

      const flowProducer = createFlowProducerMock();

      flowRegisterService.getDefault.mockReturnValue(flowProducer);

      eventPublisher.publish(testEvent);

      expect(flowProducer.add).toHaveBeenCalledWith(testEventToFlowAddOptions());
    });

    it('should publish named flow event', () => {
      const flowName = 'flow-name';
      const jobOptions = randomBullMqJobOptions();

      const { instance: testEvent, toFlowAddOptions: testEventToFlowAddOptions } = createFlowTask(
        generateJobName(1),
        generatePayload(1),
        generateQueueName(1),
        jobOptions,
        [],
        flowName,
      );

      const flowProducer = createFlowProducerMock();

      flowRegisterService.getNamed.mockReturnValue(flowProducer);

      eventPublisher.publish(testEvent);

      expect(flowRegisterService.getNamed).toHaveBeenCalledWith(flowName);

      expect(flowProducer.add).toHaveBeenCalledWith(testEventToFlowAddOptions());
    });

    it('should publish fanout event', () => {
      const queue1Mock = createQueueMock();
      const queue2Mock = createQueueMock();
      const queue3Mock = createQueueMock();
      const jobOptions = randomBullMqJobOptions();

      const {
        instance: testEvent,
        class: TestEventClass,
        toFanoutAddOptions,
      } = createFanoutTask(generateJobName(1), generatePayload(1), jobOptions);

      const [name, payload, options] = toFanoutAddOptions();

      fanoutRouter.getRoute.mockReturnValue({
        queues: [{ name: generateQueueName(1) }, { name: generateQueueName(2) }, { name: generateQueueName(3) }],
      });

      queueRegisterService.get.mockImplementation((queueName) => {
        if (queueName === generateQueueName(1)) return queue1Mock;
        if (queueName === generateQueueName(2)) return queue2Mock;
        if (queueName === generateQueueName(3)) return queue3Mock;
        throw new Error(`Unexpected queue name: ${queueName}`);
      });

      eventPublisher.publish(testEvent);

      expect(fanoutRouter.getRoute).toHaveBeenCalledWith(TestEventClass);
      expect(queue1Mock.add).toHaveBeenCalledWith(name, payload, options);
      expect(queue2Mock.add).toHaveBeenCalledWith(name, payload, options);
      expect(queue3Mock.add).toHaveBeenCalledWith(name, payload, options);
    });

    it('should publish fanout event with rewrite job options strategy', () => {
      const queue1Mock = createQueueMock();
      const queue2Mock = createQueueMock();
      const eventJobOptions = { attempts: 3, delay: 1000 };
      const queue1CustomOptions = { attempts: 5, priority: 10 };
      const queue2CustomOptions = { attempts: 2, backoff: { type: 'fixed', delay: 5000 } };

      const { instance: testEvent, class: TestEventClass } = createFanoutTask(
        generateJobName(1),
        generatePayload(1),
        eventJobOptions,
      );

      fanoutRouter.getRoute.mockReturnValue({
        queues: [
          { name: generateQueueName(1), jobOptions: queue1CustomOptions, jobOptionsStrategy: 'rewrite' },
          { name: generateQueueName(2), jobOptions: queue2CustomOptions, jobOptionsStrategy: 'rewrite' },
        ],
      });

      queueRegisterService.get.mockImplementation((queueName) => {
        if (queueName === generateQueueName(1)) return queue1Mock;
        if (queueName === generateQueueName(2)) return queue2Mock;
        throw new Error(`Unexpected queue name: ${queueName}`);
      });

      eventPublisher.publish(testEvent);

      expect(fanoutRouter.getRoute).toHaveBeenCalledWith(TestEventClass);
      expect(queue1Mock.add).toHaveBeenCalledWith(testEvent.$name, testEvent._serialize(), queue1CustomOptions);
      expect(queue2Mock.add).toHaveBeenCalledWith(testEvent.$name, testEvent._serialize(), queue2CustomOptions);
    });

    it('should publish fanout event with override job options strategy', () => {
      const queue1Mock = createQueueMock();
      const queue2Mock = createQueueMock();
      const eventJobOptions = { attempts: 3, delay: 1000, priority: 1 };
      const queue1CustomOptions = { attempts: 5, priority: 10 };
      const queue2CustomOptions = { delay: 5000, backoff: { type: 'fixed', delay: 2000 } };

      const { instance: testEvent, class: TestEventClass } = createFanoutTask(
        generateJobName(1),
        generatePayload(1),
        eventJobOptions,
      );

      fanoutRouter.getRoute.mockReturnValue({
        queues: [
          { name: generateQueueName(1), jobOptions: queue1CustomOptions, jobOptionsStrategy: 'override' },
          { name: generateQueueName(2), jobOptions: queue2CustomOptions, jobOptionsStrategy: 'override' },
        ],
      });

      queueRegisterService.get.mockImplementation((queueName) => {
        if (queueName === generateQueueName(1)) return queue1Mock;
        if (queueName === generateQueueName(2)) return queue2Mock;
        throw new Error(`Unexpected queue name: ${queueName}`);
      });

      eventPublisher.publish(testEvent);

      expect(fanoutRouter.getRoute).toHaveBeenCalledWith(TestEventClass);
      expect(queue1Mock.add).toHaveBeenCalledWith(testEvent.$name, testEvent._serialize(), {
        attempts: 5, // overridden
        delay: 1000, // from event
        priority: 10, // overridden
      });
      expect(queue2Mock.add).toHaveBeenCalledWith(testEvent.$name, testEvent._serialize(), {
        attempts: 3, // from event
        delay: 5000, // overridden
        priority: 1, // from event
        backoff: { type: 'fixed', delay: 2000 }, // overridden
      });
    });
  });
});
