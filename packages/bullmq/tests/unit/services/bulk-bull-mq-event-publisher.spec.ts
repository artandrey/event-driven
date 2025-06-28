import { BulkBullMqEventPublisher, FanoutRouter, FlowRegisterService, QueueRegisterService } from 'packages/bullmq/lib';

import { createFanoutEvent, createFlowEvent, createJobEvent } from '../../__fixtures__/create-event';
import { createFlowProducerMock } from '../../__fixtures__/create-flow-prducer-mock';
import { createQueueMock } from '../../__fixtures__/create-queue-mock';
import { randomBullMqOptions } from '../../__fixtures__/random-bull-mq-options';

describe('BulkBullMqEventPublisher', () => {
  const queueRegisterService = vi.mockObject(new QueueRegisterService());
  const flowRegisterService = vi.mockObject(new FlowRegisterService());
  const fanoutRouter = vi.mockObject(new FanoutRouter());

  afterEach(() => {
    vi.clearAllMocks();
  });

  const eventPublisher = new BulkBullMqEventPublisher(queueRegisterService, flowRegisterService, fanoutRouter);

  describe('bulk publishing', () => {
    it('should bulk publish queue events', () => {
      const queue1Mock = createQueueMock();
      const queue2Mock = createQueueMock();

      const jobOptions = randomBullMqOptions();

      const {
        instance: testEvent1,
        queueName: testEvent1QueueName,
        toQueueAddBulkOptionsItem: testEvent1ToQueueAddBulkOptionsItem,
      } = createJobEvent('test-event-1', { test: 'test' }, 'queue-1', jobOptions);

      const {
        instance: testEvent2,
        queueName: testEvent2QueueName,
        toQueueAddBulkOptionsItem: testEvent2ToQueueAddBulkOptionsItem,
      } = createJobEvent('test-event-2', { test: 'test' }, 'queue-2', jobOptions);

      queueRegisterService.get.mockImplementation((queueName) => {
        if (queueName === testEvent1QueueName) {
          return queue1Mock;
        } else if (queueName === testEvent2QueueName) {
          return queue2Mock;
        }
      });

      eventPublisher.publishAll([testEvent1, testEvent2]);

      expect(queue1Mock.addBulk).toHaveBeenCalledWith([testEvent1ToQueueAddBulkOptionsItem()]);
      expect(queue2Mock.addBulk).toHaveBeenCalledWith([testEvent2ToQueueAddBulkOptionsItem()]);
    });

    it('should bulk publish queue events to same queue', () => {
      const queueMock = createQueueMock();
      const jobOptions = randomBullMqOptions();

      const { instance: testEvent1, toQueueAddBulkOptionsItem: testEvent1ToQueueAddBulkOptionsItem } = createJobEvent(
        'test-event-1',
        { test: 'test1' },
        'queue-1',
        jobOptions,
      );

      const { instance: testEvent2, toQueueAddBulkOptionsItem: testEvent2ToQueueAddBulkOptionsItem } = createJobEvent(
        'test-event-2',
        { test: 'test2' },
        'queue-1',
        jobOptions,
      );

      queueRegisterService.get.mockReturnValue(queueMock);

      eventPublisher.publishAll([testEvent1, testEvent2]);

      expect(queueMock.addBulk).toHaveBeenCalledWith([
        testEvent1ToQueueAddBulkOptionsItem(),
        testEvent2ToQueueAddBulkOptionsItem(),
      ]);
      expect(queueMock.addBulk).toHaveBeenCalledTimes(1);
    });

    it('should bulk publish unnamed flow events', () => {
      const flowProducer = createFlowProducerMock();
      const jobOptions = randomBullMqOptions();

      const { instance: testEvent1, toFlowAddOptions: testEvent1ToFlowAddOptions } = createFlowEvent(
        'test-flow-event-1',
        { test: 'test1' },
        'queue-1',
        jobOptions,
        [],
      );

      const { instance: testEvent2, toFlowAddOptions: testEvent2ToFlowAddOptions } = createFlowEvent(
        'test-flow-event-2',
        { test: 'test2' },
        'queue-2',
        jobOptions,
        [],
      );

      flowRegisterService.getSingleton.mockReturnValue(flowProducer);

      eventPublisher.publishAll([testEvent1, testEvent2]);

      expect(flowProducer.addBulk).toHaveBeenCalledWith([testEvent1ToFlowAddOptions(), testEvent2ToFlowAddOptions()]);
      expect(flowProducer.addBulk).toHaveBeenCalledTimes(1);
    });

    it('should bulk publish named flow events', () => {
      const flowProducer1 = createFlowProducerMock();
      const flowProducer2 = createFlowProducerMock();
      const jobOptions = randomBullMqOptions();

      const { instance: testEvent1, toFlowAddOptions: testEvent1ToFlowAddOptions } = createFlowEvent(
        'test-flow-event-1',
        { test: 'test1' },
        'queue-1',
        jobOptions,
        [],
        'flow-1',
      );

      const { instance: testEvent2, toFlowAddOptions: testEvent2ToFlowAddOptions } = createFlowEvent(
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
      expect(flowProducer1.addBulk).toHaveBeenCalledWith([testEvent1ToFlowAddOptions()]);
      expect(flowProducer2.addBulk).toHaveBeenCalledWith([testEvent2ToFlowAddOptions()]);
    });

    it('should bulk publish named flow events to same flow', () => {
      const flowProducer = createFlowProducerMock();
      const jobOptions = randomBullMqOptions();

      const { instance: testEvent1, toFlowAddOptions: testEvent1ToFlowAddOptions } = createFlowEvent(
        'test-flow-event-1',
        { test: 'test1' },
        'queue-1',
        jobOptions,
        [],
        'flow-1',
      );

      const { instance: testEvent2, toFlowAddOptions: testEvent2ToFlowAddOptions } = createFlowEvent(
        'test-flow-event-2',
        { test: 'test2' },
        'queue-2',
        jobOptions,
        [],
        'flow-1',
      );

      flowRegisterService.getNamed.mockReturnValue(flowProducer);

      eventPublisher.publishAll([testEvent1, testEvent2]);

      expect(flowRegisterService.getNamed).toHaveBeenCalledWith('flow-1');
      expect(flowProducer.addBulk).toHaveBeenCalledWith([testEvent1ToFlowAddOptions(), testEvent2ToFlowAddOptions()]);
      expect(flowProducer.addBulk).toHaveBeenCalledTimes(1);
    });

    it('should bulk publish fanout events', () => {
      const queue1Mock = createQueueMock();
      const queue2Mock = createQueueMock();
      const queue3Mock = createQueueMock();
      const jobOptions = randomBullMqOptions();

      const {
        instance: testEvent1,
        class: TestEventClass1,
        name: name1,
        payload: payload1,
        jobOptions: options1,
      } = createFanoutEvent('test-fanout-event-1', { test: 'fanout-test-1' }, jobOptions);

      const {
        instance: testEvent2,
        class: TestEventClass2,
        name: name2,
        payload: payload2,
        jobOptions: options2,
      } = createFanoutEvent('test-fanout-event-2', { test: 'fanout-test-2' }, jobOptions);

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

      expect(queue1Mock.addBulk).toHaveBeenCalledWith([{ name: name1, data: payload1, opts: options1 }]);
      expect(queue2Mock.addBulk).toHaveBeenCalledWith([
        { name: name1, data: payload1, opts: options1 },
        { name: name2, data: payload2, opts: options2 },
      ]);
      expect(queue3Mock.addBulk).toHaveBeenCalledWith([{ name: name2, data: payload2, opts: options2 }]);
    });

    it('should bulk publish mixed event types', () => {
      const queue1Mock = createQueueMock();
      const queue2Mock = createQueueMock();
      const flowProducer = createFlowProducerMock();
      const jobOptions = randomBullMqOptions();

      const { instance: queueEvent, toQueueAddBulkOptionsItem: queueEventToQueueAddBulkOptionsItem } = createJobEvent(
        'queue-event',
        { test: 'queue' },
        'queue-1',
        jobOptions,
      );

      const { instance: flowEvent, toFlowAddOptions: flowEventToFlowAddOptions } = createFlowEvent(
        'flow-event',
        { test: 'flow' },
        'queue-1',
        jobOptions,
        [],
      );

      const {
        instance: fanoutEvent,
        class: FanoutEventClass,
        name: fanoutName,
        payload: fanoutPayload,
        jobOptions: fanoutOptions,
      } = createFanoutEvent('fanout-event', { test: 'fanout' }, jobOptions);

      fanoutRouter.getRoute.mockImplementation((eventClass) => {
        if (eventClass === FanoutEventClass) {
          return { queues: [{ name: 'queue-1' }, { name: 'queue-2' }] };
        }
        return null;
      });

      queueRegisterService.get.mockImplementation((queueName) => {
        if (queueName === 'queue-1') return queue1Mock;
        if (queueName === 'queue-2') return queue2Mock;
        throw new Error(`Unexpected queue name: ${queueName}`);
      });

      flowRegisterService.getSingleton.mockReturnValue(flowProducer);

      eventPublisher.publishAll([queueEvent, flowEvent, fanoutEvent]);

      expect(queue1Mock.addBulk).toHaveBeenCalledWith([
        queueEventToQueueAddBulkOptionsItem(),
        { name: fanoutName, data: fanoutPayload, opts: fanoutOptions },
      ]);
      expect(queue2Mock.addBulk).toHaveBeenCalledWith([{ name: fanoutName, data: fanoutPayload, opts: fanoutOptions }]);
      expect(flowProducer.addBulk).toHaveBeenCalledWith([flowEventToFlowAddOptions()]);
    });

    it('should bulk publish fanout events with rewrite job options strategy', () => {
      const queue1Mock = createQueueMock();
      const queue2Mock = createQueueMock();
      const eventJobOptions = { attempts: 3, delay: 1000 };
      const queue1CustomOptions = { attempts: 5, priority: 10 };
      const queue2CustomOptions = { attempts: 2, backoff: { type: 'fixed', delay: 5000 } };

      const {
        instance: testEvent,
        class: TestEventClass,
        name,
        payload,
      } = createFanoutEvent('test-fanout-event', { test: 'fanout-test' }, eventJobOptions);

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

      eventPublisher.publishAll([testEvent]);

      expect(fanoutRouter.getRoute).toHaveBeenCalledWith(TestEventClass);
      expect(queue1Mock.addBulk).toHaveBeenCalledWith([{ name, data: payload, opts: queue1CustomOptions }]);
      expect(queue2Mock.addBulk).toHaveBeenCalledWith([{ name, data: payload, opts: queue2CustomOptions }]);
    });

    it('should bulk publish fanout events with override job options strategy', () => {
      const queue1Mock = createQueueMock();
      const queue2Mock = createQueueMock();
      const eventJobOptions = { attempts: 3, delay: 1000, priority: 1 };
      const queue1CustomOptions = { attempts: 5, priority: 10 };
      const queue2CustomOptions = { delay: 5000, backoff: { type: 'fixed', delay: 2000 } };

      const {
        instance: testEvent,
        class: TestEventClass,
        name,
        payload,
      } = createFanoutEvent('test-fanout-event', { test: 'fanout-test' }, eventJobOptions);

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

      eventPublisher.publishAll([testEvent]);

      expect(fanoutRouter.getRoute).toHaveBeenCalledWith(TestEventClass);
      expect(queue1Mock.addBulk).toHaveBeenCalledWith([
        {
          name,
          data: payload,
          opts: {
            attempts: 5, // overridden
            delay: 1000, // from event
            priority: 10, // overridden
          },
        },
      ]);
      expect(queue2Mock.addBulk).toHaveBeenCalledWith([
        {
          name,
          data: payload,
          opts: {
            attempts: 3, // from event
            delay: 5000, // overridden
            priority: 1, // from event
            backoff: { type: 'fixed', delay: 2000 }, // overridden
          },
        },
      ]);
    });
  });
});
