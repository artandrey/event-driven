import {
  AtomicBullMqEventPublisher,
  BaseBullMQEventPublisher,
  BulkBullMqEventPublisher,
  FanoutRouter,
  FlowRegisterService,
  QueueRegisterService,
} from 'packages/bullmq/lib';

import { createFanoutEvent, createFlowEvent, createJobEvent } from '../../__fixtures__/create-event';
import { createFlowProducerMock } from '../../__fixtures__/create-flow-prducer-mock';
import { createQueueMock } from '../../__fixtures__/create-queue-mock';
import { randomBullMqOptions } from '../../__fixtures__/random-bull-mq-options';

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
      const jobOptions = randomBullMqOptions();

      const { instance: testEvent, toQueueAddOptions: testEventToQueueAddOptions } = createJobEvent(
        'test-event',
        { test: 'test' },
        'queue-1',
        jobOptions,
      );

      const queue = createQueueMock();

      queueRegisterService.get.mockReturnValue(queue);

      eventPublisher.publish(testEvent);

      expect(queue.add).toHaveBeenCalledWith(...testEventToQueueAddOptions());
    });

    it('should publish unnamed flow event', () => {
      const jobOptions = randomBullMqOptions();

      const { instance: testEvent, toFlowAddOptions: testEventToFlowAddOptions } = createFlowEvent(
        'test-event',
        { test: 'test' },
        'queue-1',
        jobOptions,
        [],
      );

      const flowProducer = createFlowProducerMock();

      flowRegisterService.getDefault.mockReturnValue(flowProducer);

      eventPublisher.publish(testEvent);

      expect(flowProducer.add).toHaveBeenCalledWith(testEventToFlowAddOptions());
    });

    it('should publish named flow event', () => {
      const jobOptions = randomBullMqOptions();

      const { instance: testEvent, toFlowAddOptions: testEventToFlowAddOptions } = createFlowEvent(
        'test-event',
        { test: 'test' },
        'queue-1',
        jobOptions,
        [],
        'flow-1',
      );

      const flowProducer = createFlowProducerMock();

      flowRegisterService.getNamed.mockReturnValue(flowProducer);

      eventPublisher.publish(testEvent);

      expect(flowRegisterService.getNamed).toHaveBeenCalledWith('flow-1');

      expect(flowProducer.add).toHaveBeenCalledWith(testEventToFlowAddOptions());
    });

    it('should publish fanout event', () => {
      const queue1Mock = createQueueMock();
      const queue2Mock = createQueueMock();
      const queue3Mock = createQueueMock();
      const jobOptions = randomBullMqOptions();

      const {
        instance: testEvent,
        class: TestEventClass,
        toFanoutAddOptions,
      } = createFanoutEvent('test-fanout-event', { test: 'fanout-test' }, jobOptions);

      const [name, payload, options] = toFanoutAddOptions();

      fanoutRouter.getRoute.mockReturnValue({
        queues: [{ name: 'queue-1' }, { name: 'queue-2' }, { name: 'queue-3' }],
      });

      queueRegisterService.get.mockImplementation((queueName) => {
        if (queueName === 'queue-1') return queue1Mock;
        if (queueName === 'queue-2') return queue2Mock;
        if (queueName === 'queue-3') return queue3Mock;
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

      const { instance: testEvent, class: TestEventClass } = createFanoutEvent(
        'test-fanout-event',
        { test: 'fanout-test' },
        eventJobOptions,
      );

      fanoutRouter.getRoute.mockReturnValue({
        queues: [
          { name: 'queue-1', jobOptions: queue1CustomOptions, jobOptionsStrategy: 'rewrite' },
          { name: 'queue-2', jobOptions: queue2CustomOptions, jobOptionsStrategy: 'rewrite' },
        ],
      });

      queueRegisterService.get.mockImplementation((queueName) => {
        if (queueName === 'queue-1') return queue1Mock;
        if (queueName === 'queue-2') return queue2Mock;
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

      const { instance: testEvent, class: TestEventClass } = createFanoutEvent(
        'test-fanout-event',
        { test: 'fanout-test' },
        eventJobOptions,
      );

      fanoutRouter.getRoute.mockReturnValue({
        queues: [
          { name: 'queue-1', jobOptions: queue1CustomOptions, jobOptionsStrategy: 'override' },
          { name: 'queue-2', jobOptions: queue2CustomOptions, jobOptionsStrategy: 'override' },
        ],
      });

      queueRegisterService.get.mockImplementation((queueName) => {
        if (queueName === 'queue-1') return queue1Mock;
        if (queueName === 'queue-2') return queue2Mock;
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
