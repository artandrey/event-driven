import {
  AtomicBullMqEventPublisher,
  FanoutRouter,
  FlowRegisterService,
  QueueRegisterService,
} from 'packages/bullmq/lib';

import { createFlowProducerMock } from '../../__fixtures__/create-flow-prducer-mock';
import { createQueueMock } from '../../__fixtures__/create-queue-mock';
import { createFanoutTask, createFlowTask, createTask } from '../../__fixtures__/create-task';
import { randomBullMqJobOptions } from '../../__fixtures__/random-bull-mq-options';

describe('AtomicBullMqEventPublisher', () => {
  const queueRegisterService = vi.mockObject(new QueueRegisterService());
  const flowRegisterService = vi.mockObject(new FlowRegisterService());
  const fanoutRouter = vi.mockObject(FanoutRouter.create());

  afterEach(() => {
    vi.clearAllMocks();
  });

  const eventPublisher = new AtomicBullMqEventPublisher(queueRegisterService, flowRegisterService, fanoutRouter);

  describe('bulk publishing', () => {
    it('should bulk publish queue events', () => {
      const queue1Mock = createQueueMock();
      const queue2Mock = createQueueMock();

      const jobOptions = randomBullMqJobOptions();

      const {
        instance: testEvent1,
        queueName: testEvent1QueueName,
        toQueueAddOptions: testEvent1ToQueueAddOptions,
      } = createTask('test-event-1', { test: 'test' }, 'queue-1', jobOptions);

      const {
        instance: testEvent2,
        queueName: testEvent2QueueName,
        toQueueAddOptions: testEvent2ToQueueAddOptions,
      } = createTask('test-event-2', { test: 'test' }, 'queue-2', jobOptions);

      queueRegisterService.get.mockImplementation((queueName) => {
        if (queueName === testEvent1QueueName) {
          return queue1Mock;
        } else if (queueName === testEvent2QueueName) {
          return queue2Mock;
        }
      });

      eventPublisher.publishAll([testEvent1, testEvent2]);

      expect(queue1Mock.add).toHaveBeenCalledWith(...testEvent1ToQueueAddOptions());
      expect(queue2Mock.add).toHaveBeenCalledWith(...testEvent2ToQueueAddOptions());
    });

    it('should bulk publish unnamed flow events', () => {
      const flowProducer = createFlowProducerMock();
      const jobOptions = randomBullMqJobOptions();

      const { instance: testEvent1, toFlowAddOptions: testEvent1ToFlowAddOptions } = createFlowTask(
        'test-flow-event-1',
        { test: 'test1' },
        'queue-1',
        jobOptions,
        [],
      );

      const { instance: testEvent2, toFlowAddOptions: testEvent2ToFlowAddOptions } = createFlowTask(
        'test-flow-event-2',
        { test: 'test2' },
        'queue-2',
        jobOptions,
        [],
      );

      flowRegisterService.getDefault.mockReturnValue(flowProducer);

      eventPublisher.publishAll([testEvent1, testEvent2]);

      expect(flowProducer.add).toHaveBeenCalledWith(testEvent1ToFlowAddOptions());
      expect(flowProducer.add).toHaveBeenCalledWith(testEvent2ToFlowAddOptions());
    });

    it('should bulk publish named flow events', () => {
      const flowProducer1 = createFlowProducerMock();
      const flowProducer2 = createFlowProducerMock();
      const jobOptions = randomBullMqJobOptions();

      const { instance: testEvent1, toFlowAddOptions: testEvent1ToFlowAddOptions } = createFlowTask(
        'test-flow-event-1',
        { test: 'test1' },
        'queue-1',
        jobOptions,
        [],
        'flow-1',
      );

      const { instance: testEvent2, toFlowAddOptions: testEvent2ToFlowAddOptions } = createFlowTask(
        'test-flow-event-2',
        { test: 'test2' },
        'queue-2',
        jobOptions,
        [],
        'flow-2',
      );

      flowRegisterService.getNamed.mockImplementation((flowName) => {
        if (flowName === 'flow-1') {
          return flowProducer1;
        } else if (flowName === 'flow-2') {
          return flowProducer2;
        }
      });

      eventPublisher.publishAll([testEvent1, testEvent2]);

      expect(flowRegisterService.getNamed).toHaveBeenCalledWith('flow-1');
      expect(flowRegisterService.getNamed).toHaveBeenCalledWith('flow-2');
      expect(flowProducer1.add).toHaveBeenCalledWith(testEvent1ToFlowAddOptions());
      expect(flowProducer2.add).toHaveBeenCalledWith(testEvent2ToFlowAddOptions());
    });
  });

  describe('fanout publishing', () => {
    it('should publish fanout event', () => {
      const queue1Mock = createQueueMock();
      const queue2Mock = createQueueMock();
      const queue3Mock = createQueueMock();
      const jobOptions = randomBullMqJobOptions();

      const {
        instance: testEvent,
        class: TestEventClass,
        toFanoutAddOptions,
      } = createFanoutTask('test-fanout-event', { test: 'fanout-test' }, jobOptions);

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

    it('should bulk publish fanout events', () => {
      const queue1Mock = createQueueMock();
      const queue2Mock = createQueueMock();
      const queue3Mock = createQueueMock();
      const jobOptions = randomBullMqJobOptions();

      const {
        instance: testEvent1,
        class: TestEventClass1,
        toFanoutAddOptions: toFanoutAddOptions1,
      } = createFanoutTask('test-fanout-event-1', { test: 'fanout-test-1' }, jobOptions);

      const {
        instance: testEvent2,
        class: TestEventClass2,
        toFanoutAddOptions: toFanoutAddOptions2,
      } = createFanoutTask('test-fanout-event-2', { test: 'fanout-test-2' }, jobOptions);

      const [name1, payload1, options1] = toFanoutAddOptions1();
      const [name2, payload2, options2] = toFanoutAddOptions2();

      fanoutRouter.getRoute.mockImplementation((eventClass) => {
        if (eventClass === TestEventClass1) {
          return { queues: [{ name: 'queue-1' }, { name: 'queue-2' }] };
        } else if (eventClass === TestEventClass2) {
          return { queues: [{ name: 'queue-2' }, { name: 'queue-3' }] };
        }
        return null;
      });

      queueRegisterService.get.mockImplementation((queueName) => {
        if (queueName === 'queue-1') return queue1Mock;
        if (queueName === 'queue-2') return queue2Mock;
        if (queueName === 'queue-3') return queue3Mock;
        throw new Error(`Unexpected queue name: ${queueName}`);
      });

      eventPublisher.publishAll([testEvent1, testEvent2]);

      expect(queue1Mock.add).toHaveBeenCalledWith(name1, payload1, options1);
      expect(queue2Mock.add).toHaveBeenCalledWith(name1, payload1, options1);

      expect(queue2Mock.add).toHaveBeenCalledWith(name2, payload2, options2);
      expect(queue3Mock.add).toHaveBeenCalledWith(name2, payload2, options2);

      expect(queue1Mock.add).toHaveBeenCalledTimes(1);
      expect(queue2Mock.add).toHaveBeenCalledTimes(2);
      expect(queue3Mock.add).toHaveBeenCalledTimes(1);
    });

    it('should publish fanout event with rewrite job options strategy', () => {
      const queue1Mock = createQueueMock();
      const queue2Mock = createQueueMock();
      const eventJobOptions = { attempts: 3, delay: 1000 };
      const queue1CustomOptions = { attempts: 5, priority: 10 };
      const queue2CustomOptions = { attempts: 2, backoff: { type: 'fixed', delay: 5000 } };

      const { instance: testEvent, class: TestEventClass } = createFanoutTask(
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

      const { instance: testEvent, class: TestEventClass } = createFanoutTask(
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
